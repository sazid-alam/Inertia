LOCKOUT_SCHEDULE_SECONDS = [0, 120, 120, 120, 120]

def lockout_seconds_for_failures(failed_count: int) -> int:
    index = min(max(failed_count, 0), len(LOCKOUT_SCHEDULE_SECONDS) - 1)
    return LOCKOUT_SCHEDULE_SECONDS[index]


def suspicious_solve(fc_score: int, solve_time: float) -> bool:
    return fc_score > 30 and solve_time < 10
