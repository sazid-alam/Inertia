interface LiveIndicatorProps {
  connected: boolean
}

export function LiveIndicator({ connected }: LiveIndicatorProps) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700">
      <span
        className={`h-2 w-2 rounded-full ${
          connected ? 'animate-pulse bg-emerald-500' : 'bg-slate-400'
        }`}
      />
      {connected ? 'Live stream connected' : 'Polling mode'}
    </div>
  )
}
