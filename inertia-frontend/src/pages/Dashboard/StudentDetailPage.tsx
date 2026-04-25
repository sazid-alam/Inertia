import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProjectDashboard, getProjectStudent, getStudentCommitReconciliation } from '../../api/projects'
import type { CommitRecord, CommitReconciliationResponse, StudentProfile } from '../../types'
import { handleApiError } from '../../utils/error'

function formatTime(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleString()
}

const PREFERRED_CATEGORY_ORDER = [
  'BACKEND',
  'UI',
  'DATABASE',
  'TESTING',
  'INFRA',
  'SYSTEM_DESIGN',
  'OTHER',
]

function buildRadarPolygon(values: number[], radius: number, cx: number, cy: number) {
  return values
    .map((value, index) => {
      const angle = (-Math.PI / 2) + (index * 2 * Math.PI) / values.length
      const scaled = Math.max(0, Math.min(100, value)) / 100
      const x = cx + Math.cos(angle) * radius * scaled
      const y = cy + Math.sin(angle) * radius * scaled
      return `${x},${y}`
    })
    .join(' ')
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length === 0) {
    return <div style={{ color: 'var(--ink-muted)', fontSize: 12 }}>No puzzle data yet.</div>
  }

  const width = 420
  const height = 120
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(1, max - min)
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * (width - 20) + 10
      const y = height - ((value - min) / range) * (height - 20) - 10
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <rect x="0" y="0" width={width} height={height} fill="var(--paper)" />
      <polyline fill="none" stroke="var(--ink)" strokeWidth="2" points={points} />
      {points.split(' ').map((point) => {
        const [x, y] = point.split(',')
        return <circle key={point} cx={x} cy={y} r="2.5" fill="var(--signal)" />
      })}
    </svg>
  )
}

