import { NavLink, Route, Routes } from 'react-router-dom'
import { DashboardPage } from './pages/Dashboard/DashboardPage'
import { StudentPage } from './pages/Puzzle/StudentPage'

function getNavClassName(isActive: boolean) {
  return [
    'rounded-md px-3 py-2 text-sm font-semibold transition',
    isActive
      ? 'bg-indigo-600 text-white'
      : 'bg-white text-slate-700 hover:bg-slate-100',
  ].join(' ')
}

export function App() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-bold">Inertia.edu</h1>
            <p className="text-xs text-slate-500">
              Proof-of-thought student flow and instructor dashboard
            </p>
          </div>
          <nav className="flex gap-2">
            <NavLink
              to="/"
              className={({ isActive }) => getNavClassName(isActive)}
              end
            >
              Student
            </NavLink>
            <NavLink
              to="/dashboard"
              className={({ isActive }) => getNavClassName(isActive)}
            >
              Dashboard
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl p-4 md:p-6">
        <Routes>
          <Route path="/" element={<StudentPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </main>
    </div>
  )
}
