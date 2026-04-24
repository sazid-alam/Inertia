import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { auditDiff } from '../../api/audit'
import { requestPuzzle } from '../../api/puzzle'
import { verifyAnswer } from '../../api/verify'
import { ErrorBanner } from '../../components/common/ErrorBanner'
import { LoadingBlock } from '../../components/common/LoadingBlock'
import { AuditSummary } from '../../components/student/AuditSummary'
import { LockoutOverlay } from '../../components/student/LockoutOverlay'
import { PuzzleCard } from '../../components/student/PuzzleCard'
import { VerifyResult } from '../../components/student/VerifyResult'
import { useCountdown } from '../../hooks/useCountdown'
import type { AuditResponse, PuzzleResponse, VerifyResponse } from '../../types'
import { handleApiError, type HandledApiError } from '../../utils/error'

type StudentStep = 'idle' | 'audit' | 'puzzle' | 'verify'

interface RunAuditOptions {
  studentId?: string
  diff?: string
  autoStartPuzzle?: boolean
}

export function StudentPage() {
  const initialQuery = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return {
      studentId: params.get('student_id') ?? '',
      diff: params.get('diff') ?? '',
    }
  }, [])

  const [studentId, setStudentId] = useState(initialQuery.studentId)
  const [diff, setDiff] = useState(initialQuery.diff)
  const [answer, setAnswer] = useState('')
  const [step, setStep] = useState<StudentStep>('idle')
  const [auditResult, setAuditResult] = useState<AuditResponse | null>(null)
  const [puzzleResult, setPuzzleResult] = useState<PuzzleResponse | null>(null)
  const [verifyResult, setVerifyResult] = useState<VerifyResponse | null>(null)
  const [inlineError, setInlineError] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [lockoutSeconds, setLockoutSeconds] = useState<number | null>(null)
  const [busyLabel, setBusyLabel] = useState<string | null>(null)
  const didAutoRunRef = useRef(false)

  const clearSession = useCallback(() => {
    setStep('idle')
    setAuditResult(null)
    setPuzzleResult(null)
    setVerifyResult(null)
    setAnswer('')
    setLockoutSeconds(null)
  }, [])

  const applyHandledError = useCallback(
    (handled: HandledApiError) => {
      setInlineError(handled.inlineMessage)
      setToastMessage(handled.toastMessage)
      if (handled.lockoutSeconds !== null) {
        setLockoutSeconds(handled.lockoutSeconds)
      }
      if (handled.shouldResetSession) {
        clearSession()
      }
    },
    [clearSession],
  )

  const runPuzzle = useCallback(async () => {
    if (!auditResult) {
      setInlineError('Audit is required before requesting a puzzle.')
      return
    }

    const trimmedStudentId = studentId.trim()
    const trimmedDiff = diff.trim()

    if (!trimmedStudentId || !trimmedDiff) {
      setInlineError('Student ID and diff are required.')
      return
    }

    setBusyLabel('Requesting puzzle...')
    setInlineError(null)
    setVerifyResult(null)

    try {
      const puzzle = await requestPuzzle(
        trimmedDiff,
        auditResult.complexity_score,
        auditResult.difficulty,
        trimmedStudentId,
      )
      setPuzzleResult(puzzle)
      setAnswer('')
      setStep('puzzle')
      setLockoutSeconds(null)
    } catch (error) {
      const handled = handleApiError(error)
      applyHandledError(handled)
      setStep('audit')
    } finally {
      setBusyLabel(null)
    }
  }, [applyHandledError, auditResult, diff, studentId])

  const runAudit = useCallback(
    async (options?: RunAuditOptions) => {
      const nextStudentId = (options?.studentId ?? studentId).trim()
      const nextDiff = (options?.diff ?? diff).trim()

      if (!nextStudentId || !nextDiff) {
        setInlineError('Student ID and diff are required.')
        return
      }

      setBusyLabel('Running audit...')
      setInlineError(null)
      setToastMessage(null)
      setVerifyResult(null)
      setPuzzleResult(null)
      setLockoutSeconds(null)

      try {
        const audit = await auditDiff(nextDiff, nextStudentId)
        setAuditResult(audit)
        setStep('audit')

        if (options?.autoStartPuzzle && audit.requires_puzzle) {
          setBusyLabel('Requesting puzzle...')
          const puzzle = await requestPuzzle(
            nextDiff,
            audit.complexity_score,
            audit.difficulty,
            nextStudentId,
          )
          setPuzzleResult(puzzle)
          setAnswer('')
          setStep('puzzle')
        }
      } catch (error) {
        const handled = handleApiError(error)
        applyHandledError(handled)
      } finally {
        setBusyLabel(null)
      }
    },
    [applyHandledError, diff, studentId],
  )

  const runVerify = useCallback(async () => {
    if (!puzzleResult) {
      setInlineError('No puzzle available to verify.')
      return
    }

    const trimmedStudentId = studentId.trim()
    const trimmedAnswer = answer.trim()

    if (!trimmedStudentId || !trimmedAnswer) {
      setInlineError('Provide both Student ID and answer.')
      return
    }

    setBusyLabel('Verifying answer...')
    setInlineError(null)

    try {
      const verification = await verifyAnswer(
        puzzleResult.token_id,
        trimmedStudentId,
        trimmedAnswer,
      )
      setVerifyResult(verification)
      setStep('verify')

      if (!verification.success && verification.lockout_seconds !== null) {
        setLockoutSeconds(verification.lockout_seconds)
      }
    } catch (error) {
      const handled = handleApiError(error)
      applyHandledError(handled)
      if (handled.shouldResetSession) {
        setStudentId('')
      }
    } finally {
      setBusyLabel(null)
    }
  }, [answer, applyHandledError, puzzleResult, studentId])

  const handlePuzzleExpire = useCallback(() => {
    if (!puzzleResult) {
      return
    }
    setInlineError('Time ran out for this puzzle. Request another puzzle.')
    setPuzzleResult(null)
    setAnswer('')
    setStep('audit')
  }, [puzzleResult])

  const handleLockoutExpire = useCallback(() => {
    setLockoutSeconds(null)
    if (auditResult?.requires_puzzle) {
      void runPuzzle()
    }
  }, [auditResult?.requires_puzzle, runPuzzle])

  const puzzleSeconds = puzzleResult?.timer_seconds ?? 0
  const remainingPuzzleSeconds = useCountdown(puzzleSeconds, handlePuzzleExpire)

  useEffect(() => {
    if (didAutoRunRef.current) {
      return
    }

    if (initialQuery.studentId && initialQuery.diff) {
      didAutoRunRef.current = true
      void runAudit({
        studentId: initialQuery.studentId,
        diff: initialQuery.diff,
        autoStartPuzzle: true,
      })
    }
  }, [initialQuery.diff, initialQuery.studentId, runAudit])

  useEffect(() => {
    if (!toastMessage) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage(null)
    }, 6000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [toastMessage])

  const showCleanCommit = step === 'audit' && auditResult && !auditResult.requires_puzzle

  return (
    <div className="space-y-4">
      {toastMessage ? (
        <div className="fixed right-4 top-4 z-50 max-w-sm rounded-md bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">
          {toastMessage}
        </div>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Student puzzle flow</h2>
        <p className="mt-1 text-sm text-slate-600">
          Provide a student ID and diff to run audit, generate puzzle, and verify.
        </p>

        <div className="mt-4 grid gap-3">
          <label className="text-sm font-medium text-slate-700">
            Student ID
            <input
              type="text"
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring"
              placeholder="alice"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Diff
            <textarea
              value={diff}
              onChange={(event) => setDiff(event.target.value)}
              className="mt-1 h-40 w-full rounded-md border border-slate-300 p-3 text-sm outline-none ring-indigo-200 focus:ring"
              placeholder="Paste git diff content..."
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              void runAudit()
            }}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            Run audit
          </button>
          {auditResult?.requires_puzzle ? (
            <button
              type="button"
              onClick={() => {
                void runPuzzle()
              }}
              className="rounded-md border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
            >
              Request puzzle
            </button>
          ) : null}
          <button
            type="button"
            onClick={clearSession}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Clear session
          </button>
        </div>
      </section>

      {inlineError ? <ErrorBanner message={inlineError} /> : null}
      {busyLabel ? <LoadingBlock label={busyLabel} /> : null}
      {auditResult ? <AuditSummary audit={auditResult} /> : null}

      {auditResult?.requires_proof_of_intent ? (
        <section className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          This commit exceeded the proof-of-intent threshold. Capture a clear intent
          statement before pushing.
        </section>
      ) : null}

      {showCleanCommit ? (
        <section className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-emerald-900">
          <h2 className="text-lg font-semibold">Clean commit — push allowed</h2>
          <p className="text-sm">No puzzle is required for this audit result.</p>
        </section>
      ) : null}

      {puzzleResult && step === 'puzzle' ? (
        <PuzzleCard
          puzzle={puzzleResult}
          answer={answer}
          onAnswerChange={setAnswer}
          onSubmit={() => {
            void runVerify()
          }}
          remainingSeconds={remainingPuzzleSeconds}
          disabled={busyLabel !== null}
        />
      ) : null}

      {verifyResult ? <VerifyResult result={verifyResult} /> : null}

      {lockoutSeconds !== null && lockoutSeconds > 0 ? (
        <LockoutOverlay
          lockoutSeconds={lockoutSeconds}
          onExpire={handleLockoutExpire}
        />
      ) : null}
    </div>
  )
}
