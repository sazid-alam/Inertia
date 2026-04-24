import { post } from './client'
import type { Difficulty, PuzzleResponse } from '../types'

export function requestPuzzle(
  diff: string,
  fc_score: number,
  difficulty: Difficulty,
  student_id: string,
) {
  return post<PuzzleResponse>('/puzzle', { diff, fc_score, difficulty, student_id })
}
