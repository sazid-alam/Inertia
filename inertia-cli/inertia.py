#!/usr/bin/env python3
import argparse
import json
import os
import shutil
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

DEFAULT_API_BASE = "https://inertia-production-e090.up.railway.app"
ROOT_CONFIG_DIR = ".inertia"
ROOT_CONFIG_FILE = ".inertia/config"

FALLBACK_HOOK_TEMPLATE = r"""#!/bin/bash
set -u

REPO_ROOT="$(git rev-parse --show-toplevel)"
CONFIG_FILE="$REPO_ROOT/.inertia/config"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "[INERTIA] No .inertia/config found. Push allowed."
    exit 0
fi

# shellcheck source=/dev/null
source "$CONFIG_FILE"

API_BASE="${API_BASE:-https://inertia-production-e090.up.railway.app}"
FRONTEND_URL="${FRONTEND_URL:-https://inertia-tau.vercel.app}"
PROJECT_ID="${PROJECT_ID:-}"
STUDENT_ID="${STUDENT_ID:-$(git config user.email)}"

detect_python() {
    if [ -n "${PYTHON_BIN:-}" ]; then
        if [ "$PYTHON_BIN" = "py -3" ]; then
            if py -3 -c "import sys; sys.exit(0 if sys.version_info.major >= 3 else 1)" >/dev/null 2>&1; then
                return 0
            fi
        else
            if "$PYTHON_BIN" -c "import sys; sys.exit(0 if sys.version_info.major >= 3 else 1)" >/dev/null 2>&1; then
                return 0
            fi
        fi
    fi

    if command -v python3 >/dev/null 2>&1; then
        if python3 -c "import sys; sys.exit(0 if sys.version_info.major >= 3 else 1)" >/dev/null 2>&1; then
            PYTHON_BIN="python3"
            return 0
        fi
    fi

    if command -v python >/dev/null 2>&1; then
        if python -c "import sys; sys.exit(0 if sys.version_info.major >= 3 else 1)" >/dev/null 2>&1; then
            PYTHON_BIN="python"
            return 0
        fi
    fi

    if command -v py >/dev/null 2>&1; then
        if py -3 -c "import sys; sys.exit(0 if sys.version_info.major >= 3 else 1)" >/dev/null 2>&1; then
            PYTHON_BIN="py -3"
            return 0
        fi
    fi

    return 1
}

if ! detect_python; then
    echo "[INERTIA] Warning: Python 3 is required but could not be found."
    echo "[INERTIA] Please install Python 3 or set PYTHON_BIN in your shell profile."
    echo "[INERTIA] Push allowed (offline mode / graceful degradation)."
    exit 0
fi

run_python() {
    if [ "$PYTHON_BIN" = "py -3" ]; then
        py -3 "$@"
    else
        "$PYTHON_BIN" "$@"
    fi
}

if [ -z "$PROJECT_ID" ] || [ -z "$STUDENT_ID" ]; then
    echo "[INERTIA] Missing PROJECT_ID or STUDENT_ID in .inertia/config. Push allowed."
    exit 0
fi

echo "[INERTIA] Analyzing commit..."

EMPTY_TREE=$(git hash-object -t tree /dev/null)
DIFF=""
LAST_PUSHED_SHA=""
READ_REFS=0

while IFS=' ' read -r local_ref local_sha remote_ref remote_sha; do
    [ -z "$local_sha" ] && continue
    READ_REFS=1

    # Deletion push; no new code to analyze
    if [[ "$local_sha" =~ ^0+$ ]]; then
        continue
    fi

    LAST_PUSHED_SHA="$local_sha"

    if [[ "$remote_sha" =~ ^0+$ ]]; then
        RANGE_DIFF=$(git diff "$EMPTY_TREE" "$local_sha")
    else
        RANGE_DIFF=$(git diff "$remote_sha" "$local_sha")
    fi

    if [ -n "$RANGE_DIFF" ]; then
        DIFF+="$RANGE_DIFF"
        DIFF+=$'\n'
    fi
done

# Fallback for environments that don't pass refs to hook stdin
if [ "$READ_REFS" -eq 0 ]; then
    if git rev-parse --verify HEAD^ >/dev/null 2>&1; then
        DIFF=$(git diff HEAD^ HEAD)
    else
        DIFF=$(git diff "$EMPTY_TREE" HEAD 2>/dev/null || true)
    fi
    LAST_PUSHED_SHA=$(git rev-parse HEAD 2>/dev/null || echo "")
fi

if [ -z "$DIFF" ]; then
    echo "[INERTIA] No diff detected. Push allowed."
    exit 0
fi

DIFF_JSON=$(printf '%s' "$DIFF" | run_python -c 'import json,sys; print(json.dumps(sys.stdin.read()))')
COMMIT_HASH=$(printf '%s' "$LAST_PUSHED_SHA" | cut -c1-7)
if [ -n "$LAST_PUSHED_SHA" ]; then
    COMMIT_MSG=$(git log -1 --pretty=%s "$LAST_PUSHED_SHA" 2>/dev/null || echo "")
else
    COMMIT_MSG=$(git log -1 --pretty=%s 2>/dev/null || echo "")
fi
COMMIT_MSG_JSON=$(printf '%s' "$COMMIT_MSG" | run_python -c 'import json,sys; print(json.dumps(sys.stdin.read()))')
COMMIT_HASH_JSON=$(printf '%s' "$COMMIT_HASH" | run_python -c 'import json,sys; print(json.dumps(sys.stdin.read()))')

AUDIT_RESPONSE=$(curl -sf -X POST "$API_BASE/audit" \
    -H "Content-Type: application/json" \
    -d "{\"diff\": $DIFF_JSON, \"student_id\": \"$STUDENT_ID\", \"project_id\": \"$PROJECT_ID\", \"commit_hash\": $COMMIT_HASH_JSON, \"commit_message\": $COMMIT_MSG_JSON}")

if [ $? -ne 0 ] || [ -z "$AUDIT_RESPONSE" ]; then
    echo "[INERTIA] Cannot reach server. Push allowed (offline mode)."
    exit 0
fi

FC_SCORE=$(printf '%s' "$AUDIT_RESPONSE" | run_python -c "import json,sys; print(json.load(sys.stdin).get('complexity_score', 0))")
REQUIRES_PUZZLE=$(printf '%s' "$AUDIT_RESPONSE" | run_python -c "import json,sys; print(json.load(sys.stdin).get('requires_puzzle', False))")

if [ "$REQUIRES_PUZZLE" != "True" ]; then
    echo "[INERTIA] Trivial commit. Push allowed."
    exit 0
fi

DIFFICULTY=$(printf '%s' "$AUDIT_RESPONSE" | run_python -c "import json,sys; print(json.load(sys.stdin).get('difficulty', 'EASY'))")

PUZZLE_RESPONSE=$(curl -sf -X POST "$API_BASE/puzzle" \
    -H "Content-Type: application/json" \
    -d "{\"diff\": $DIFF_JSON, \"fc_score\": $FC_SCORE, \"difficulty\": \"$DIFFICULTY\", \"student_id\": \"$STUDENT_ID\", \"project_id\": \"$PROJECT_ID\", \"commit_hash\": $COMMIT_HASH_JSON, \"commit_message\": $COMMIT_MSG_JSON}")

if [ $? -ne 0 ] || [ -z "$PUZZLE_RESPONSE" ]; then
    echo "[INERTIA] Puzzle request failed. Push blocked."
    exit 1
fi

TOKEN_ID=$(printf '%s' "$PUZZLE_RESPONSE" | run_python -c "import json,sys; print(json.load(sys.stdin).get('token_id', ''))")
TIMER=$(printf '%s' "$PUZZLE_RESPONSE" | run_python -c "import json,sys; print(json.load(sys.stdin).get('timer_seconds', 120))")

if [ -z "$TOKEN_ID" ]; then
    echo "[INERTIA] No token received from server. Push blocked."
    exit 1
fi

PUZZLE_URL="${FRONTEND_URL}/student?token=${TOKEN_ID}"

echo ""
echo "========================================"
echo "INERTIA: PROOF-OF-THOUGHT REQUIRED"
echo "========================================"
echo ""
echo "  Open this URL in your browser and solve the puzzle:"
echo ""
echo "  $PUZZLE_URL"
echo ""
echo "  Time limit: ${TIMER}s"
echo "  Waiting for verification..."
echo "========================================"

# Poll /puzzle/{token_id}/status until verified, expired, or timer runs out
POLL_INTERVAL=3
ELAPSED=0

while [ "$ELAPSED" -lt "$TIMER" ]; do
    sleep $POLL_INTERVAL
    ELAPSED=$((ELAPSED + POLL_INTERVAL))

    STATUS_RESPONSE=$(curl -sf "$API_BASE/puzzle/${TOKEN_ID}/status")
    if [ $? -ne 0 ] || [ -z "$STATUS_RESPONSE" ]; then
        continue
    fi

    STATUS=$(printf '%s' "$STATUS_RESPONSE" | run_python -c "import json,sys; print(json.load(sys.stdin).get('status', ''))")

    if [ "$STATUS" = "verified" ]; then
        echo ""
        echo "[INERTIA] Proof-of-Thought verified. Push proceeding."
        exit 0
    fi

    if [ "$STATUS" = "expired" ]; then
        echo ""
        echo "[INERTIA] Puzzle expired or failed. Push blocked. Try pushing again."
        exit 1
    fi

    REMAINING=$((TIMER - ELAPSED))
    printf "\r[INERTIA] Waiting... %ds remaining   " "$REMAINING"
done

echo ""
echo "[INERTIA] Timed out waiting for verification. Push blocked."
exit 1
"""


