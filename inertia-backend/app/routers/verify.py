import time

from fastapi import APIRouter, HTTPException, Header

from app.models import DifficultyLevel, VerifyRequest, VerifyResponse
from app.services.ast_parser import get_timer_seconds
from app.services.jwt_service import sign_jwt, verify_jwt
from app.storage.store import (
    delete_puzzle,
    is_locked_out,
    load_puzzle,
    record_attempt,
    save_verified_token,
)

router = APIRouter(prefix="/verify", tags=["verify"])


@router.post("", response_model=VerifyResponse)
def verify_answer(req: VerifyRequest) -> VerifyResponse:
    locked, remaining = is_locked_out(req.student_id)
    if locked:
        raise HTTPException(
            status_code=423,
            detail=f"Locked out for {remaining} more seconds.",
        )

    puzzle = load_puzzle(req.token_id)
    if not puzzle:
        raise HTTPException(status_code=404, detail="Puzzle token expired or not found.")

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
    expected_answer = str(puzzle["answer"]).strip().lower()
    submitted_answer = req.answer.strip().lower()
    correct = submitted_answer == expected_answer

    concept = puzzle.get("concept", "OTHER")
    entry = record_attempt(
        req.student_id,
        success=correct,
        fc_score=int(puzzle.get("fc_score", 0)),
        solve_time=solve_time,
        concept=concept,
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

    _, remaining = is_locked_out(req.student_id)
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
