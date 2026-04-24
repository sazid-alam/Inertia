export type Difficulty = 'TRIVIAL' | 'EASY' | 'MEDIUM' | 'HARD'

export interface AuditResponse {
  complexity_score: number
  line_delta: number
  recursive_calls: number
  nesting_depth: number
  difficulty: Difficulty
  requires_puzzle: boolean
  requires_proof_of_intent: boolean
}

export interface PuzzleResponse {
  token_id: string
  question: string
  setup: string
  function_name: string
  timer_seconds: number
}

export interface PublicPuzzleResponse {
  setup: string
  question: string
  function_name: string
  timer_seconds: number
  student_id: string
}

export interface PuzzleStatusResponse {
  status: string
  jwt_token: string | null
  message: string | null
}

export interface VerifyResponse {
  success: boolean
  jwt_token: string | null
  lockout_seconds: number | null
  attempt_number: number | null
  message: string
}

export interface AttemptLogEntry {
  timestamp: number
  success: boolean
  fc_score: number
  solve_time: number
  concept: string
}

export interface StudentStatus {
  student_id: string
  locked_until: string | null
  attempt_count: number
  failed_count: number
  lockout_seconds: number
  last_fc_score: number | null
  is_suspicious: boolean
  was_correct: boolean | null
  recent_attempts: AttemptLogEntry[]
}

export interface DashboardResponse {
  students: StudentStatus[]
}

export interface LockoutResponse {
  students: StudentStatus[]
}

export interface AuthenticityRecord {
  student_id: string
  fc_score: number
  solve_time_seconds: number
  flag: boolean
}

export interface AuthenticityResponse {
  students: AuthenticityRecord[]
}

export interface HeatmapCell {
  attempts: number
  failures: number
}

export interface HeatmapResponse {
  heatmap: Record<string, Record<string, HeatmapCell>>
}
