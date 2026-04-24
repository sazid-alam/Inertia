import { del, get } from './client'
import type {
  AuthenticityResponse,
  DashboardResponse,
  LockoutResponse,
} from '../types'

export function getStatus() {
  return get<DashboardResponse>('/dashboard/status')
}

export function getLockouts() {
  return get<LockoutResponse>('/dashboard/lockouts')
}

export function getAuthenticity() {
  return get<AuthenticityResponse>('/dashboard/authenticity')
}

export function clearLockout(studentId: string) {
  return del<{ cleared: boolean }>(`/dashboard/lockout/${studentId}`)
}
