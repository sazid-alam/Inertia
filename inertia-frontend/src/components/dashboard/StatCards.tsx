import type { StudentStatus } from '../../types'

interface StatCardsProps {
  students: StudentStatus[]
}

export function StatCards({ students }: StatCardsProps) {
  const total = students.length
  const activeLockouts = students.filter((student) => student.lockout_seconds > 0).length
  const suspicious = students.filter((student) => student.is_suspicious).length

  return (
    <section className="grid gap-3 md:grid-cols-3">
      <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-500">Total students</p>
        <p className="mt-1 text-2xl font-semibold text-slate-900">{total}</p>
      </article>
      <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-500">Active lockouts</p>
        <p className="mt-1 text-2xl font-semibold text-slate-900">{activeLockouts}</p>
      </article>
      <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-500">Suspicious flags</p>
        <p className="mt-1 text-2xl font-semibold text-slate-900">{suspicious}</p>
      </article>
    </section>
  )
}
