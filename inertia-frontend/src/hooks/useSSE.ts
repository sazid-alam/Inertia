import { useEffect, useRef, useState } from 'react'
import { API_BASE_URL } from '../api/client'

export interface SseState<T> {
  data: T | null
  connected: boolean
}

const MAX_BACKOFF_MS = 30_000

export function useSSE<T>(path: string): SseState<T> {
  const [data, setData] = useState<T | null>(null)
  const [connected, setConnected] = useState(false)
  const attemptRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    let cancelled = false

    function connect() {
      if (cancelled) return

      const source = new EventSource(`${API_BASE_URL}${path}`)
      sourceRef.current = source

      source.onopen = () => {
        if (cancelled) { source.close(); return }
        attemptRef.current = 0
        setConnected(true)
      }

      source.onmessage = (event) => {
        if (cancelled) { source.close(); return }
        const parsed = JSON.parse(event.data) as T
        setData(parsed)
        setConnected(true)
      }

      source.onerror = () => {
        source.close()
        sourceRef.current = null
        if (cancelled) return
        setConnected(false)
        // exponential backoff: 2s, 4s, 8s … capped at 30s
        const delay = Math.min(1000 * Math.pow(2, attemptRef.current), MAX_BACKOFF_MS)
        attemptRef.current += 1
        timerRef.current = setTimeout(connect, delay)
      }
    }

    connect()

    return () => {
      cancelled = true
      if (timerRef.current !== null) clearTimeout(timerRef.current)
      sourceRef.current?.close()
      sourceRef.current = null
    }
  }, [path])

  return { data, connected }
}
