import type { PuzzleResponse } from '../../types'
import { CountdownRing } from './CountdownRing'

interface PuzzleCardProps {
  puzzle: PuzzleResponse
  answer: string
  onAnswerChange: (answer: string) => void
  onSubmit: () => void
  remainingSeconds: number
  disabled: boolean
}

export function PuzzleCard({
  puzzle,
  answer,
  onAnswerChange,
  onSubmit,
  remainingSeconds,
  disabled,
}: PuzzleCardProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Proof-of-thought puzzle
          </p>
          <h2 className="text-lg font-semibold text-slate-900">
            {puzzle.function_name}
          </h2>
        </div>
        <CountdownRing
          totalSeconds={puzzle.timer_seconds}
          remainingSeconds={remainingSeconds}
        />
      </div>

      <div className="space-y-3 text-sm">
        <div className="rounded border border-slate-200 bg-slate-50 p-3">
          <p className="font-medium text-slate-600">Setup</p>
          <p className="mt-1 whitespace-pre-wrap text-slate-800">{puzzle.setup}</p>
        </div>
        <div className="rounded border border-slate-200 bg-slate-50 p-3">
          <p className="font-medium text-slate-600">Question</p>
          <p className="mt-1 whitespace-pre-wrap text-slate-800">
            {puzzle.question}
          </p>
        </div>
      </div>

      <label className="mt-4 block text-sm font-medium text-slate-700">
        Your answer
        <textarea
          className="mt-2 h-28 w-full rounded-md border border-slate-300 p-3 text-sm outline-none ring-indigo-200 focus:ring"
          value={answer}
          onChange={(event) => onAnswerChange(event.target.value)}
          placeholder="Explain your answer here..."
          disabled={disabled}
        />
      </label>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Verify answer
        </button>
      </div>
    </section>
  )
}
