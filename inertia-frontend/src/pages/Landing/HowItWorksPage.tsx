import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ThemeToggle } from '../../components/common/ThemeToggle'

/* ── Scene 1: Terminal with typing animation ────────────── */
function Scene1Terminal() {
  const [cmdText, setCmdText] = useState('')
  const [outputLines, setOutputLines] = useState<Array<{ text: string; color: string }>>([])
  const [showCursor, setShowCursor] = useState(true)
  const aliveRef = useRef(false)
  const hasRunRef = useRef(false)

  const OUTPUT = [
    { text: 'Running pre-push hook...', color: '#807a68' },
    { text: '→ POST /audit · 84 lines · Fc=92', color: '#807a68' },
    { text: '⚠  HIGH INERTIA DETECTED', color: '#f4c430' },
    { text: '✗  push blocked — proof-of-thought required', color: '#e8917c' },
    { text: '→ opening browser · token tok_9f4a1e2b7c', color: '#807a68' },
  ]
  const CMD = 'git push origin feature/dijkstra-v3'

  function start() {
    if (hasRunRef.current) return
    hasRunRef.current = true
    aliveRef.current = true

    const sleep = (ms: number) => new Promise<void>(res => setTimeout(res, ms))

    async function run() {
      await sleep(400)
      // type command char by char
      for (let i = 1; i <= CMD.length; i++) {
        if (!aliveRef.current) return
        setCmdText(CMD.slice(0, i))
        await sleep(40 + Math.random() * 40)
      }
      await sleep(300)
      setShowCursor(false)
      // output lines staggered
      for (let i = 0; i < OUTPUT.length; i++) {
        if (!aliveRef.current) return
        await sleep(380)
        setOutputLines(prev => [...prev, OUTPUT[i]])
      }
    }

    void run()
  }

  useEffect(() => {
    return () => { aliveRef.current = false }
  }, [])

  return { cmdText, outputLines, showCursor, start }
}

