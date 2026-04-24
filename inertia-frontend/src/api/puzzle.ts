import { get, post } from './client'
import type { Difficulty, PublicPuzzleResponse, PuzzleResponse, PuzzleStatusResponse } from '../types'

export function requestPuzzle(
  diff: string,
  fc_score: number,
  difficulty: Difficulty,
  student_id: string,
) {
  return post<PuzzleResponse>('/puzzle', { diff, fc_score, difficulty, student_id })
}

export function getPuzzle(tokenId: string) {
  return get<PublicPuzzleResponse>(`/puzzle/${tokenId}`)
}

export function getPuzzleStatus(tokenId: string) {
  return get<PuzzleStatusResponse>(`/puzzle/${tokenId}/status`)
}
