import os
import subprocess
import sys
from pathlib import Path

import pytest

from inertia_cli import inertia


def git(repo: Path, *args: str) -> str:
    return subprocess.check_output(["git", *args], cwd=repo, text=True).strip()


@pytest.fixture
def empty_repo(tmp_path: Path) -> Path:
    repo = tmp_path / "student-repo"
    repo.mkdir()
    git(repo, "init")
    git(repo, "config", "user.email", "student@example.edu")
    git(repo, "config", "user.name", "Inertia Student")
    return repo


def test_init_writes_lf_config_and_hook(monkeypatch: pytest.MonkeyPatch, capsys, empty_repo: Path) -> None:
    def fake_http_json(url: str, method: str = "GET", body: dict | None = None) -> dict:
        if url.endswith("/projects/ABC123"):
            return {
                "project_id": "project-1",
                "name": "CS101",
                "teacher_id": "teacher@example.edu",
                "join_code": "ABC123",
            }
        if url.endswith("/projects/ABC123/join"):
            return {"project_id": "project-1", "student_id": body["student_id"], "joined_at": 1.0}
        raise AssertionError(f"unexpected URL: {url}")

    monkeypatch.chdir(empty_repo)
    monkeypatch.setattr(inertia, "_http_json", fake_http_json)
    monkeypatch.setattr(inertia, "_detect_python_bin", lambda: sys.executable)
    monkeypatch.setattr(inertia, "_is_windows", lambda: False)
    monkeypatch.setattr("builtins.input", lambda prompt="": "ABC123" if "join code" in prompt.lower() else "")
    monkeypatch.setattr(sys, "argv", ["inertia", "--api-base", "http://testserver", "init", "--yes"])

    inertia.main()

    config = empty_repo / ".inertia" / "config"
    hook = empty_repo / ".git" / "hooks" / "pre-push"
    assert config.exists()
    assert hook.exists()
    assert b"\r\n" not in config.read_bytes()
    assert b"\r\n" not in hook.read_bytes()
    assert "INERTIA_VERSION=1" in config.read_text(encoding="utf-8")
    assert "OFFLINE_POLICY=allow" in config.read_text(encoding="utf-8")

    monkeypatch.setattr(sys, "argv", ["inertia", "doctor"])
    inertia.main()
    monkeypatch.setattr(sys, "argv", ["inertia", "status"])
    inertia.main()
    output = capsys.readouterr().out
    assert "Config exists" in output
    assert "Hook installed" in output
    assert "PROJECT_ID=project-1" in output


def test_init_blocks_repositories_with_existing_commits(
    monkeypatch: pytest.MonkeyPatch, empty_repo: Path
) -> None:
    (empty_repo / "README.md").write_text("hello\n", encoding="utf-8", newline="\n")
    git(empty_repo, "add", "README.md")
    git(empty_repo, "commit", "-m", "initial")

    monkeypatch.chdir(empty_repo)
    monkeypatch.setattr(
        inertia,
        "_http_json",
        lambda *_, **__: {
            "project_id": "project-1",
            "name": "CS101",
            "teacher_id": "teacher@example.edu",
            "join_code": "ABC123",
        },
    )
    monkeypatch.setattr("builtins.input", lambda prompt="": "ABC123")
    monkeypatch.setattr(sys, "argv", ["inertia", "--api-base", "http://testserver", "init", "--yes"])

    with pytest.raises(SystemExit) as exc:
        inertia.main()
    assert exc.value.code == 1


def test_repair_installs_python_hook_on_windows(monkeypatch: pytest.MonkeyPatch, empty_repo: Path) -> None:
    monkeypatch.chdir(empty_repo)
    monkeypatch.setattr(inertia, "_is_windows", lambda: True)
    monkeypatch.setattr(sys, "argv", ["inertia", "repair"])

    inertia.main()

    hook = empty_repo / ".git" / "hooks" / "pre-push"
    assert hook.exists()
    assert hook.read_text(encoding="utf-8").startswith("#!/usr/bin/env python3")
