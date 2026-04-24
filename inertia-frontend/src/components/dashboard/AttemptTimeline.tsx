import type { AttemptLogEntry } from '../../types'

interface AttemptTimelineProps {
  attempts: AttemptLogEntry[]
}

export function AttemptTimeline({ attempts }: AttemptTimelineProps) {
  if (attempts.length === 0) {
    return (
      <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
        No attempts recorded yet.
      </div>
    )
  }

  const width = 340
  const height = 120
  const xStart = 24
  const xEnd = width - 24
  const top = 30
  const bottom = 86

  const points = attempts.map((entry, index) => {
    const ratio = attempts.length === 1 ? 0.5 : index / (attempts.length - 1)
    const x = xStart + ratio * (xEnd - xStart)
    const y = entry.success ? top : bottom
    return `${x},${y}`
  })

  return (
    <div className="rounded border border-slate-200 bg-white p-3">
      <svg width={width} height={height} className="max-w-full" role="img">
        <title>Attempt timeline</title>
        <line
          x1={xStart}
          y1={top}
          x2={xEnd}
          y2={top}
          stroke="#cbd5e1"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <line
          x1={xStart}
          y1={bottom}
          x2={xEnd}
          y2={bottom}
          stroke="#cbd5e1"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke="#4f46e5"
          strokeWidth={2}
        />
        {attempts.map((entry, index) => {
          const ratio = attempts.length === 1 ? 0.5 : index / (attempts.length - 1)
          const x = xStart + ratio * (xEnd - xStart)
          const y = entry.success ? top : bottom
          return (
            <circle
              key={`${entry.timestamp}-${index}`}
              cx={x}
              cy={y}
              r={4}
              fill={entry.success ? '#16a34a' : '#dc2626'}
            />
          )
        })}
      </svg>
      <div className="mt-2 flex justify-between text-xs text-slate-500">
        <span>Success</span>
        <span>Failed</span>
      </div>
    </div>
  )
}
