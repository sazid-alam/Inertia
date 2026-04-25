import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { createProject, listProjects } from '../../api/projects'
import type { ProjectSummary } from '../../types'
import { handleApiError } from '../../utils/error'

export function ProjectListPage() {
  const [teacherId, setTeacherId] = useState('teacher@uni.edu')
  const [projectName, setProjectName] = useState('')
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const totalStudents = useMemo(
    () => projects.reduce((sum, project) => sum + project.student_count, 0),
    [projects],
  )

  const totalCommits = useMemo(
    () => projects.reduce((sum, project) => sum + project.commit_count, 0),
    [projects],
  )

  const refreshProjects = useCallback(async (nextTeacherId = teacherId) => {
    if (!nextTeacherId.trim()) {
      setProjects([])
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const payload = await listProjects(nextTeacherId.trim())
      setProjects(payload)
    } catch (err) {
      const handled = handleApiError(err)
      setError(handled.inlineMessage ?? handled.toastMessage)
    } finally {
      setIsLoading(false)
    }
  }, [teacherId])

  useEffect(() => {
    void refreshProjects()
  }, [refreshProjects])

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!projectName.trim() || !teacherId.trim()) {
      setError('Teacher email and project name are required.')
      return
    }

    setError(null)
    try {
      await createProject(projectName.trim(), teacherId.trim())
      setProjectName('')
      await refreshProjects(teacherId.trim())
    } catch (err) {
      const handled = handleApiError(err)
      setError(handled.inlineMessage ?? handled.toastMessage)
    }
  }

  return (
    <div className="paper-bg" style={{ minHeight: '100vh', padding: '28px', fontFamily: 'var(--ui)' }}>
      <main style={{ maxWidth: 1200, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: 40, fontStyle: 'italic' }}>Projects</h1>
            <p style={{ marginTop: 8, color: 'var(--ink-muted)' }}>
              Create projects, share join codes, and track student commits by project.
            </p>
          </div>
          <Link to="/" style={{ textDecoration: 'none', color: 'var(--ink)', border: '1px solid var(--ink)', padding: '8px 12px' }}>
            Home
          </Link>
        </header>

        <section style={{ border: '1px solid var(--ink)', padding: 16, marginBottom: 16, background: 'var(--paper)' }}>
          <form onSubmit={handleCreateProject} style={{ display: 'grid', gap: 12, gridTemplateColumns: '1.3fr 1.7fr auto' }}>
            <input
              value={teacherId}
              onChange={(event) => setTeacherId(event.target.value)}
              placeholder="teacher@uni.edu"
              style={{ border: '1px solid var(--ink)', padding: '10px' }}
            />
            <input
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              placeholder="Algorithms 2026"
              style={{ border: '1px solid var(--ink)', padding: '10px' }}
            />
            <button type="submit" style={{ border: '1px solid var(--ink)', background: 'var(--ink)', color: 'var(--paper)', padding: '10px 16px', cursor: 'pointer' }}>
              + New Project
            </button>
          </form>
          <div style={{ marginTop: 10 }}>
            <button
              type="button"
              onClick={() => { void refreshProjects() }}
              style={{ border: '1px solid var(--ink)', background: 'var(--paper)', padding: '7px 11px', cursor: 'pointer' }}
            >
              Refresh list
            </button>
          </div>
        </section>

        <section style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <div style={{ border: '1px solid var(--ink)', padding: 12, flex: 1, background: 'var(--paper)' }}>
            <div style={{ color: 'var(--ink-muted)', fontSize: 12 }}>Projects</div>
            <div style={{ fontSize: 28 }}>{projects.length}</div>
          </div>
          <div style={{ border: '1px solid var(--ink)', padding: 12, flex: 1, background: 'var(--paper)' }}>
            <div style={{ color: 'var(--ink-muted)', fontSize: 12 }}>Students</div>
            <div style={{ fontSize: 28 }}>{totalStudents}</div>
          </div>
          <div style={{ border: '1px solid var(--ink)', padding: 12, flex: 1, background: 'var(--paper)' }}>
            <div style={{ color: 'var(--ink-muted)', fontSize: 12 }}>Commits</div>
            <div style={{ fontSize: 28 }}>{totalCommits}</div>
          </div>
        </section>

        {error ? (
          <div style={{ border: '1px solid var(--signal)', color: 'var(--signal)', padding: 12, marginBottom: 12 }}>{error}</div>
        ) : null}

        <section>
          {isLoading ? (
            <div style={{ color: 'var(--ink-muted)', padding: 20 }}>Loading projects...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 14 }}>
              {projects.map((project) => (
                <article key={project.project_id} style={{ border: '1px solid var(--ink)', background: 'var(--paper)', padding: 14 }}>
                  <h3 style={{ marginTop: 0, marginBottom: 6 }}>{project.name}</h3>
                  <div style={{ color: 'var(--ink-muted)', fontSize: 12, marginBottom: 8 }}>
                    Join code: <strong style={{ color: 'var(--ink)' }}>{project.join_code}</strong>
                  </div>
                  <div style={{ fontSize: 13, marginBottom: 12 }}>
                    {project.student_count} students · {project.commit_count} commits
                  </div>
                  <Link
                    to={`/dashboard/${project.project_id}`}
                    style={{ display: 'inline-block', border: '1px solid var(--ink)', padding: '7px 10px', textDecoration: 'none', color: 'var(--ink)' }}
                  >
                    Open project
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
