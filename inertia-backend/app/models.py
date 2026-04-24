from enum import Enum

from pydantic import BaseModel, Field


class DifficultyLevel(str, Enum):
    TRIVIAL = "TRIVIAL"
    EASY = "EASY"
    MEDIUM = "MEDIUM"
    HARD = "HARD"


class AuditRequest(BaseModel):
    diff: str
    student_id: str


class AuditResponse(BaseModel):
    complexity_score: int
    line_delta: int
    recursive_calls: int
    nesting_depth: int
    difficulty: DifficultyLevel
    requires_puzzle: bool
    requires_proof_of_intent: bool


class PuzzleRequest(BaseModel):
    diff: str
    fc_score: int
    difficulty: DifficultyLevel
    student_id: str


class PuzzleResponse(BaseModel):
    token_id: str
    question: str
    setup: str
    function_name: str
    timer_seconds: int


class PublicPuzzleResponse(BaseModel):
    setup: str
    question: str
    function_name: str
    timer_seconds: int
    student_id: str


class PuzzleStatusResponse(BaseModel):
    status: str
    jwt_token: str | None = None
    message: str | None = None


class VerifyRequest(BaseModel):
    token_id: str
    student_id: str
    answer: str


class VerifyResponse(BaseModel):
    success: bool
    jwt_token: str | None = None
    lockout_seconds: int | None = None
    attempt_number: int | None = None
    message: str


class AttemptLogEntry(BaseModel):
    timestamp: float
    success: bool
    fc_score: int = 0
    solve_time: float = 0
    concept: str = "OTHER"


class StudentStatus(BaseModel):
    student_id: str
    locked_until: str | None = None
    attempt_count: int
    failed_count: int = 0
    lockout_seconds: int = 0
    last_fc_score: int | None = None
    is_suspicious: bool
    was_correct: bool | None = None
    recent_attempts: list[AttemptLogEntry] = Field(default_factory=list)


class DashboardResponse(BaseModel):
    students: list[StudentStatus]
