import type { StudentStatus } from '../../types'
import { formatSolveTime, formatTimestamp } from '../../utils/format'
import { AttemptTimeline } from './AttemptTimeline'

interface StudentDrawerProps {
  student: StudentStatus
  onClose: () => void
}

export function StudentDrawer({ student, onClose }: StudentDrawerProps) {
  return (
    <aside className="fixed inset-y-0 right-0 z-40 w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white p-4 shadow-2xl">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Student detail
          </p>
          <h2 className="text-xl font-semibold text-slate-900">{student.student_id}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-slate-300 px-2 py-1 text-sm hover:bg-slate-100"
        >
          Close
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded border border-slate-200 bg-slate-50 p-3">
          <p className="text-slate-500">Attempts</p>
          <p className="text-lg font-semibold">{student.attempt_count}</p>
        </div>
        <div className="rounded border border-slate-200 bg-slate-50 p-3">
          <p className="text-slate-500">Failed</p>
          <p className="text-lg font-semibold">{student.failed_count}</p>
        </div>
      </div>

      <h3 className="mb-2 mt-5 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Attempt timeline
      </h3>
      <AttemptTimeline attempts={student.recent_attempts} />

      <h3 className="mb-2 mt-5 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Recent attempts
      </h3>
      <div className="space-y-2">
        {student.recent_attempts.length === 0 ? (
          <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
            No recent attempts.
          </div>
        ) : (
          student.recent_attempts
            .slice()
            .reverse()
            .map((attempt, index) => (
              <div
                key={`${attempt.timestamp}-${index}`}
                className="rounded border border-slate-200 bg-slate-50 p-3 text-sm"
              >
                <div className="flex justify-between text-slate-500">
                  <span>{formatTimestamp(attempt.timestamp)}</span>
                  <span>{attempt.success ? 'Success' : 'Failed'}</span>
                </div>
                <div className="mt-1 text-slate-700">
                  Fc score: <strong>{attempt.fc_score}</strong> · Solve time:{' '}
                  <strong>{formatSolveTime(attempt.solve_time)}</strong>
                </div>
              </div>
            ))
        )}
      </div>
    </aside>
  )
}