/* ── Main page ───────────────────────────────────────────── */
export function HowItWorksPage() {
  const scrollyRef = useRef<HTMLDivElement>(null)
  const [activeScene, setActiveScene] = useState(0)
  const term = Scene1Terminal()
  const termStartedRef = useRef(false)

  function scrollToScene(i: number) {
    const el = scrollyRef.current
    if (!el) return
    const total = el.offsetHeight - window.innerHeight
    // center of each scene bucket + small nudge so floor() lands on i
    const target = el.offsetTop + (i / 5) * total + total / 10
    window.scrollTo({ top: target, behavior: 'smooth' })
  }

  useEffect(() => {
    const onScroll = () => {
      const el = scrollyRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const total = el.offsetHeight - window.innerHeight
      if (total <= 0) return
      const progressed = Math.max(0, Math.min(total, -r.top))
      const idx = Math.min(4, Math.floor((progressed / total) * 5))
      setActiveScene(idx)

      // Start terminal animation when pinned and on scene 0
      if (idx === 0 && r.top <= 0 && r.bottom >= window.innerHeight && !termStartedRef.current) {
        termStartedRef.current = true
        term.start()
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const STEPS = [
    { n: '01', title: 'git push', desc: 'student runs command' },
    { n: '02', title: 'Intercept', desc: 'hook → backend → auditor' },
    { n: '03', title: 'Puzzle appears', desc: 'claude writes from your diff' },
    { n: '04', title: 'Verify', desc: 'answer → jwt proof-of-thought' },
    { n: '05', title: 'Push proceeds', desc: 'commit leaves the machine' },
  ]

  const sceneStyle = (i: number): React.CSSProperties => ({
    position: 'absolute' as const,
    inset: 0,
    padding: '48px 64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: activeScene === i ? 1 : 0,
    transform: activeScene === i ? 'translateY(0)' : 'translateY(28px)',
    pointerEvents: activeScene === i ? 'auto' : 'none',
    transition: 'opacity 0.55s ease, transform 0.55s ease',
  })

  return (
    <div style={{ background: 'var(--paper)', color: 'var(--ink)', minHeight: '100vh', fontFamily: 'var(--ui)' }}>
      <style>{`
        @keyframes hiw-blink { 50% { opacity: 0; } }
        .hiw-cursor { display: inline-block; width: 9px; height: 1em; background: #e4dfcf; vertical-align: text-bottom; margin-left: 1px; animation: hiw-blink 1.05s step-end infinite; }
        @keyframes hiw-chug { 0% { left: -30%; } 100% { left: 100%; } }
        .hiw-chug { position: absolute; top: 0; height: 100%; width: 30%; background: var(--pass); animation: hiw-chug 2.4s linear infinite; }
        .hiw-rail-step { transition: opacity 0.35s ease; }
        .hiw-rail-step.on { opacity: 1 !important; }
      `}</style>

      {/* Nav */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 28px',
        background: 'rgba(244,240,230,0.92)', backdropFilter: 'blur(8px)',
        borderBottom: '1px solid var(--ink)',
        fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
      }} className="landing-nav">
        <Link to="/" style={{ textDecoration: 'none', color: 'var(--ink)', fontFamily: 'var(--serif)', fontSize: 18, fontStyle: 'italic', textTransform: 'none', letterSpacing: 0 }}>
          Inertia.edu
        </Link>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link to="/dashboard" style={{
            display: 'inline-flex', alignItems: 'center', padding: '8px 14px',
            background: 'transparent', color: 'var(--ink)', textDecoration: 'none',
            fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
            border: '1px solid var(--ink)', transition: 'background .15s, color .15s',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--ink)'; (e.currentTarget as HTMLElement).style.color = 'var(--paper)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--ink)'; }}
          >Dashboard</Link>
          <Link to="/student" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px',
            background: 'var(--ink)', color: 'var(--paper)', textDecoration: 'none',
            fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
            border: '1px solid var(--ink)', transition: 'background .15s, color .15s',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--caution)'; (e.currentTarget as HTMLElement).style.color = 'var(--ink)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--ink)'; (e.currentTarget as HTMLElement).style.color = 'var(--paper)'; }}
          >Student →</Link>
          <ThemeToggle />
        </div>
      </nav>

      {/* Page intro */}
      <div style={{ paddingTop: 56 }}>
        {/* Header strip */}
        <div style={{
          padding: '18px 48px', borderBottom: '1px solid var(--ink)',
          background: 'var(--paper-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>// 02 · How It Works</span>
          <span style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--ink-muted)' }}>Scroll to walk the loop</span>
        </div>

        {/* Intro */}
        <div style={{ padding: '72px 48px 80px', textAlign: 'center', borderBottom: '1px solid var(--paper-line)' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>● end to end · five moments</div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(44px,6vw,84px)', letterSpacing: '-0.02em', margin: '16px auto 0', lineHeight: 1.05, fontWeight: 400 }}>
            Watch a push get <em style={{ fontStyle: 'italic', color: 'var(--ink-2)' }}>intercepted.</em>
          </h1>
          <p style={{ fontSize: 14, color: 'var(--ink-muted)', marginTop: 20, maxWidth: '60ch', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.75 }}>
            Five scenes, pinned to your scroll. A real student runs a real push — the hook fires, the backend measures, Claude generates a puzzle from their own code, the answer is verified, and a signed JWT unblocks the commit.
          </p>
          <div style={{ marginTop: 28, display: 'flex', gap: 32, justifyContent: 'center', alignItems: 'center' }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-muted)', opacity: 0.7 }}>
                <span style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink)' }}>{s.n}</span>
                {s.title}
                {i < 4 && <span style={{ marginLeft: 8, color: 'var(--paper-line)' }}>·</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 500vh scrolly container ── */}
      <div ref={scrollyRef} style={{ height: '500vh', position: 'relative' }}>
        <div style={{
          position: 'sticky', top: 0, height: '100vh',
          display: 'flex',
          borderTop: '1px solid var(--ink)', borderBottom: '1px solid var(--ink)',
          overflow: 'hidden',
        }}>

          {/* Left rail */}
          <div style={{
            width: 260, flexShrink: 0,
            background: 'var(--paper-2)', borderRight: '1px solid var(--ink)',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ padding: '28px 24px 14px', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-muted)', borderBottom: '1px solid var(--paper-line)' }}>
              // SEQUENCE
            </div>
            {STEPS.map((step, i) => (
              <button
                key={i}
                type="button"
                onClick={() => scrollToScene(i)}
                style={{
                  width: '100%', textAlign: 'left', background: 'none', border: 'none',
                  padding: '20px 24px', borderBottom: '1px solid var(--paper-line)',
                  opacity: activeScene === i ? 1 : 0.28,
                  transition: 'opacity 0.35s ease, background 0.15s',
                  cursor: 'pointer',
                  fontFamily: 'var(--ui)',
                }}
                onMouseEnter={e => { if (activeScene !== i) (e.currentTarget as HTMLElement).style.opacity = '0.65' }}
                onMouseLeave={e => { if (activeScene !== i) (e.currentTarget as HTMLElement).style.opacity = '0.28' }}
              >
                <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: activeScene === i ? 'var(--caution-deep)' : 'var(--ink-muted)' }}>
                  {step.n} / 05
                </div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 22, marginTop: 5, color: 'var(--ink)', lineHeight: 1.2 }}>{step.title}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 4 }}>{step.desc}</div>
                {activeScene === i && (
                  <div style={{ marginTop: 10, height: 2, background: 'var(--ink)', width: '40%' }} />
                )}
              </button>
            ))}
            <div style={{ flex: 1, borderBottom: '1px solid var(--paper-line)' }} />
            <div style={{ padding: '16px 24px', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
              scene {activeScene + 1} / 5
            </div>
          </div>

          {/* Stage */}
          <div style={{ flex: 1, position: 'relative', background: 'var(--paper)', overflow: 'hidden' }}>

            {/* ── Scene 1: git push terminal ── */}
            <div style={sceneStyle(0)}>
              <div style={{ maxWidth: 740, width: '100%' }}>
                <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 16 }}>
                  // 01 / student runs git push
                </div>
                {/* Terminal */}
                <div style={{
                  background: '#0e0e0c',
                  border: '1px solid #2a2a24',
                  boxShadow: '14px 14px 0 var(--ink)',
                  overflow: 'hidden',
                }}>
                  {/* Title bar */}
                  <div style={{ background: '#1a1a16', borderBottom: '1px solid #2a2a24', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(['#d7402c', '#f4c430', '#a7d98a'] as const).map((c, i) => (
                        <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
                      ))}
                    </div>
                    <span style={{ flex: 1, marginLeft: 4, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#807a68' }}>
                      sazid@du — ~/graph-hw
                    </span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#e6c66a' }}>⎇ feature/dijkstra-v3</span>
                  </div>
                  {/* Body */}
                  <div style={{ padding: '28px 32px 32px', fontFamily: "'JetBrains Mono', monospace", fontSize: 15, lineHeight: 1.8, minHeight: 260 }}>
                    {/* Prompt line */}
                    <div>
                      <span style={{ color: '#a7d98a' }}>sazid@du</span>
                      <span style={{ color: '#e4dfcf' }}> : </span>
                      <span style={{ color: '#6fb2e6' }}>~/graph-hw</span>
                      <span style={{ color: '#e6c66a' }}> $ </span>
                      <span style={{ color: '#e4dfcf' }}>{term.cmdText}</span>
                      {term.showCursor && <span className="hiw-cursor" />}
                    </div>
                    {/* Output lines */}
                    {term.outputLines.map((line, i) => (
                      <div key={i} style={{ color: line.color, marginTop: i === 0 ? 12 : 0 }}>{line.text}</div>
                    ))}
                  </div>
                  {/* Footer */}
                  <div style={{ background: '#1a1a16', borderTop: '1px solid #2a2a24', padding: '8px 14px', display: 'flex', gap: 16, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#807a68' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#d7402c', boxShadow: '0 0 0 2px rgba(215,64,44,0.3)' }} />
                      LIVE
                    </span>
                    <span>PRE-PUSH HOOK</span>
                    <span style={{ flex: 1 }} />
                    <span>HS256 / JWT</span>
                  </div>
                </div>
                <p style={{ marginTop: 20, fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.7, maxWidth: '60ch' }}>
                  The moment a student types <span style={{ background: 'var(--ink)', color: 'var(--paper)', padding: '1px 7px', fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>git push</span>, the pre-push hook intercepts the commit before it leaves the machine.
                </p>
              </div>
            </div>

            {/* ── Scene 2: Intercept diagram ── */}
            <div style={sceneStyle(1)}>
              <div style={{ maxWidth: 740, width: '100%' }}>
                <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 12 }}>
                  // 02 / PRE-PUSH HOOK FIRED
                </div>
                <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(38px,5vw,64px)', margin: '0 0 28px', lineHeight: 1, fontWeight: 400 }}>
                  The push hits a <span style={{ color: 'var(--signal)', fontStyle: 'italic' }}>wall.</span>
                </h2>
                {/* Node diagram */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 44px 1fr 44px 1fr', alignItems: 'center', marginBottom: 20 }}>
                  {([
                    { tier: 'tier · 1', name: 'pre-push', sub: 'bash hook', bg: 'var(--ink)', fg: 'var(--paper)', border: 'var(--ink)' },
                    null,
                    { tier: 'tier · 2', name: 'FastAPI', sub: 'auditor · AST', bg: 'var(--paper)', fg: 'var(--ink)', border: 'var(--ink)' },
                    null,
                    { tier: 'tier · 3', name: 'Claude', sub: 'sonnet-4 / puzzle', bg: 'var(--caution)', fg: 'var(--ink)', border: 'var(--ink)' },
                  ] as const).map((item, i) => {
                    if (!item) return (
                      <div key={i} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, color: 'var(--signal)', textAlign: 'center' }}>→</div>
                    )
                    return (
                      <div key={i} style={{ border: `1px solid ${item.border}`, background: item.bg, color: item.fg, padding: '22px 20px', aspectRatio: '1.3 / 1', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.65 }}>{item.tier}</div>
                        <div style={{ fontFamily: 'var(--serif)', fontSize: 26, marginTop: 4 }}>{item.name}</div>
                        <div style={{ fontSize: 10, opacity: 0.65, marginTop: 4 }}>{item.sub}</div>
                      </div>
                    )
                  })}
                </div>
                {/* Hazard stripe */}
                <div style={{ background: 'repeating-linear-gradient(45deg,var(--signal) 0 14px,var(--ink) 14px 28px)', padding: '11px 16px', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, textTransform: 'uppercase', color: '#fff', letterSpacing: '0.1em', marginBottom: 16 }}>
                  ⚠ HIGH INERTIA · PROOF-OF-THOUGHT REQUIRED
                </div>
                {/* Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', border: '1px solid var(--ink)' }}>
                  {[
                    { label: 'L · lines', value: '84', hi: false },
                    { label: 'R · recursion', value: '2', hi: false },
                    { label: 'N · nesting', value: '4', hi: false },
                    { label: 'Fc · score', value: '92', hi: true },
                  ].map((item, i) => (
                    <div key={i} style={{ padding: '14px 16px', borderRight: i < 3 ? '1px solid var(--ink)' : undefined }}>
                      <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>{item.label}</div>
                      <div style={{ fontFamily: 'var(--serif)', fontSize: 28, color: item.hi ? 'var(--signal)' : 'var(--ink)', marginTop: 4 }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Scene 3: Puzzle appears ── */}
            <div style={sceneStyle(2)}>
              <div style={{ maxWidth: 840, width: '100%', display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 28, alignItems: 'center' }}>
                {/* Puzzle card */}
                <div style={{ border: '1px solid var(--ink)', background: 'var(--paper)', padding: '28px 32px', boxShadow: '8px 8px 0 var(--ink)' }}>
                  <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--caution-deep)', marginBottom: 16 }}>
                    // puzzle · generated from your diff · 180s
                  </div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 28, lineHeight: 1.25, marginBottom: 18 }}>
                    What is{' '}
                    <span style={{ background: 'var(--ink)', color: 'var(--paper)', padding: '0 7px', fontFamily: "'JetBrains Mono', monospace", fontSize: 17 }}>distances['D']</span>
                    {' '}after the second{' '}
                    <span style={{ background: 'var(--ink)', color: 'var(--paper)', padding: '0 7px', fontFamily: "'JetBrains Mono', monospace", fontSize: 17 }}>while</span>
                    {' '}iteration?
                  </div>
                  <div style={{ background: 'var(--paper-2)', borderLeft: '3px solid var(--ink)', padding: '12px 14px', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, whiteSpace: 'pre-wrap', color: 'var(--ink)', marginBottom: 18, lineHeight: 1.7 }}>{`graph = {
  'A': {'B': 1, 'C': 4},
  'B': {'C': 2, 'D': 5},
  'C': {'D': 1},  'D': {}
}
distances = {v: float('inf') for v in graph}
distances['A'] = 0`}</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'var(--ink-muted)', borderTop: '1px solid var(--paper-line)', paddingTop: 12 }}>
                    {'> '}<span style={{ opacity: 0.4 }}>_ waiting for answer</span>
                  </div>
                </div>
                {/* Timer ring */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                  <div style={{ position: 'relative', width: 200, height: 200 }}>
                    <svg width="200" height="200" viewBox="0 0 200 200">
                      <circle cx="100" cy="100" r="88" fill="none" stroke="var(--paper-line)" strokeWidth="6" />
                      <circle cx="100" cy="100" r="88" fill="none" stroke="var(--ink)" strokeWidth="6"
                        strokeDasharray="553" strokeDashoffset="138"
                        strokeLinecap="square" transform="rotate(-90 100 100)" />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ fontFamily: 'var(--serif)', fontSize: 54, lineHeight: 1 }}>2:15</div>
                      <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginTop: 6 }}>time left · hard</div>
                    </div>
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--ink-muted)', textAlign: 'center', lineHeight: 2 }}>
                    // cannot be googled<br />// the question is your code
                  </div>
                  <div style={{ border: '1px solid var(--caution)', background: 'transparent', padding: '8px 16px', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--caution-deep)', textAlign: 'center' }}>
                    ⚡ generated in 1.3s
                  </div>
                </div>
              </div>
            </div>

            {/* ── Scene 4: Verify ── */}
            <div style={sceneStyle(3)}>
              <div style={{ maxWidth: 740, width: '100%' }}>
                <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--pass-deep)', marginBottom: 12 }}>
                  // 04 / POST /verify · 200 OK
                </div>
                <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(38px,5vw,68px)', margin: '0 0 24px', lineHeight: 1.05, fontWeight: 400 }}>
                  The answer checks out.{' '}
                  <em style={{ fontStyle: 'italic', color: 'var(--pass)' }}>A token is issued.</em>
                </h2>
                {/* JWT */}
                <div style={{ background: 'var(--ink)', color: 'var(--paper)', padding: '20px 24px', fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, wordBreak: 'break-all', boxShadow: '10px 10px 0 var(--caution)', lineHeight: 1.8, marginBottom: 20 }}>
                  <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 8 }}>proof-of-thought token</div>
                  <span style={{ color: 'var(--caution)' }}>eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9</span>
                  <span>.</span>
                  <span style={{ color: '#a7d98a' }}>eyJzdHVkZW50X2lkIjoic2F6aWQiLCJwcm9qZWN0X2lkIjoiY3NlMTA0IiwiZmNfc2NvcmUiOjkyLCJzb2x2ZV90aW1lIjo4NywidmVyaWZpZWQiOnRydWV9</span>
                  <span>.</span>
                  <span style={{ color: '#e8917c' }}>xK9mP2vL4nQ8rT6wY1uA3sF7hJ0dC5bE</span>
                </div>
                {/* Readout */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', border: '1px solid var(--ink)', marginBottom: 20 }}>
                  {[
                    { label: 'solve time', value: '1:27' },
                    { label: 'attempt', value: '#1' },
                    { label: 'trace accuracy', value: '0.91' },
                  ].map((item, i) => (
                    <div key={i} style={{ padding: '14px 16px', borderRight: i < 2 ? '1px solid var(--ink)' : undefined }}>
                      <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>{item.label}</div>
                      <div style={{ fontFamily: 'var(--serif)', fontSize: 28, color: 'var(--ink)', marginTop: 4 }}>{item.value}</div>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.7, margin: 0 }}>
                  The JWT is attached to the commit metadata. Every future audit can verify that a human traced this exact code — not later, not after a hint — <em>right then</em>.
                </p>
              </div>
            </div>

            {/* ── Scene 5: Push proceeds ── */}
            <div style={sceneStyle(4)}>
              <div style={{ maxWidth: 740, width: '100%' }}>
                <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--pass-deep)', marginBottom: 16 }}>
                  // 05 / COMMIT LEAVES THE MACHINE
                </div>
                <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(56px,7vw,108px)', margin: '0 0 28px', lineHeight: 0.95, fontWeight: 400 }}>
                  Push <em style={{ fontStyle: 'italic', color: 'var(--ink-2)' }}>proceeding.</em>
                </h2>
                {/* Progress bar */}
                <div style={{ position: 'relative', height: 4, background: 'var(--ink)', overflow: 'hidden', marginBottom: 40 }}>
                  <div className="hiw-chug" />
                </div>
                {/* Before / After */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, border: '1px solid var(--ink)', marginBottom: 24 }}>
                  <div style={{ padding: '20px 24px', borderRight: '1px solid var(--ink)' }}>
                    <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 10 }}>// before</div>
                    <div style={{ fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.75 }}>
                      student wrote 84 lines of Dijkstra and ran{' '}
                      <span style={{ background: 'var(--ink)', color: 'var(--paper)', padding: '0 6px', fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>git push</span>.
                      {' '}no evidence they understood it.
                    </div>
                  </div>
                  <div style={{ padding: '20px 24px' }}>
                    <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--pass-deep)', marginBottom: 10 }}>// after</div>
                    <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.75 }}>
                      they traced the variable state through two iterations of their own loop. the trace is attached to the commit.
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <Link to="/student" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 20px',
                    background: 'var(--ink)', color: 'var(--paper)', textDecoration: 'none',
                    fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
                    border: '1px solid var(--ink)', transition: 'background .15s',
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--caution)'; (e.currentTarget as HTMLElement).style.color = 'var(--ink)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--ink)'; (e.currentTarget as HTMLElement).style.color = 'var(--paper)'; }}
                  >Try student flow →</Link>
                  <Link to="/" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 20px',
                    background: 'transparent', color: 'var(--ink)', textDecoration: 'none',
                    fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
                    border: '1px solid var(--ink)', transition: 'background .15s',
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--ink)'; (e.currentTarget as HTMLElement).style.color = 'var(--paper)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--ink)'; }}
                  >← Back to home</Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Bottom spacer / footer */}
      <footer style={{ background: 'var(--paper-2)', padding: '24px 48px', borderTop: '1px solid var(--paper-line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
        <span>Inertia.edu</span>
        <span>Friction is the feature.</span>
      </footer>
    </div>
  )
}