def _run_git(args: list[str]) -> str:
    return subprocess.check_output(["git", *args], stderr=subprocess.STDOUT).decode("utf-8").strip()


def _repo_root() -> Path:
    try:
        root = _run_git(["rev-parse", "--show-toplevel"])
        return Path(root)
    except Exception:
        print("❌ Not inside a git repository.")
        sys.exit(1)


def _repo_commit_count() -> int:
    try:
        count = _run_git(["rev-list", "--count", "HEAD"])
        return int(count)
    except Exception:
        return 0


def _student_id_from_git() -> str:
    try:
        return _run_git(["config", "user.email"])
    except Exception:
        return ""


def _http_json(url: str, method: str = "GET", body: dict | None = None) -> dict:
    data = None
    headers = {"Content-Type": "application/json"}
    if body is not None:
        data = json.dumps(body).encode("utf-8")

    req = urllib.request.Request(url, method=method, data=data, headers=headers)
    with urllib.request.urlopen(req, timeout=10) as response:
        payload = response.read().decode("utf-8")
        return json.loads(payload) if payload else {}


def _detect_python_bin() -> str | None:
    if "PYTHON_BIN" in os.environ:
        return os.environ["PYTHON_BIN"]
    if shutil.which("python3"):
        return "python3"
    if shutil.which("python"):
        try:
            out = subprocess.check_output(["python", "--version"], stderr=subprocess.STDOUT, text=True)
            if "Python 3" in out:
                return "python"
        except Exception:
            pass
    if shutil.which("py"):
        try:
            out = subprocess.check_output(["py", "-3", "--version"], stderr=subprocess.STDOUT, text=True)
            if "Python 3" in out:
                return "py -3"
        except Exception:
            pass
    return None


