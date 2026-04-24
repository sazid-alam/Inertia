import { useCountdown } from '../../hooks/useCountdown'
import { formatSeconds } from '../../utils/format'

interface LockoutBadgeProps {
  lockoutSeconds: number
}

const noop = () => {}

export function LockoutBadge({ lockoutSeconds }: LockoutBadgeProps) {
  const remaining = useCountdown(Math.max(0, lockoutSeconds), noop)

  if (remaining <= 0) {
    return <span className="text-slate-400">—</span>
  }

  return <span className="font-medium text-amber-700">{formatSeconds(remaining)}</span>
}
