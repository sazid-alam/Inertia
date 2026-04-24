interface CountdownRingProps {
  totalSeconds: number
  remainingSeconds: number
}

export function CountdownRing({
  totalSeconds,
  remainingSeconds,
}: CountdownRingProps) {
  const size = 72
  const strokeWidth = 7
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const bounded = Math.max(0, Math.min(totalSeconds, remainingSeconds))
  const progress = totalSeconds > 0 ? bounded / totalSeconds : 0
  const strokeDashoffset = circumference * (1 - progress)
  const isUrgent = remainingSeconds <= 30

  return (
    <div className="relative h-[72px] w-[72px]">
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        role="presentation"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="stroke-slate-200"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={isUrgent ? 'stroke-rose-500' : 'stroke-indigo-500'}
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-slate-700">
        {remainingSeconds}s
      </div>
    </div>
  )
}
