import type { AuditResponse } from '../../types'
import { DifficultyBadge } from './DifficultyBadge'

interface AuditSummaryProps {
  audit: AuditResponse
}

export function AuditSummary({ audit }: AuditSummaryProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Audit summary</h2>
        <DifficultyBadge difficulty={audit.difficulty} />
      </div>
      <dl className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded border border-slate-200 bg-slate-50 p-3">
          <dt className="text-slate-500">Fc score</dt>
          <dd className="text-xl font-semibold">{audit.complexity_score}</dd>
        </div>
        <div className="rounded border border-slate-200 bg-slate-50 p-3">
          <dt className="text-slate-500">Line delta</dt>
          <dd className="text-xl font-semibold">{audit.line_delta}</dd>
        </div>
        <div className="rounded border border-slate-200 bg-slate-50 p-3">
          <dt className="text-slate-500">Recursive calls</dt>
          <dd className="text-xl font-semibold">{audit.recursive_calls}</dd>
        </div>
        <div className="rounded border border-slate-200 bg-slate-50 p-3">
          <dt className="text-slate-500">Nesting depth</dt>
          <dd className="text-xl font-semibold">{audit.nesting_depth}</dd>
        </div>
      </dl>
    </section>
  )
}
