import { API_BASE_URL, ApiError } from '../api/client'

export interface HandledApiError {
  inlineMessage: string | null
  toastMessage: string | null
  lockoutSeconds: number | null
  shouldResetSession: boolean
}

function parseSeconds(message: string) {
  const match = message.match(/(\d+)/)
  if (!match) {
    return null
  }
  return Number(match[1])
}

export function handleApiError(error: unknown): HandledApiError {
  if (error instanceof ApiError) {
    if (error.status === 400) {
      return {
        inlineMessage: error.message,
        toastMessage: null,
        lockoutSeconds: null,
        shouldResetSession: false,
      }
    }

    if (error.status === 403) {
      return {
        inlineMessage: 'Session mismatch detected. Please restart with your own token.',
        toastMessage: null,
        lockoutSeconds: null,
        shouldResetSession: true,
      }
    }

    if (error.status === 404) {
      return {
        inlineMessage: 'Time ran out for this puzzle token. Please request a new puzzle.',
        toastMessage: null,
        lockoutSeconds: null,
        shouldResetSession: false,
      }
    }

    if (error.status === 423) {
      return {
        inlineMessage: error.message,
        toastMessage: null,
        lockoutSeconds: parseSeconds(error.message),
        shouldResetSession: false,
      }
    }

    if (error.status >= 500) {
      return {
        inlineMessage: null,
        toastMessage: 'Backend unreachable — try again.',
        lockoutSeconds: null,
        shouldResetSession: false,
      }
    }

    return {
      inlineMessage: error.message,
      toastMessage: null,
      lockoutSeconds: null,
      shouldResetSession: false,
    }
  }

  return {
    inlineMessage: null,
    toastMessage: `Network failure. Verify backend at ${API_BASE_URL}`,
    lockoutSeconds: null,
    shouldResetSession: false,
  }
}
