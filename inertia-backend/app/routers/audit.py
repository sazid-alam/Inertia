from fastapi import APIRouter, HTTPException

from app.config import settings
from app.models import AuditRequest, AuditResponse, DifficultyLevel
from app.services.ast_parser import compute_complexity, get_difficulty
from app.storage.store import is_locked_out

router = APIRouter(prefix="/audit", tags=["audit"])


@router.post("", response_model=AuditResponse)
def audit_diff(req: AuditRequest) -> AuditResponse:
    locked, remaining = is_locked_out(req.student_id)
    if locked:
        raise HTTPException(
            status_code=423,
            detail=f"Student is in reflection period. {remaining}s remaining.",
        )

    if not req.diff.strip():
        raise HTTPException(status_code=400, detail="Empty diff - nothing to audit.")

    result = compute_complexity(req.diff)
    difficulty = get_difficulty(result["fc"])

    return AuditResponse(
        complexity_score=result["fc"],
        line_delta=result["L"],
        recursive_calls=result["R"],
        nesting_depth=result["N"],
        difficulty=difficulty,
        requires_puzzle=difficulty != DifficultyLevel.TRIVIAL,
        requires_proof_of_intent=result["L"] > settings.MAX_DIFF_LINES,
    )
