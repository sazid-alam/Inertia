import { useEffect, useState } from 'react'
import { API_BASE_URL } from '../api/client'

export interface SseState<T> {
  data: T | null
  connected: boolean
}

export function useSSE<T>(path: string): SseState<T> {
  const [data, setData] = useState<T | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const source = new EventSource(`${API_BASE_URL}${path}`)

    source.onopen = () => {
      setConnected(true)
    }

    source.onmessage = (event) => {
      const parsed = JSON.parse(event.data) as T
      setData(parsed)
      setConnected(true)
    }

    source.onerror = () => {
      setConnected(false)
      source.close()
    }

    return () => {
      source.close()
    }
  }, [path])

  return { data, connected }
}
