import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getPuzzle } from '../../api/puzzle'
import { verifyAnswer } from '../../api/verify'
import { LockoutOverlay } from '../../components/student/LockoutOverlay'
import { PuzzleCard } from '../../components/student/PuzzleCard'
import { VerifyResult } from '../../components/student/VerifyResult'
import { useCountdown } from '../../hooks/useCountdown'
import type { PublicPuzzleResponse, VerifyResponse } from '../../types'
import { handleApiError, type HandledApiError } from '../../utils/error'

type StudentStep = 'idle' | 'puzzle' | 'verify' | 'success'

export function StudentPage() {
  const [searchParams] = useSearchParams()
  const tokenId = searchParams.get('token')

  const [puzzleResult, setPuzzleResult] = useState<PublicPuzzleResponse | null>(null)
  const [answer, setAnswer] = useState('')
  const [step, setStep] = useState<StudentStep>('idle')
  const [verifyResult, setVerifyResult] = useState<VerifyResponse | null>(null)
  const [inlineError, setInlineError] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [lockoutSeconds, setLockoutSeconds] = useState<number | null>(null)
  const [busyLabel, setBusyLabel] = useState<string | null>(null)

  const applyHandledError = useCallback((handled: HandledApiError) => {
    setInlineError(handled.inlineMessage)
    setToastMessage(handled.toastMessage)
    if (handled.lockoutSeconds !== null) setLockoutSeconds(handled.lockoutSeconds)
  }, [])

  useEffect(() => {
    if (!tokenId) {
      setInlineError('No token provided in the URL. Please construct from the pre-push hook link.')
      return
    }

    const loadPuzzle = async () => {
      setBusyLabel('Loading puzzle…')
      try {
        const p = await getPuzzle(tokenId)
        setPuzzleResult(p)
        setStep('puzzle')
      } catch (error) {
        applyHandledError(handleApiError(error))
      } finally {
        setBusyLabel(null)
      }
    }
    void loadPuzzle()
  }, [tokenId, applyHandledError])

  const runVerify = useCallback(async () => {
    if (!tokenId || !puzzleResult) return
    const a = answer.trim()
    if (!a) { setInlineError('Provide an answer.'); return }

    setBusyLabel('Verifying…')
    setInlineError(null)
    try {
      const verification = await verifyAnswer(tokenId, puzzleResult.student_id, a)
      setVerifyResult(verification)
      if (verification.success) {
        setStep('success')
      } else {
        setStep('verify')
        if (verification.lockout_seconds !== null) {
          setLockoutSeconds(verification.lockout_seconds)
        }
      }
    } catch (error) {
      const handled = handleApiError(error)
      applyHandledError(handled)
    } finally {
      setBusyLabel(null)
    }
  }, [answer, applyHandledError, puzzleResult, tokenId])

  const handlePuzzleExpire = useCallback(() => {
    setInlineError('Time ran out. Please try pushing your commit again.')
    setPuzzleResult(null)
    setStep('idle')
  }, [])

  const handleLockoutExpire = useCallback(() => {
    setLockoutSeconds(null)
  }, [])

  const puzzleSeconds = puzzleResult?.timer_seconds ?? 0
  const remainingPuzzleSeconds = useCountdown(puzzleSeconds, handlePuzzleExpire)

  useEffect(() => {
    if (!toastMessage) return
    const id = window.setTimeout(() => setToastMessage(null), 6000)
    return () => window.clearTimeout(id)
  }, [toastMessage])

  return (
    <div className="paper-bg" style={{ minHeight: '100vh', fontFamily: 'var(--ui)' }}>
      {toastMessage && (
        <div style={{
          position: 'fixed', right: 20, top: 20, zIndex: 60,
          background: 'var(--ink)', color: 'var(--paper)',
          padding: '12px 18px', fontFamily: 'var(--ui)', fontSize: 12,
          border: '1px solid var(--ink)', boxShadow: '4px 4px 0 var(--signal)',
          maxWidth: 320,
        }}>
          {toastMessage}
        </div>
      )}

      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 40,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 28px',
        background: 'rgba(244,240,230,0.95)', backdropFilter: 'blur(6px)',
        borderBottom: '1px solid var(--ink)',
      }}>
        <Link to="/" style={{ textDecoration: 'none', color: 'var(--ink)' }}>
          <span style={{ fontFamily: 'var(--serif)', fontSize: 18, fontStyle: 'italic' }}>Inertia.edu</span>
          <span style={{ marginLeft: 10, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
            / Verification
          </span>
        </Link>
      </nav>

      <main style={{ maxWidth: 780, margin: '0 auto', padding: '32px 24px 80px' }}>
        {inlineError && (
          <div style={{
            border: '1px solid var(--signal)', background: 'rgba(215,64,44,0.08)',
            padding: '10px 14px', marginBottom: 16,
            fontFamily: 'var(--ui)', fontSize: 12, color: 'var(--signal)',
          }}>
            {inlineError}
          </div>
        )}

        {busyLabel && (
          <div style={{
            padding: '10px 14px', marginBottom: 16,
            fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: 'var(--ink-muted)',
            borderLeft: '3px solid var(--caution)',
          }}>
            {busyLabel}
          </div>
        )}

        {step === 'success' && (
          <div style={{
            border: '2px solid var(--pass)', boxShadow: '4px 4px 0 var(--ink)',
            marginBottom: 20, background: 'var(--paper)', padding: 32, textAlign: 'center'
          }}>
            <h2 style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 28, margin: '0 0 16px 0', color: 'var(--pass)' }}>
              ✅ Verification Complete
            </h2>
            <p style={{ fontFamily: 'var(--ui)', fontSize: 14, color: 'var(--ink-muted)' }}>
              You may now close this window and return to your terminal. Your code push will automatically proceed.
            </p>
          </div>
        )}

        {puzzleResult && (step === 'puzzle' || step === 'verify') && (
          <div style={{ marginBottom: 20 }}>
            <PuzzleCard
              puzzle={{ token_id: tokenId!, ...puzzleResult }}
              answer={answer}
              onAnswerChange={setAnswer}
              onSubmit={() => { void runVerify() }}
              remainingSeconds={remainingPuzzleSeconds}
              disabled={busyLabel !== null}
            />
          </div>
        )}

        {verifyResult && step !== 'success' && (
          <VerifyResult result={verifyResult} />
        )}
      </main>

      {lockoutSeconds !== null && lockoutSeconds > 0 && (
        <LockoutOverlay lockoutSeconds={lockoutSeconds} onExpire={handleLockoutExpire} />
      )}
    </div>
  )
}
