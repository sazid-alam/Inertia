import type { VerifyResponse } from '../../types'
import { formatSeconds } from '../../utils/format'

interface VerifyResultProps {
  result: VerifyResponse
}

export function VerifyResult({ result }: VerifyResultProps) {
  const handleCopyToken = async () => {
    if (!result.jwt_token) {
      return
    }
    await navigator.clipboard.writeText(result.jwt_token)
  }

  if (result.success) {
    return (
      <section className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-emerald-900">
        <h2 className="text-lg font-semibold">Push proceeding</h2>
        <p className="mt-1 text-sm">{result.message}</p>
        <div className="mt-4 rounded border border-emerald-200 bg-white p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            JWT token
          </p>
          <code className="block break-all text-xs text-slate-700">
            {result.jwt_token}
          </code>
          <button
            type="button"
            onClick={() => {
              void handleCopyToken()
            }}
            className="mt-3 rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
          >
            Copy token
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
      <h2 className="text-lg font-semibold">Verification failed</h2>
      <p className="mt-1 text-sm">{result.message}</p>
      <p className="mt-2 text-sm">
        Attempt: <strong>{result.attempt_number ?? '-'}</strong>
      </p>
      {result.lockout_seconds ? (
        <p className="text-sm">
          Reflection period: <strong>{formatSeconds(result.lockout_seconds)}</strong>
        </p>
      ) : null}
    </section>
  )
}
