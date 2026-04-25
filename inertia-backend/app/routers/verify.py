import time
import uuid

from fastapi import APIRouter, HTTPException, Header

from app.models import DifficultyLevel, VerifyRequest, VerifyResponse
from app.services.ast_parser import get_timer_seconds
from app.services.puzzle_factory import evaluate_answer_with_gemini
from app.services.jwt_service import sign_jwt, verify_jwt
from app.storage.store import (
    add_student_to_project,
    delete_puzzle,
    is_locked_out,
    load_project,
    load_puzzle,
    record_project_commit,
    record_attempt,
    save_verified_token,
)

router = APIRouter(prefix="/verify", tags=["verify"])


@router.post("", response_model=VerifyResponse)
async def verify_answer(req: VerifyRequest) -> VerifyResponse:
    puzzle = load_puzzle(req.token_id)
    if not puzzle:
        raise HTTPException(status_code=404, detail="Puzzle token expired or not found.")

    project_id = req.project_id or str(puzzle.get("project_id", "global"))

    if project_id != "global" and not load_project(project_id):
        raise HTTPException(status_code=404, detail="Project not found.")

    locked, remaining = is_locked_out(req.student_id, project_id)
    if locked:
        raise HTTPException(status_code=423, detail=f"Locked out for {remaining} more seconds.")

    if puzzle.get("student_id") and puzzle["student_id"] != req.student_id:
        raise HTTPException(
            status_code=403,
            detail="Puzzle token does not belong to this student.",
        )

    difficulty = DifficultyLevel(puzzle.get("difficulty", "EASY"))
    timer = get_timer_seconds(difficulty)
    elapsed = time.time() - float(puzzle.get("issued_at", time.time()))
    if timer > 0 and elapsed > timer:
        delete_puzzle(req.token_id)
        raise HTTPException(status_code=408, detail="Time expired. Puzzle token invalidated.")

    solve_time = max(0.0, time.time() - float(puzzle.get("issued_at", time.time())))
    
    correct = await evaluate_answer_with_gemini(
        setup=puzzle.get("setup", ""),
        question=puzzle.get("question", ""),
        expected_answer=str(puzzle.get("answer", "")).strip(),
        student_answer=req.answer.strip()
    )

    concept = puzzle.get("concept", "OTHER")
    entry = record_attempt(
        req.student_id,
        success=correct,
        fc_score=int(puzzle.get("fc_score", 0)),
        solve_time=solve_time,
        concept=concept,
        project_id=project_id,
    )

    add_student_to_project(project_id, req.student_id)
    record_project_commit(
        project_id,
        req.student_id,
        {
            "commit_id": str(uuid.uuid4()),
            "student_id": req.student_id,
            "project_id": project_id,
            "timestamp": time.time(),
            "commit_hash": str(puzzle.get("commit_hash", "")),
            "commit_message": str(puzzle.get("commit_message", "")),
            "diff_summary": puzzle.get(
                "diff_summary",
                {"lines_added": 0, "lines_removed": 0, "files_changed": []},
            ),
            "categories": puzzle.get(
                "categories",
                {
                    "BACKEND": 0,
                    "TESTING": 0,
                    "UI": 0,
                    "DATABASE": 0,
                    "INFRA": 0,
                    "SYSTEM_DESIGN": 0,
                    "OTHER": 0,
                },
            ),
            "fc_score": int(puzzle.get("fc_score", 0)),
            "difficulty": str(puzzle.get("difficulty", "EASY")),
            "puzzle_result": "PASSED" if correct else "FAILED",
            "solve_time_seconds": round(solve_time, 3),
            "flagged": bool(puzzle.get("flagged", False)),
            "concept": concept,
        },
    )
    delete_puzzle(req.token_id)

    if correct:
        token = sign_jwt(req.student_id, req.token_id)
        save_verified_token(req.token_id, token)
        return VerifyResponse(
            success=True,
            jwt_token=token,
            message="Proof-of-Thought verified. Push proceeding.",
        )

    _, remaining = is_locked_out(req.student_id, project_id)
    return VerifyResponse(
        success=False,
        lockout_seconds=remaining,
        attempt_number=entry["failed"],
        message=(
            f"Incorrect. Reflection period: {remaining}s. "
            f"Explanation: {puzzle.get('explanation', 'Review your logic.')}"
        ),
    )


@router.get("/token")
def validate_token(authorization: str = Header(...)):
    token = authorization.removeprefix("Bearer ").strip()
    payload = verify_jwt(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired PoT token.")
    return {"valid": True, "student_id": payload["sub"], "token_id": payload["token_id"]}
