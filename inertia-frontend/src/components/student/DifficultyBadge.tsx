import type { Difficulty } from '../../types'

interface DifficultyBadgeProps {
  difficulty: Difficulty
}

const badgeClassByDifficulty: Record<Difficulty, string> = {
  TRIVIAL: 'bg-slate-100 text-slate-700 border-slate-300',
  EASY: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  MEDIUM: 'bg-amber-100 text-amber-700 border-amber-300',
  HARD: 'bg-rose-100 text-rose-700 border-rose-300',
}

export function DifficultyBadge({ difficulty }: DifficultyBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClassByDifficulty[difficulty]}`}
    >
      {difficulty}
    </span>
  )
}