export function StudentDetailPage() {
  const { projectId = '', studentId = '' } = useParams()
  const [student, setStudent] = useState<StudentProfile | null>(null)
  const [commits, setCommits] = useState<CommitRecord[]>([])
  const [reconciliation, setReconciliation] = useState<CommitReconciliationResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!projectId || !studentId) return

    setError(null)
    try {
      const [profile, dashboard] = await Promise.all([
        getProjectStudent(projectId, studentId),
        getProjectDashboard(projectId),
      ])
      setStudent(profile)
      setCommits(dashboard.commits.filter((commit) => commit.student_id === studentId))

      try {
        const report = await getStudentCommitReconciliation(projectId, studentId)
        setReconciliation(report)
      } catch {
        setReconciliation(null)
      }
    } catch (err) {
      const handled = handleApiError(err)
      setError(handled.inlineMessage ?? handled.toastMessage)
    }
  }, [projectId, studentId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const sortedCommits = useMemo(
    () => commits.slice().sort((a, b) => b.timestamp - a.timestamp),
    [commits],
  )

  const categoryAxes = useMemo(() => {
    if (!student) return []
    const categories = Object.keys(student.category_breakdown ?? {})
    const orderedKnown = PREFERRED_CATEGORY_ORDER.filter((category) => categories.includes(category))
    const dynamicUnknown = categories
      .filter((category) => !PREFERRED_CATEGORY_ORDER.includes(category))
      .sort((left, right) => left.localeCompare(right))
    const combined = [...orderedKnown, ...dynamicUnknown]
    return combined.length > 0 ? combined : ['OTHER']
  }, [student])

  const commitTimeline = useMemo(() => commits.slice().sort((a, b) => a.timestamp - b.timestamp), [commits])

  const flaggedCommits = useMemo(
    () => sortedCommits.filter((commit) => commit.flagged || (commit.fc_score > 30 && commit.solve_time_seconds < 10)),
    [sortedCommits],
  )

  function exportStudentCsv() {
    if (!student) return
    const headers = [
      'student_id',
      'project_id',
      'timestamp',
      'commit_hash',
      'commit_message',
      'fc_score',
      'difficulty',
      'puzzle_result',
      'solve_time_seconds',
      'flagged',
    ]
    const rows = sortedCommits.map((commit) => [
      commit.student_id,
      commit.project_id,
      new Date(commit.timestamp * 1000).toISOString(),
      commit.commit_hash,
      commit.commit_message,
      String(commit.fc_score),
      commit.difficulty,
      commit.puzzle_result,
      String(commit.solve_time_seconds),
      String(commit.flagged || (commit.fc_score > 30 && commit.solve_time_seconds < 10)),
    ])

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${student.student_id.replace(/[@.]/g, '_')}_commits.csv`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="paper-bg" style={{ minHeight: '100vh', padding: 28, fontFamily: 'var(--ui)' }}>
      <main style={{ maxWidth: 1100, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 38 }}>
              {decodeURIComponent(studentId)}
            </h1>
            {student ? (
              <p style={{ marginTop: 8, color: 'var(--ink-muted)' }}>
                {student.total_commits} commits · {student.total_lines_added} lines · {student.puzzle_stats.passed}/{student.puzzle_stats.total} puzzles passed
              </p>
            ) : null}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to={`/dashboard/${projectId}`} style={{ border: '1px solid var(--ink)', padding: '8px 12px', textDecoration: 'none', color: 'var(--ink)' }}>
              Back to project
            </Link>
            <button type="button" onClick={exportStudentCsv} style={{ border: '1px solid var(--ink)', background: 'var(--paper)', padding: '8px 12px' }}>
              Export CSV
            </button>
            <button type="button" onClick={() => { void refresh() }} style={{ border: '1px solid var(--ink)', background: 'var(--paper)', padding: '8px 12px' }}>
              Refresh
            </button>
          </div>
        </header>

        {error ? (
          <div style={{ border: '1px solid var(--signal)', color: 'var(--signal)', padding: 12, marginBottom: 14 }}>{error}</div>
        ) : null}

        {student ? (
          <>
            <section style={{ border: '1px solid var(--ink)', background: 'var(--paper)', padding: 14, marginBottom: 14 }}>
              <h2 style={{ marginTop: 0, fontSize: 14, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Contribution profile</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'center' }}>
                <svg width="300" height="300" viewBox="0 0 300 300">
                  {[0.25, 0.5, 0.75, 1].map((ratio) => (
                    <polygon
                      key={ratio}
                      points={buildRadarPolygon(new Array(categoryAxes.length).fill(ratio * 100), 100, 150, 150)}
                      fill="none"
                      stroke="var(--paper-line)"
                    />
                  ))}
                  {categoryAxes.map((axis, index) => {
                    const angle = (-Math.PI / 2) + (index * 2 * Math.PI) / categoryAxes.length
                    const x = 150 + Math.cos(angle) * 115
                    const y = 150 + Math.sin(angle) * 115
                    return (
                      <g key={axis}>
                        <line x1="150" y1="150" x2={x} y2={y} stroke="var(--paper-line)" />
                        <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="var(--ink-muted)">
                          {axis.replace('_', ' ')}
                        </text>
                      </g>
                    )
                  })}
                  <polygon
                    points={buildRadarPolygon(categoryAxes.map((axis) => student.category_breakdown[axis] ?? 0), 100, 150, 150)}
                    fill="rgba(215,64,44,0.25)"
                    stroke="var(--signal)"
                    strokeWidth="2"
                  />
                </svg>

                <div style={{ display: 'grid', gap: 8 }}>
                  {categoryAxes.map((axis) => (
                    <div key={axis} style={{ border: '1px solid var(--paper-line)', padding: 10 }}>
                      <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{axis}</div>
                      <div style={{ fontSize: 22 }}>{student.category_breakdown[axis] ?? 0}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section style={{ border: '1px solid var(--ink)', background: 'var(--paper)', padding: 14, marginBottom: 14 }}>
              <h2 style={{ marginTop: 0, fontSize: 14, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Puzzle score over time</h2>
              <Sparkline values={commitTimeline.map((commit) => commit.fc_score)} />
            </section>

            <section style={{ border: '1px solid var(--ink)', background: 'var(--paper)', padding: 14, marginBottom: 14 }}>
              <h2 style={{ marginTop: 0, fontSize: 14, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Difficulty Performance</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 8 }}>
                {Object.entries(student.difficulty_matrix).map(([tier, data]) => (
                  <div key={tier} style={{ border: '1px solid var(--paper-line)', padding: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{tier}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 4 }}>
                      {data.attempts === 0 ? 'No attempts' : `${data.success_rate}% success · ${data.avg_solve_time}s avg`}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>
                      {data.successes}/{data.attempts} puzzles
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section style={{ border: '1px solid var(--ink)', background: 'var(--paper)', padding: 14 }}>
              <h2 style={{ marginTop: 0, fontSize: 14, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Commit history</h2>
              {reconciliation ? (
                <div style={{ marginBottom: 12, border: '1px solid var(--paper-line)', padding: 10 }}>
                  <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>Reconciliation</div>
                  <div style={{ marginTop: 4, fontSize: 13 }}>
                    Inertia commits: {reconciliation.inertia_commit_count} · GitHub commits: {reconciliation.github_commit_count} · Missing Inertia: {reconciliation.missing_inertia_count}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, color: 'var(--ink-muted)' }}>
                    Repo: {reconciliation.repo_url}
                  </div>
                </div>
              ) : null}
              <div style={{ display: 'grid', gap: 10 }}>
                {(reconciliation?.commits ?? sortedCommits.map((commit) => ({
                  commit_hash: commit.commit_hash || 'no-hash',
                  commit_message: commit.commit_message || '(no message)',
                  timestamp: commit.timestamp,
                  source: 'INERTIA_VERIFIED' as const,
                  verified_by_inertia: true,
                  html_url: null,
                })) ).map((commit) => (
                  <article key={`${commit.source}-${commit.commit_hash}-${commit.timestamp}`} style={{ border: '1px solid var(--paper-line)', padding: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <strong>{commit.commit_hash || 'no-hash'}</strong>
                      <span style={{ color: 'var(--ink-muted)' }}>{formatTime(commit.timestamp)}</span>
                    </div>
                    <div style={{ marginTop: 6, fontSize: 14 }}>{commit.commit_message || '(no message)'}</div>
                    <div style={{ marginTop: 5, fontSize: 12, color: commit.source === 'GITHUB_ONLY' ? 'var(--signal)' : 'var(--ink-muted)' }}>
                      {commit.source === 'GITHUB_ONLY' ? 'Missing Inertia verification' : 'Inertia verified'}
                      {commit.html_url ? (
                        <>
                          {' · '}
                          <a href={commit.html_url} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>
                            View on GitHub
                          </a>
                        </>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section style={{ border: '1px solid var(--ink)', background: 'var(--paper)', padding: 14, marginTop: 14 }}>
              <h2 style={{ marginTop: 0, fontSize: 14, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Flag history</h2>
              {flaggedCommits.length === 0 ? (
                <div style={{ color: 'var(--ink-muted)' }}>No flagged commits yet.</div>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {flaggedCommits.map((commit) => (
                    <article key={commit.commit_id} style={{ border: '1px solid var(--paper-line)', padding: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <strong>{commit.commit_hash || 'no-hash'}</strong>
                        <span style={{ color: 'var(--ink-muted)' }}>{formatTime(commit.timestamp)}</span>
                      </div>
                      <div style={{ marginTop: 6, fontSize: 13 }}>{commit.commit_message || '(no message)'}</div>
                      <div style={{ marginTop: 4, fontSize: 12, color: 'var(--signal)' }}>
                        ⚠ Flag reason: high complexity ({commit.fc_score}) with fast solve ({commit.solve_time_seconds.toFixed(1)}s)
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <div style={{ color: 'var(--ink-muted)' }}>Loading student view...</div>
        )}
      </main>
    </div>
  )
}
