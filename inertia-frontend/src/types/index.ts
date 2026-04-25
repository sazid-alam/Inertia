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
  project_id: string
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
  was_correct: boolean | null
  flag: boolean
}

export interface AuthenticityResponse {
  students: AuthenticityRecord[]
}

export interface DifficultyCell {
  attempts: number
  successes: number
  success_rate: number
  avg_solve_time: number
}

export interface ActivityFeedEvent {
  student_id: string
  timestamp: number
  success: boolean
  difficulty: string
  solve_time: number
}

export interface AnalyticsResponse {
  difficulty_matrix: Record<string, Record<string, DifficultyCell>>
  activity_feed: ActivityFeedEvent[]
}

export interface ProjectSummary {
  project_id: string
  name: string
  join_code: string
  teacher_id: string
  created_at: number
  student_count: number
  commit_count: number
}

export interface ProjectLookupResponse {
  project_id: string
  name: string
  teacher_id: string
  join_code: string
}

export type ProjectCreateResponse = ProjectSummary

export interface ProjectJoinResponse {
  project_id: string
  student_id: string
  joined_at: number
}

export interface CommitDiffSummary {
  lines_added: number
  lines_removed: number
  files_changed: string[]
}

export interface CommitRecord {
  commit_id: string
  student_id: string
  project_id: string
  timestamp: number
  commit_hash: string
  commit_message: string
  diff_summary: CommitDiffSummary
  categories: Record<string, number>
  fc_score: number
  difficulty: Difficulty
  puzzle_result: 'PASSED' | 'FAILED' | 'SKIPPED'
  solve_time_seconds: number
  flagged: boolean
}

export interface StudentPuzzleStats {
  total: number
  passed: number
  failed: number
  avg_solve_time: number
}

export interface StudentProfile {
  student_id: string
  project_id: string
  joined_at: number
  repo_url?: string | null
  total_commits: number
  total_lines_added: number
  category_breakdown: Record<string, number>
  puzzle_stats: StudentPuzzleStats
  ever_flagged: boolean
  lockout_count: number
  difficulty_matrix: Record<string, { attempts: number; successes: number; success_rate: number; avg_solve_time: number }>
}

export interface ProjectDashboardResponse {
  project: ProjectSummary
  students: StudentProfile[]
  commits: CommitRecord[]
}

export interface ReconciledCommit {
  commit_hash: string
  commit_message: string
  timestamp: number
  source: 'INERTIA_VERIFIED' | 'GITHUB_ONLY'
  verified_by_inertia: boolean
  html_url: string | null
}

export interface CommitReconciliationResponse {
  project_id: string
  student_id: string
  repo_url: string
  inertia_commit_count: number
  github_commit_count: number
  missing_inertia_count: number
  commits: ReconciledCommit[]
}
