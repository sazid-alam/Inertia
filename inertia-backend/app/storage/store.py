import json
import time
from datetime import datetime, timezone
from typing import Any

from app.config import settings
from app.services.lockout import lockout_seconds_for_failures, suspicious_solve

CONCEPTS = ["RECURSION", "DYNAMIC_PROGRAMMING", "SORTING", "GRAPHS", "TREES", "LOOPS", "OTHER"]

try:
    import redis
except ImportError:
    redis = None  # type: ignore[assignment]

_puzzles: dict[str, dict[str, Any]] = {}
_attempts: dict[str, dict[str, Any]] = {}
_solve_times: dict[str, dict[str, Any]] = {}
_redis_client = None


def _now() -> float:
    return time.time()


def _empty_attempt_entry() -> dict[str, Any]:
    return {"count": 0, "failed": 0, "locked_until": 0.0, "log": []}


def _use_redis() -> bool:
    return settings.USE_REDIS and redis is not None


def _get_redis():
    global _redis_client

    if not settings.USE_REDIS:
        return None
    if redis is None:
        raise RuntimeError("USE_REDIS is enabled but the redis package is not installed.")
    if _redis_client is None:
        _redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis_client


def _attempt_key(student_id: str) -> str:
    return f"attempts:{student_id}"


def _solve_key(student_id: str) -> str:
    return f"solve:{student_id}"


def _puzzle_key(token_id: str) -> str:
    return f"puzzle:{token_id}"


def save_puzzle(token_id: str, puzzle: dict[str, Any], ttl_seconds: int | None = None) -> None:
    ttl = ttl_seconds or settings.PUZZLE_TTL_SECONDS
    payload = {**puzzle, "issued_at": _now()}

    if _use_redis():
        client = _get_redis()
        client.setex(_puzzle_key(token_id), ttl, json.dumps(payload))
        return

    _puzzles[token_id] = {**payload, "expires_at": _now() + ttl}


def load_puzzle(token_id: str) -> dict[str, Any] | None:
    if _use_redis():
        client = _get_redis()
        raw = client.get(_puzzle_key(token_id))
        return json.loads(raw) if raw else None

    puzzle = _puzzles.get(token_id)
    if not puzzle:
        return None
    if _now() > float(puzzle["expires_at"]):
        del _puzzles[token_id]
        return None
    return dict(puzzle)


def delete_puzzle(token_id: str) -> None:
    if _use_redis():
        client = _get_redis()
        client.delete(_puzzle_key(token_id))
        return

    _puzzles.pop(token_id, None)


def _load_attempt_entry(student_id: str) -> dict[str, Any]:
    if _use_redis():
        client = _get_redis()
        raw = client.get(_attempt_key(student_id))
        return json.loads(raw) if raw else _empty_attempt_entry()
    return dict(_attempts.get(student_id, _empty_attempt_entry()))


def _save_attempt_entry(student_id: str, entry: dict[str, Any]) -> None:
    if _use_redis():
        client = _get_redis()
        client.set(_attempt_key(student_id), json.dumps(entry))
        return
    _attempts[student_id] = entry


def _save_solve(student_id: str, data: dict[str, Any]) -> None:
    if _use_redis():
        client = _get_redis()
        client.set(_solve_key(student_id), json.dumps(data))
        return
    _solve_times[student_id] = data


def _load_solve(student_id: str) -> dict[str, Any]:
    if _use_redis():
        client = _get_redis()
        raw = client.get(_solve_key(student_id))
        return json.loads(raw) if raw else {}
    return dict(_solve_times.get(student_id, {}))


def record_attempt(
    student_id: str,
    success: bool,
    fc_score: int = 0,
    solve_time: float = 0,
    concept: str = "OTHER",
) -> dict[str, Any]:
    entry = _load_attempt_entry(student_id)
    entry["count"] += 1
    entry.setdefault("log", [])
    entry["log"].append(
        {
            "timestamp": _now(),
            "success": success,
            "fc_score": fc_score,
            "solve_time": round(solve_time, 3),
            "concept": concept,
        }
    )
    entry["log"] = entry["log"][-20:]

    if not success:
        entry["failed"] += 1
        duration = lockout_seconds_for_failures(entry["failed"])
        entry["locked_until"] = _now() + duration
        if fc_score > 0:
            _save_solve(
                student_id,
                {
                    "fc_score": fc_score,
                    "solve_time": round(solve_time, 3),
                    "timestamp": _now(),
                    "was_correct": False,
                },
            )
    else:
        entry["locked_until"] = 0.0
        entry["failed"] = 0
        _save_solve(
            student_id,
            {
                "fc_score": fc_score,
                "solve_time": round(solve_time, 3),
                "timestamp": _now(),
                "was_correct": True,
            },
        )

    _save_attempt_entry(student_id, entry)
    return entry


