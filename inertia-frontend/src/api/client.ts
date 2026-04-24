const fallbackBaseUrl = 'https://inertia-production-e090.up.railway.app'

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? fallbackBaseUrl
).replace(/\/$/, '')

export class ApiError extends Error {
  status: number
  detail: unknown

  constructor(status: number, message: string, detail: unknown = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

async function readPayload(response: Response) {
  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    return response.json()
  }
  return response.text()
}

function getMessageFromPayload(payload: unknown, fallbackMessage: string) {
  if (typeof payload === 'string' && payload.trim()) {
    return payload
  }

  if (payload && typeof payload === 'object' && 'detail' in payload) {
    const detail = (payload as { detail: unknown }).detail
    if (typeof detail === 'string' && detail.trim()) {
      return detail
    }
  }

  return fallbackMessage
}

function normalizePath(path: string) {
  if (path.startsWith('/')) {
    return path
  }
  return `/${path}`
}

async function request<T>(
  path: string,
  options?: RequestInit & { jsonBody?: unknown },
): Promise<T> {
  const requestPath = normalizePath(path)
  const headers = new Headers(options?.headers ?? {})
  const init: RequestInit = { ...options, headers }

  if (options && 'jsonBody' in options) {
    headers.set('Content-Type', 'application/json')
    init.body = JSON.stringify(options.jsonBody)
  }

  const response = await fetch(`${API_BASE_URL}${requestPath}`, init)
  const payload = await readPayload(response)

  if (!response.ok) {
    const fallbackMessage = response.statusText || 'Request failed'
    const message = getMessageFromPayload(payload, fallbackMessage)
    throw new ApiError(response.status, message, payload)
  }

  return payload as T
}

export function get<T>(path: string) {
  return request<T>(path, { method: 'GET' })
}

export function post<T>(path: string, jsonBody: unknown) {
  return request<T>(path, { method: 'POST', jsonBody })
}

export function del<T>(path: string) {
  return request<T>(path, { method: 'DELETE' })
}
