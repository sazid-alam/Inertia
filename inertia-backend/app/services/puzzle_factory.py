import asyncio
import json
import logging
import random
import re
import uuid
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

from app.config import settings
from app.models import DifficultyLevel
from app.storage.store import save_puzzle

try:
    from google import genai
except ImportError:
    genai = None  # type: ignore[assignment]

_fallback_puzzles = json.loads(
    (Path(__file__).parent.parent / "storage" / "fallback_puzzles.json").read_text(
        encoding="utf-8"
    )
)
_client = None

SYSTEM_PROMPT = (
    "You are a CS pedagogy engine that generates variable-trace puzzles for student code. "
    "Your only output must be a single valid JSON object. No markdown, no preamble, no "
    "explanation outside the JSON."
)

REQUIRED_KEYS = {
    "function_name",
    "setup",
    "breakpoint",
    "question",
    "answer",
    "explanation",
    "concept",
}


def build_user_prompt(diff: str, fc_score: int, difficulty: str) -> str:
    return f"""{SYSTEM_PROMPT}

Code diff submitted by student:
{diff}

Complexity score (Fc): {fc_score}
Difficulty level: {difficulty}

Generate ONE variable-trace puzzle for this specific code.
Pick an interesting function, choose a meaningful breakpoint, and ask the student to predict a variable state.

Return exactly this JSON schema:
{{
  "function_name": "<name of the function being traced>",
  "setup": "<call context, e.g. Given: fib(4) is called>",
  "breakpoint": "<where execution is paused>",
  "question": "<the specific question about variable state>",
  "answer": "<exact expected answer as a string>",
  "explanation": "<one-sentence explanation of the correct answer>",
  "concept": "<one of: RECURSION | DYNAMIC_PROGRAMMING | SORTING | GRAPHS | TREES | LOOPS | OTHER>"
}}"""


def _get_client():
    global _client

    if genai is None or not settings.GEMINI_API_KEY:
        return None

    if _client is None:
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)

    return _client


def get_fallback_puzzle(difficulty: DifficultyLevel | str) -> dict[str, Any]:
    difficulty_value = (
        difficulty.value if isinstance(difficulty, DifficultyLevel) else difficulty
    )
    matches = [
        puzzle
        for puzzle in _fallback_puzzles
        if puzzle.get("difficulty") == difficulty_value
    ]
    pool = matches or _fallback_puzzles
    return random.choice(pool).copy()


def _validate_puzzle_shape(puzzle: dict[str, Any]) -> dict[str, Any]:
    if not REQUIRED_KEYS.issubset(puzzle):
        missing = REQUIRED_KEYS - set(puzzle)
        raise ValueError(f"Puzzle payload missing required keys: {sorted(missing)}")
    return puzzle


async def _generate_with_gemini(
    diff: str, fc_score: int, difficulty: DifficultyLevel
) -> dict[str, Any]:
    client = _get_client()
    if client is None:
        raise RuntimeError("Gemini client unavailable.")

    prompt = build_user_prompt(diff, fc_score, difficulty.value)

    response = await client.aio.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=prompt,
    )

    raw = response.text.strip()
    raw = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`").strip()
    return _validate_puzzle_shape(json.loads(raw))


def _issue_puzzle(
    puzzle: dict[str, Any],
    fc_score: int,
    difficulty: DifficultyLevel,
    student_id: str,
) -> tuple[str, dict[str, str]]:
    token_id = str(uuid.uuid4())
    stored_puzzle = {
        **puzzle,
        "student_id": student_id,
        "fc_score": fc_score,
        "difficulty": difficulty.value,
    }
    save_puzzle(token_id, stored_puzzle)
    return token_id, {
        "function_name": str(puzzle["function_name"]),
        "setup": str(puzzle["setup"]),
        "question": str(puzzle["question"]),
    }


def issue_fallback_puzzle(
    fc_score: int, difficulty: DifficultyLevel, student_id: str
) -> tuple[str, dict[str, str]]:
    puzzle = get_fallback_puzzle(difficulty)
    return _issue_puzzle(puzzle, fc_score, difficulty, student_id)


async def generate_puzzle(
    diff: str,
    fc_score: int,
    difficulty: DifficultyLevel,
    student_id: str,
) -> tuple[str, dict[str, str]]:
    try:
        puzzle = await asyncio.wait_for(
            _generate_with_gemini(diff, fc_score, difficulty),
            timeout=settings.API_TIMEOUT_SECONDS,
        )
        return _issue_puzzle(puzzle, fc_score, difficulty, student_id)
    except Exception as exc:
        logger.warning(
            "Gemini puzzle generation failed (%s: %s); falling back to static puzzle.",
            type(exc).__name__,
            exc,
        )
        return issue_fallback_puzzle(fc_score, difficulty, student_id)