def is_locked_out(student_id: str) -> tuple[bool, int]:
    entry = _load_attempt_entry(student_id)
    remaining = int(float(entry.get("locked_until", 0)) - _now())
    return remaining > 0, max(0, remaining)


def clear_lockout(student_id: str) -> None:
    entry = _load_attempt_entry(student_id)
    entry["locked_until"] = 0.0
    _save_attempt_entry(student_id, entry)


def _format_locked_until(timestamp: float | int) -> str | None:
    if not timestamp:
        return None
    return datetime.fromtimestamp(timestamp, tz=timezone.utc).isoformat()


def _redis_scan_keys(pattern: str) -> list[str]:
    client = _get_redis()
    keys = []
    cursor = 0
    while True:
        cursor, batch = client.scan(cursor, match=pattern, count=100)
        keys.extend(batch)
        if cursor == 0:
            break
    return keys


def _get_attempt_student_ids() -> list[str]:
    if _use_redis():
        return [key.split(":", 1)[1] for key in _redis_scan_keys("attempts:*")]
    return list(_attempts.keys())


def _get_solve_student_ids() -> list[str]:
    if _use_redis():
        return [key.split(":", 1)[1] for key in _redis_scan_keys("solve:*")]
    return list(_solve_times.keys())


def get_all_statuses() -> list[dict[str, Any]]:
    student_ids = sorted(set(_get_attempt_student_ids()) | set(_get_solve_student_ids()))
    results: list[dict[str, Any]] = []

    for student_id in student_ids:
        entry = _load_attempt_entry(student_id)
        solve_info = _load_solve(student_id)
        remaining = max(0, int(float(entry.get("locked_until", 0)) - _now()))
        fc_score = int(solve_info.get("fc_score", 0)) if solve_info else None
        solve_time = float(solve_info.get("solve_time", 0)) if solve_info else 0.0
        was_correct = solve_info.get("was_correct") if solve_info else None

        results.append(
            {
                "student_id": student_id,
                "locked_until": _format_locked_until(float(entry.get("locked_until", 0))),
                "attempt_count": int(entry.get("count", 0)),
                "failed_count": int(entry.get("failed", 0)),
                "lockout_seconds": remaining,
                "last_fc_score": fc_score,
                "is_suspicious": suspicious_solve(fc_score or 0, solve_time),
                "was_correct": was_correct,
                "recent_attempts": entry.get("log", [])[-5:],
            }
        )

    return results


def get_active_lockouts() -> list[dict[str, Any]]:
    return [status for status in get_all_statuses() if status["lockout_seconds"] > 0]


def get_authenticity_records() -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for student_id in sorted(_get_solve_student_ids()):
        solve_info = _load_solve(student_id)
        fc_score = int(solve_info.get("fc_score", 0))
        solve_time = float(solve_info.get("solve_time", 0))
        was_correct = solve_info.get("was_correct")
        records.append(
            {
                "student_id": student_id,
                "fc_score": fc_score,
                "solve_time_seconds": solve_time,
                "was_correct": was_correct,
                "flag": suspicious_solve(fc_score, solve_time),
            }
        )
    return records


def get_heatmap() -> dict[str, dict[str, dict[str, int]]]:
    result: dict[str, dict[str, dict[str, int]]] = {}
    for student_id in sorted(_get_attempt_student_ids()):
        entry = _load_attempt_entry(student_id)
        result[student_id] = {}
        for concept in CONCEPTS:
            attempts = [e for e in entry.get("log", []) if e.get("concept") == concept]
            result[student_id][concept] = {
                "attempts": len(attempts),
                "failures": sum(1 for e in attempts if not e["success"]),
            }
    return result


def clear_all_state() -> None:
    if _use_redis():
        client = _get_redis()
        keys = (
            _redis_scan_keys("puzzle:*")
            + _redis_scan_keys("attempts:*")
            + _redis_scan_keys("solve:*")
        )
        if keys:
            client.delete(*keys)
        return

    _puzzles.clear()
    _attempts.clear()
    _solve_times.clear()
