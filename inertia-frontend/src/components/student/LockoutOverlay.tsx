import { useCountdown } from '../../hooks/useCountdown'
import { formatSeconds } from '../../utils/format'

interface LockoutOverlayProps {
  lockoutSeconds: number
  onExpire: () => void
}

export function LockoutOverlay({ lockoutSeconds, onExpire }: LockoutOverlayProps) {
  const remaining = useCountdown(lockoutSeconds, onExpire)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 p-4">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
          Reflection period
        </p>
        <h2 className="mt-2 text-2xl font-bold text-slate-900">
          {formatSeconds(remaining)}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          You can request a new puzzle once the lockout expires.
        </p>
      </div>
    </div>
  )
}
