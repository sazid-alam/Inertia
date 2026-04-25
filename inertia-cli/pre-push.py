#!/usr/bin/env python3
import json
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path


def run_git(*args: str) -> str:
    return subprocess.check_output(["git", *args], stderr=subprocess.STDOUT).decode("utf-8").strip()


def load_config(repo_root: Path) -> dict[str, str]:
    config_path = repo_root / ".inertia" / "config"
    if not config_path.exists():
        return {}
    cfg: dict[str, str] = {}
    for line in config_path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        cfg[key.strip()] = value.strip()
    return cfg


def http_json(url: str, method: str = "GET", body: dict | None = None, timeout: int = 10):
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, method=method, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        payload = response.read().decode("utf-8")
        return json.loads(payload) if payload else {}


def get_diff() -> tuple[str, str]:
    empty_tree = run_git("hash-object", "-t", "tree", "/dev/null")
    diff = ""
    last_sha = ""
    read_refs = False
    for line in sys.stdin.read().splitlines():
        parts = line.split(" ")
        if len(parts) < 4:
            continue
        _, local_sha, _, remote_sha = parts[:4]
        if not local_sha:
            continue
        read_refs = True
        if set(local_sha) == {"0"}:
            continue
        last_sha = local_sha
        range_diff = run_git("diff", empty_tree if set(remote_sha) == {"0"} else remote_sha, local_sha)
        if range_diff:
            diff += range_diff + "\n"

    if not read_refs:
        try:
            run_git("rev-parse", "--verify", "HEAD^")
            diff = run_git("diff", "HEAD^", "HEAD")
        except Exception:
            try:
                diff = run_git("diff", empty_tree, "HEAD")
            except Exception:
                diff = ""
        try:
            last_sha = run_git("rev-parse", "HEAD")
        except Exception:
            last_sha = ""
    return diff, last_sha


def main() -> int:
    repo_root = Path(run_git("rev-parse", "--show-toplevel"))
    cfg = load_config(repo_root)
    if not cfg:
        print("[INERTIA] No .inertia/config found. Push allowed.")
        return 0

    api_base = cfg.get("API_BASE", "https://inertia-production-e090.up.railway.app").rstrip("/")
    frontend_url = cfg.get("FRONTEND_URL", "https://inertia-tau.vercel.app").rstrip("/")
    project_id = cfg.get("PROJECT_ID", "")
    student_id = cfg.get("STUDENT_ID", "") or run_git("config", "user.email")
    offline_policy = cfg.get("OFFLINE_POLICY", "allow").lower()

    if not project_id or not student_id:
        print("[INERTIA] Missing PROJECT_ID or STUDENT_ID in .inertia/config. Push allowed.")
        return 0

    print("[INERTIA] Analyzing commit...")
    diff, last_sha = get_diff()
    if not diff:
        print("[INERTIA] No diff detected. Push allowed.")
        return 0

    commit_hash = last_sha[:7] if last_sha else ""
    try:
        commit_message = run_git("log", "-1", "--pretty=%s", last_sha) if last_sha else run_git("log", "-1", "--pretty=%s")
    except Exception:
        commit_message = ""

    try:
        audit = http_json(
            f"{api_base}/audit",
            method="POST",
            body={
                "diff": diff,
                "student_id": student_id,
                "project_id": project_id,
                "commit_hash": commit_hash,
                "commit_message": commit_message,
            },
        )
    except Exception:
        if offline_policy == "block":
            print("[INERTIA] Cannot reach server. Push blocked (offline policy=block).")
            return 1
        print("[INERTIA] Cannot reach server. Push allowed (offline mode).")
        return 0

    if isinstance(audit, dict) and audit.get("detail"):
        print(f"[INERTIA] {audit['detail']}")
        print("[INERTIA] Push blocked.")
        return 1

    if str(audit.get("requires_puzzle", False)) != "True":
        print("[INERTIA] Trivial commit. Push allowed.")
        return 0

    try:
        puzzle = http_json(
            f"{api_base}/puzzle",
            method="POST",
            body={
                "diff": diff,
                "fc_score": int(audit.get("complexity_score", 0)),
                "difficulty": audit.get("difficulty", "EASY"),
                "student_id": student_id,
                "project_id": project_id,
                "commit_hash": commit_hash,
                "commit_message": commit_message,
            },
        )
    except urllib.error.HTTPError as exc:
        print(f"[INERTIA] Puzzle request failed: HTTP {exc.code}")
        return 1
    except Exception:
        print("[INERTIA] Puzzle request failed. Push blocked.")
        return 1

    token_id = str(puzzle.get("token_id", ""))
    timer = int(puzzle.get("timer_seconds", 120) or 120)
    if not token_id:
        print("[INERTIA] No token received from server. Push blocked.")
        return 1

    print("\n========================================")
    print("INERTIA: PROOF-OF-THOUGHT REQUIRED")
    print("========================================")
    print("\n  Open this URL in your browser and solve the puzzle:\n")
    print(f"  {frontend_url}/student?token={token_id}\n")
    print(f"  Time limit: {timer}s")
    print("  Waiting for verification...")
    print("========================================")

    elapsed = 0
    interval = 3
    while elapsed < timer:
        time.sleep(interval)
        elapsed += interval
        try:
            status_response = http_json(f"{api_base}/puzzle/{token_id}/status")
        except Exception:
            continue
        status = str(status_response.get("status", ""))
        if status == "verified":
            print("\n[INERTIA] Proof-of-Thought verified. Push proceeding.")
            return 0
        if status == "expired":
            print("\n[INERTIA] Puzzle expired or failed. Push blocked. Try pushing again.")
            return 1
        print(f"\r[INERTIA] Waiting... {max(0, timer - elapsed)}s remaining   ", end="")

    print("\n[INERTIA] Timed out waiting for verification. Push blocked.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