def _write_repo_config(repo_root: Path, project_id: str, student_id: str, api_base: str) -> None:
    config_dir = repo_root / ROOT_CONFIG_DIR
    config_dir.mkdir(parents=True, exist_ok=True)

    detected = _detect_python_bin()
    if not detected:
        print("⚠️  Warning: Python 3 could not be found via python3 or py launcher.")
        print("⚠️  Please install Python 3 or set PYTHON_BIN in your shell config.")
        detected = "python3"

    content = "\n".join(
        [
            f"PROJECT_ID={project_id}",
            f"STUDENT_ID={student_id}",
            f"API_BASE={api_base}",
            f"PYTHON_BIN={detected}",
        ]
    )
    (repo_root / ROOT_CONFIG_FILE).write_text(content + "\n", encoding="utf-8")


def _install_hook(repo_root: Path) -> None:
    target_hook = repo_root / ".git" / "hooks" / "pre-push"
    target_hook.parent.mkdir(parents=True, exist_ok=True)

    candidate_hooks = [
        repo_root / "inertia-cli" / "pre-push",
        Path(__file__).resolve().parent / "pre-push",
    ]

    source_hook = next((path for path in candidate_hooks if path.exists()), None)
    if source_hook is not None:
        shutil.copy2(source_hook, target_hook)
    else:
        target_hook.write_text(FALLBACK_HOOK_TEMPLATE, encoding="utf-8")

    target_hook.chmod(0o755)


