export function formatSeconds(inputSeconds: number) {
  const seconds = Math.max(0, Math.floor(inputSeconds))
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60

  if (minutes === 0) {
    return `${remainder}s`
  }

  return `${minutes}m ${remainder}s`
}

export function formatTimestamp(unixSeconds: number) {
  return new Date(unixSeconds * 1000).toLocaleTimeString()
}

export function formatSolveTime(seconds: number) {
  return `${seconds.toFixed(1)}s`
}
