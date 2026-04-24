import { useEffect, useRef, useState } from 'react'

export function useCountdown(seconds: number, onExpire: () => void) {
  const [remaining, setRemaining] = useState(seconds)
  const [prevSeconds, setPrevSeconds] = useState(seconds)
  const onExpireRef = useRef(onExpire)

  if (seconds !== prevSeconds) {
    setPrevSeconds(seconds)
    setRemaining(seconds)
  }

  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  useEffect(() => {
    if (remaining <= 0) {
      if (seconds > 0) {
        onExpireRef.current()
      }
      return
    }

    const intervalId = window.setInterval(() => {
      setRemaining((value) => Math.max(0, value - 1))
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [remaining, seconds])

  return remaining
}
