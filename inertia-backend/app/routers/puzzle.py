from fastapi import APIRouter, HTTPException

from app.models import (
    DifficultyLevel,
    PublicPuzzleResponse,
    PuzzleRequest,
    PuzzleResponse,
    PuzzleStatusResponse,
)
from app.services.ast_parser import get_difficulty, get_timer_seconds
from app.services.puzzle_factory import generate_puzzle
from app.storage.store import is_locked_out, load_puzzle, load_verified_token

router = APIRouter(prefix="/puzzle", tags=["puzzle"])


@router.post("", response_model=PuzzleResponse)
async def request_puzzle(req: PuzzleRequest) -> PuzzleResponse:
    locked, remaining = is_locked_out(req.student_id)
    if locked:
        raise HTTPException(
            status_code=423,
            detail=f"Student is in reflection period. {remaining}s remaining.",
        )

    expected_difficulty = get_difficulty(req.fc_score)
    if req.difficulty != expected_difficulty:
        raise HTTPException(
            status_code=400,
            detail=f"Difficulty mismatch: expected {expected_difficulty.value} for fc_score={req.fc_score}.",
        )

    if req.difficulty == DifficultyLevel.TRIVIAL:
        raise HTTPException(
            status_code=400,
            detail="Trivial commits do not require a puzzle.",
        )

    token_id, puzzle_data = await generate_puzzle(
        req.diff,
        req.fc_score,
        req.difficulty,
        req.student_id,
    )

    return PuzzleResponse(
        token_id=token_id,
        question=puzzle_data["question"],
        setup=puzzle_data["setup"],
        function_name=puzzle_data["function_name"],
        timer_seconds=get_timer_seconds(req.difficulty),
    )


@router.get("/{token_id}", response_model=PublicPuzzleResponse)
def get_puzzle(token_id: str) -> PublicPuzzleResponse:
    puzzle = load_puzzle(token_id)
    if not puzzle:
        raise HTTPException(
            status_code=404, detail="Puzzle not found. It may have expired or never existed."
        )

    return PublicPuzzleResponse(
        setup=puzzle.get("setup", ""),
        question=puzzle.get("question", ""),
        function_name=puzzle.get("function_name", ""),
        timer_seconds=get_timer_seconds(DifficultyLevel(puzzle.get("difficulty", "EASY"))),
        student_id=puzzle.get("student_id", ""),
    )


@router.get("/{token_id}/status", response_model=PuzzleStatusResponse)
def get_puzzle_status(token_id: str) -> PuzzleStatusResponse:
    # Check if a token exists for verification
    jwt_token = load_verified_token(token_id)
    if jwt_token:
        return PuzzleStatusResponse(
            status="verified", jwt_token=jwt_token, message="Verification successful."
        )

    # Check if the puzzle is still pending
    puzzle = load_puzzle(token_id)
    if puzzle:
        return PuzzleStatusResponse(status="pending", message="Waiting for verification.")

    # Neither the puzzle nor the verified token exist
    return PuzzleStatusResponse(status="expired", message="Puzzle expired or failed.")
