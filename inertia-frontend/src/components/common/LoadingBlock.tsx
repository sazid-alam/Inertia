interface LoadingBlockProps {
  label?: string
}

export function LoadingBlock({ label = 'Loading...' }: LoadingBlockProps) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">
      {label}
    </div>
  )
}
