import { useCallback, useEffect, useMemo, useState } from 'react'
import { getStatus } from '../../api/dashboard'
import { ErrorBanner } from '../../components/common/ErrorBanner'
import { LoadingBlock } from '../../components/common/LoadingBlock'
import { LiveIndicator } from '../../components/dashboard/LiveIndicator'
import { StatCards } from '../../components/dashboard/StatCards'
import { StudentDrawer } from '../../components/dashboard/StudentDrawer'
import { StudentTable } from '../../components/dashboard/StudentTable'
import { useSSE } from '../../hooks/useSSE'
import type { DashboardResponse, StudentStatus } from '../../types'
import { handleApiError } from '../../utils/error'

export function DashboardPage() {
  const [students, setStudents] = useState<StudentStatus[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [inlineError, setInlineError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshLabel, setLastRefreshLabel] = useState<string>('not yet')

  const stream = useSSE<DashboardResponse>('/dashboard/stream')

  const refreshStatus = useCallback(async () => {
    setIsRefreshing(true)
    setInlineError(null)

    try {
      const status = await getStatus()
      setStudents(status.students)
      setLastRefreshLabel(new Date().toLocaleTimeString())
    } catch (error) {
      const handled = handleApiError(error)
      setInlineError(handled.inlineMessage ?? handled.toastMessage)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void refreshStatus()
    const intervalId = window.setInterval(() => {
      void refreshStatus()
    }, 30_000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [refreshStatus])

  useEffect(() => {
    if (!stream.data) {
      return
    }
    setStudents(stream.data.students)
    setLastRefreshLabel(new Date().toLocaleTimeString())
  }, [stream.data])

  const selectedStudent = useMemo(
    () => students.find((student) => student.student_id === selectedStudentId) ?? null,
    [selectedStudentId, students],
  )

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Instructor dashboard</h2>
            <p className="text-sm text-slate-600">
              Live student status with SSE updates and 30-second polling fallback.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <LiveIndicator connected={stream.connected} />
            <button
              type="button"
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              onClick={() => {
                void refreshStatus()
              }}
            >
              Refresh
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Last refresh: {lastRefreshLabel} {isRefreshing ? '(updating...)' : ''}
        </p>
      </section>

      {inlineError ? <ErrorBanner message={inlineError} /> : null}
      {isLoading ? <LoadingBlock label="Loading dashboard..." /> : null}

      <StatCards students={students} />
      <StudentTable students={students} onSelect={(student) => setSelectedStudentId(student.student_id)} />

      {selectedStudent ? (
        <StudentDrawer
          student={selectedStudent}
          onClose={() => setSelectedStudentId(null)}
          onLockoutCleared={() => { void refreshStatus() }}
        />
      ) : null}
    </div>
  )
}
