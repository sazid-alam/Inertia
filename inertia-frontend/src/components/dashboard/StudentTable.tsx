import { useMemo, useState } from 'react'
import type { StudentStatus } from '../../types'
import { LockoutBadge } from './LockoutBadge'

interface StudentTableProps {
  students: StudentStatus[]
  onSelect: (student: StudentStatus) => void
}

type SortKey =
  | 'student_id'
  | 'last_fc_score'
  | 'attempt_count'
  | 'failed_count'
  | 'lockout_seconds'
  | 'is_suspicious'

type SortDirection = 'asc' | 'desc'

function getComparableValue(student: StudentStatus, key: SortKey) {
  switch (key) {
    case 'student_id':
      return student.student_id.toLowerCase()
    case 'last_fc_score':
      return student.last_fc_score ?? -1
    case 'attempt_count':
      return student.attempt_count
    case 'failed_count':
      return student.failed_count
    case 'lockout_seconds':
      return student.lockout_seconds
    case 'is_suspicious':
      return student.is_suspicious ? 1 : 0
  }
}

export function StudentTable({ students, onSelect }: StudentTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('student_id')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const sortedStudents = useMemo(() => {
    const copy = [...students]
    copy.sort((left, right) => {
      const leftValue = getComparableValue(left, sortKey)
      const rightValue = getComparableValue(right, sortKey)

      if (leftValue === rightValue) {
        return 0
      }

      const comparison = leftValue > rightValue ? 1 : -1
      return sortDirection === 'asc' ? comparison : comparison * -1
    })
    return copy
  }, [sortDirection, sortKey, students])

  const toggleSort = (nextSortKey: SortKey) => {
    if (sortKey === nextSortKey) {
      setSortDirection((value) => (value === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortKey(nextSortKey)
    setSortDirection('asc')
  }

  const headClassName =
    'whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'

  return (
    <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className={headClassName}>
              <button type="button" onClick={() => toggleSort('student_id')}>
                ID
              </button>
            </th>
            <th className={headClassName}>
              <button type="button" onClick={() => toggleSort('last_fc_score')}>
                Last Fc
              </button>
            </th>
            <th className={headClassName}>
              <button type="button" onClick={() => toggleSort('attempt_count')}>
                Attempts
              </button>
            </th>
            <th className={headClassName}>
              <button type="button" onClick={() => toggleSort('failed_count')}>
                Failed
              </button>
            </th>
            <th className={headClassName}>
              <button type="button" onClick={() => toggleSort('lockout_seconds')}>
                Lockout
              </button>
            </th>
            <th className={headClassName}>
              <button type="button" onClick={() => toggleSort('is_suspicious')}>
                Suspicious
              </button>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sortedStudents.length === 0 ? (
            <tr>
              <td className="px-3 py-4 text-slate-500" colSpan={6}>
                No student activity yet.
              </td>
            </tr>
          ) : (
            sortedStudents.map((student) => (
              <tr
                key={student.student_id}
                className="cursor-pointer hover:bg-indigo-50"
                onClick={() => onSelect(student)}
              >
                <td className="px-3 py-2 font-medium text-slate-700">
                  {student.student_id}
                </td>
                <td className="px-3 py-2">{student.last_fc_score ?? '—'}</td>
                <td className="px-3 py-2">{student.attempt_count}</td>
                <td className="px-3 py-2">{student.failed_count}</td>
                <td className="px-3 py-2">
                  <LockoutBadge lockoutSeconds={student.lockout_seconds} />
                </td>
                <td className="px-3 py-2 text-center">
                  {student.is_suspicious ? (
                    <span role="img" aria-label="suspicious">
                      ⚠️
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  )
}
