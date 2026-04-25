import subprocess
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.routers import verify as verify_router
from app.storage.store import clear_all_state
from inertia_cli import inertia


def git(repo: Path, *args: str) -> str:
    return subprocess.check_output(["git", *args], cwd=repo, text=True).strip()


@pytest.fixture(autouse=True)
def reset_state():
    clear_all_state()
    yield
    clear_all_state()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_student_flow_init_commit_puzzle_verify(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, client: TestClient
) -> None:
    created = client.post(
        "/projects",
        json={"name": "CS101 Assignment 3", "teacher_id": "teacher@example.edu"},
    )
    assert created.status_code == 200
    project = created.json()
    join_code = project["join_code"]

    repo = tmp_path / "student-repo"
    repo.mkdir()
    git(repo, "init")
    git(repo, "config", "user.email", "student@example.edu")

    def fake_cli_http(url: str, method: str = "GET", body: dict | None = None) -> dict:
        path = url.removeprefix("http://testserver")
        response = client.request(method, path, json=body)
        assert response.status_code == 200, response.text
        return response.json()

    monkeypatch.chdir(repo)
    monkeypatch.setattr(inertia, "_http_json", fake_cli_http)
    monkeypatch.setattr(inertia, "_is_windows", lambda: True)
    monkeypatch.setattr("builtins.input", lambda prompt="": join_code if "join code" in prompt.lower() else "")
    inertia.cmd_init(type("Args", (), {"api_base": "http://testserver", "yes": True})())

    source = repo / "solution.py"
    source.write_text(
        "\n".join(
            [
                "def fib(n):",
                "    if n <= 1:",
                "        return n",
                "    return fib(n - 1) + fib(n - 2)",
                "",
                "print(fib(6))",
                "",
            ]
        ),
        encoding="utf-8",
        newline="\n",
    )
    git(repo, "add", "solution.py")
    git(repo, "commit", "-m", "implement fibonacci")
    commit_hash = git(repo, "rev-parse", "--short", "HEAD")
    empty_tree = git(repo, "hash-object", "-t", "tree", "/dev/null")
    diff = git(repo, "diff", empty_tree, "HEAD")

    audit = client.post(
        "/audit",
        json={
            "diff": diff,
            "student_id": "student@example.edu",
            "project_id": project["project_id"],
            "commit_hash": commit_hash,
            "commit_message": "implement fibonacci",
        },
    )
    assert audit.status_code == 200
    audit_payload = audit.json()
    assert audit_payload["requires_puzzle"] is True

    puzzle = client.post(
        "/puzzle",
        json={
            "diff": diff,
            "fc_score": audit_payload["complexity_score"],
            "difficulty": audit_payload["difficulty"],
            "student_id": "student@example.edu",
            "project_id": project["project_id"],
            "commit_hash": commit_hash,
            "commit_message": "implement fibonacci",
        },
    )
    assert puzzle.status_code == 200
    token_id = puzzle.json()["token_id"]

    public = client.get(f"/puzzle/{token_id}")
    assert public.status_code == 200
    status = client.get(f"/puzzle/{token_id}/status")
    assert status.status_code == 200
    assert status.json()["status"] == "pending"

    async def always_correct(**kwargs):
        return True

    monkeypatch.setattr(verify_router, "evaluate_answer_with_gemini", always_correct)
    verified = client.post(
        "/verify",
        json={
            "token_id": token_id,
            "student_id": "student@example.edu",
            "project_id": project["project_id"],
            "answer": "13",
        },
    )
    assert verified.status_code == 200
    assert verified.json()["success"] is True

    final_status = client.get(f"/puzzle/{token_id}/status")
    assert final_status.status_code == 200
    assert final_status.json()["status"] == "verified"
