interface ErrorBannerProps {
  message: string
}

export function ErrorBanner({ message }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800"
    >
      {message}
    </div>
  )
}