def cmd_init(args: argparse.Namespace) -> None:
    repo_root = _repo_root()
    join_code = input("Enter join code: ").strip().upper()
    if not join_code:
        print("❌ Join code is required.")
        sys.exit(1)

    api_base = args.api_base.rstrip("/")

    try:
        project = _http_json(f"{api_base}/projects/{join_code}")
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            print("❌ Invalid join code.")
            sys.exit(1)
        print(f"❌ Failed to validate join code: HTTP {exc.code}")
        sys.exit(1)
    except Exception as exc:
        print(f"❌ Failed to validate join code: {exc}")
        sys.exit(1)

    commit_count = _repo_commit_count()
    if commit_count > 0:
        print("❌ BLOCKED: Repo must have zero commits to join Inertia.")
        sys.exit(1)

    git_email = _student_id_from_git()
    student_id = input(f"Student ID [{git_email or 'required'}]: ").strip() or git_email
    if not student_id:
        print("❌ Student ID is required (set git user.email or type one).")
        sys.exit(1)

    try:
        joined = _http_json(
            f"{api_base}/projects/{join_code}/join",
            method="POST",
            body={"student_id": student_id},
        )
    except Exception as exc:
        print(f"❌ Failed to join project: {exc}")
        sys.exit(1)

    _write_repo_config(repo_root, joined["project_id"], student_id, api_base)
    _install_hook(repo_root)

    print(f"✓ Joined project: {project['name']} ({join_code})")
    print("✓ Inertia initialized. Every push now requires Proof-of-Thought.")


def cmd_status(args: argparse.Namespace) -> None:
    repo_root = _repo_root()
    config_path = repo_root / ROOT_CONFIG_FILE
    if not config_path.exists():
        print("Inertia is not initialized in this repository. Run: inertia init")
        return

    print(config_path.read_text(encoding="utf-8").strip())


def cmd_doctor(args: argparse.Namespace) -> None:
    repo_root = _repo_root()
    hook_path = repo_root / ".git" / "hooks" / "pre-push"
    config_path = repo_root / ROOT_CONFIG_FILE

    if config_path.exists():
        print(f"✅ Config exists: {config_path}")
    else:
        print(f"❌ Missing config: {config_path}")

    if hook_path.exists():
        print(f"✅ Hook installed: {hook_path}")
    else:
        print(f"❌ Missing hook: {hook_path}")


def main() -> None:
    parser = argparse.ArgumentParser(prog="inertia", description="Inertia CLI")
    parser.add_argument("--api-base", default=DEFAULT_API_BASE, help="Inertia backend base URL")
    subparsers = parser.add_subparsers(dest="command", required=False)

    subparsers.add_parser("init", help="Join a project and install pre-push hook")
    subparsers.add_parser("status", help="Print current repo Inertia config")
    subparsers.add_parser("doctor", help="Check local repo Inertia setup")

    args = parser.parse_args()

    if args.command == "init":
        cmd_init(args)
    elif args.command == "status":
        cmd_status(args)
    elif args.command == "doctor":
        cmd_doctor(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
