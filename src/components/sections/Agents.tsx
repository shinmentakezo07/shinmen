import { useEffect, useReducer, useRef, useState, type CSSProperties } from 'react'
import { CornerDownLeft, LoaderCircle } from 'lucide-react'
import { sendChat } from '@/lib/api'
import { SectionHead } from './SectionHead'
import { useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'
import { useTransitionState } from '@/lib/machine'

/*
  A small, honest assistant. It is a proxy to a model with a system prompt about
  Roshan — the point of the section is showing the *system* (a Go endpoint, a
  typed client, graceful degradation), not pretending the site is conscious.

  The console is built to make that visible: the pipeline strip shows which path
  an answer took (live model vs canned), each turn carries a provenance stamp,
  and canned answers arrive as ghost-typed text so the fallback reads as a
  fallback rather than a lie.

  ── The transcript machine ─────────────────────────────────────────────────
  The console's status is a small state machine, and it used to be implicit:

      idle ──submit──▶ pending
      pending ──reply──▶ idle (live if the newest answer is live, else canned)
      pending ──fail──▶ error ──retry──▶ pending
      pending ──abort──▶ idle            (browser fires 'abort' on timeout)

  What the implicit version could not express was the error channel: the row is
  genuinely a third visible state (the failure strip), so it now has a seat at
  the table. Every visual mode the header strip can show is one state.

  The pending → idle transition is *asynchronous*: dispatch happens when the
  fetch resolves, and the event carries the outcome, so the transition table is
  still pure. Reveal progress for canned answers stays in its own effect.
*/

interface Turn {
  id: number
  role: 'user' | 'assistant'
  text: string
  degraded?: boolean
}

export type AgentStatus = 'idle' | 'pending' | 'live' | 'canned' | 'error'

interface AgentState {
  status: AgentStatus
}

type AgentEvent =
  | { type: 'submit' }
  | { type: 'reply'; degraded: boolean }
  | { type: 'fail' }
  | { type: 'retry' }
  | { type: 'abort' }

export function agentReducer(state: AgentState, event: AgentEvent): AgentState {
  switch (event.type) {
    case 'submit':
      return state.status === 'pending' ? state : { status: 'pending' }
    case 'reply':
      return state.status === 'pending'
        ? { status: event.degraded ? 'canned' : 'live' }
        : state
    case 'fail':
      return state.status === 'pending' ? { status: 'error' } : state
    case 'retry':
      return state.status === 'error' ? { status: 'pending' } : state
    case 'abort':
      return state.status === 'pending' ? { ...state, status: 'idle' } : state
    default: {
      const unhandled: never = event
      return unhandled
    }
  }
}

/** Typed rate for a canned answer, in ms per tick of two runes. */
const TYPE_MS = 9

/**
 * Reveals canned text as though it were arriving from a model, so the fallback
 * reads as a fallback. Runs once per answer; reduced motion gets it whole.
 * The parent's setter is stable (a transition dispatch, not a fresh closure),
 * so a re-render cannot tear down and restart the interval mid-answer.
 */
function CannedAnswer({ text, onProgress }: { text: string; onProgress: (n: number) => void }) {
  const reduce = useReducedMotion()
  const report = useRef(onProgress)
  report.current = onProgress

  useEffect(() => {
    if (reduce) {
      report.current(text.length)
      return
    }
    let i = 0
    const id = window.setInterval(() => {
      i += 2
      const n = Math.min(i, text.length)
      report.current(n)
      if (n >= text.length) window.clearInterval(id)
    }, TYPE_MS)
    return () => window.clearInterval(id)
  }, [text, reduce])

  return null
}

const SUGGESTIONS = [
  { q: 'What is Roshan working on now?', intent: 'current' },
  { q: 'Show me the most technically interesting project.', intent: 'projects' },
  { q: 'Is he available for freelance work?', intent: 'availability' },
]


export function Agents() {
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [machine, dispatch] = useTransitionState<AgentState, AgentEvent>(
    { status: 'idle' },
    agentReducer,
  )
  const typed = useRef(new Map<number, number>())
  // Reveal progress lives in a ref (one map, no per-tick object churn); this
  // counter is what makes a tick visible to React.
  const [, bumpReveal] = useReducer((n: number) => n + 1, 0)
  const inputRef = useRef<HTMLInputElement>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const nextId = useRef(0)
  const controller = useRef<AbortController | null>(null)
  const lastAsked = useRef('')

  const status = machine.status
  const busy = status === 'pending'

  // An in-flight request outlives the section if the visitor scrolls away or
  // navigates; canceling on unmount stops the reply from landing nowhere.
  useEffect(() => () => controller.current?.abort(), [])

  async function ask(q: string) {
    controller.current?.abort()
    const ac = new AbortController()
    controller.current = ac
    lastAsked.current = q
    try {
      const res = await sendChat(q, ac.signal)
      const id = nextId.current++
      setTurns((t) => [...t, { id, role: 'assistant', text: res.reply, degraded: res.degraded }])
      dispatch({ type: 'reply', degraded: Boolean(res.degraded) })
    } catch (err) {
      // A browser timeout surfaces as an AbortError, not a server failure —
      // say what actually happened instead of blaming the endpoint.
      if (ac.signal.aborted) dispatch({ type: 'abort' })
      else dispatch({ type: 'fail' })
    } finally {
      if (controller.current === ac) controller.current = null
      inputRef.current?.focus()
    }
  }

  function submit(text: string) {
    const q = text.trim()
    if (!q || busy) return
    lastAsked.current = q
    setTurns((t) => [...t, { id: nextId.current++, role: 'user', text: q }])
    setInput('')
    dispatch({ type: 'submit' })
    void ask(q)
  }

  function retry() {
    if (status !== 'error' || !lastAsked.current) return
    dispatch({ type: 'retry' })
    void ask(lastAsked.current)
  }

  // Keep the newest turn in view without scrolling the page.
  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [turns, status])

  const mode = status

  return (
    <section
      id="agents"
      className="frame scroll-mt-20 border-b border-line py-16"
      aria-labelledby="agents-h"
      style={{ '--section-accent': 'var(--hue-agent)' } as CSSProperties}
    >
      <SectionHead
        id="agents-h"
        index={4}
        kicker="Agent"
        title="Ask about the work"
        note="Go proxy · model-backed, canned fallback"
      />

      <div className="grid gap-10 py-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] md:gap-14">
        <div>
          <p className="max-w-[38ch] text-0 leading-relaxed text-fg-soft">
            A small assistant that answers from the same source material as this
            site — behind a Go endpoint I wrote, with rate limiting and a cached
            fallback. When the model is unreachable it says so.
          </p>

          {/* Pipeline: the whole section's argument, stated as a strip */}
          <ol className="mt-7 space-y-px border-y border-line">
            {[
              ['01', 'prompt', 'typed client', 'var(--hue-ts)'],
              ['02', 'proxy', 'POST /api/chat · token bucket', 'var(--hue-go)'],
              ['03', 'answer', 'model, else canned + flagged', 'var(--hue-agent)'],
            ].map(([n, label, note, hue]) => (
              <li key={n} className="flex items-baseline gap-3 py-2.5">
                <span className="label text-[0.55rem] tabular">{n}</span>
                <span
                  className="font-mono text-[length:var(--step--1)] font-medium"
                  style={{ color: hue }}
                >
                  {label}
                </span>
                <span className="ml-1 h-px flex-1 bg-line" aria-hidden />
                <span className="label text-[0.55rem] text-right">{note}</span>
              </li>
            ))}
          </ol>

          <p className="label mt-7 mb-3">Start from a question</p>
          <ul className="space-y-1.5">
            {SUGGESTIONS.map((s) => (
              <li key={s.q}>
                <button
                  onClick={() => submit(s.q)}
                  disabled={busy}
                  className="group flex w-full items-baseline gap-3 border border-transparent px-2 py-1.5 text-left transition-colors duration-[var(--dur-1)] hover:border-line hover:bg-bg-raised disabled:opacity-40"
                >
                  <span
                    className="font-mono text-[0.65rem] text-fg-muted transition-colors group-hover:text-accent"
                    aria-hidden
                  >
                    ›
                  </span>
                  <span className="text-[length:var(--step--1)] leading-snug text-fg-soft transition-colors group-hover:text-fg">
                    {s.q}
                  </span>
                  <span className="label ml-auto shrink-0 text-[0.5rem] text-fg-muted/70 transition-colors group-hover:text-accent">
                    {s.intent}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Console ─────────────────────────────────────────────────── */}
        <div className="resume-console flex min-h-[24rem] flex-col border border-line bg-bg-raised">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
            <span className="flex items-center gap-2">
              <span
                className="resume-console-dot inline-block size-1.5 rounded-full"
                data-mode={mode}
                aria-hidden
              />
              <span className="label text-[0.6rem]">Transcript</span>
            </span>
            <span
              className="label text-[0.6rem]"
              style={mode === 'canned' ? { color: 'var(--accent)' } : undefined}
              aria-live="polite"
            >
              {mode === 'idle' && 'awaiting input'}
              {mode === 'pending' && 'generating…'}
              {mode === 'live' && 'live model'}
              {mode === 'canned' && 'canned fallback'}
              {mode === 'error' && 'endpoint unreachable'}
            </span>
          </div>

          <div
            ref={logRef}
            className="flex-1 space-y-5 overflow-y-auto p-4"
            aria-live="polite"
            aria-label="Conversation transcript"
          >
            {turns.length === 0 && (
              <div className="font-mono text-[length:var(--step--1)] leading-relaxed text-fg-muted">
                <p>
                  <span className="text-accent">›</span> session ready
                </p>
                <p className="text-fg-muted/70">
                  <span className="text-accent">›</span> ask about the projects above
                  <span className="resume-caret" aria-hidden />
                </p>

                {/* Session spec instead of an empty well: what this thing is,
                    stated in the same voice as the transcript. */}
                <dl className="mt-6 grid grid-cols-[5rem_1fr] gap-x-4 gap-y-2 border-t border-line pt-4 text-[0.62rem] uppercase tracking-[0.1em]">
                  {[
                    ['endpoint', 'POST /api/chat'],
                    ['limit', '10 / min · burst 5 per IP'],
                    ['model', 'OpenAI-compatible, if configured'],
                    ['fallback', 'canned + flagged degraded'],
                  ].map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-fg-muted/60">{k}</dt>
                      <dd className="normal-case tracking-normal text-fg-soft">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {turns.map((t) =>
              t.role === 'user' ? (
                <div key={t.id} className="flex items-baseline gap-3">
                  <span className="label shrink-0 text-[0.55rem]">You</span>
                  <p className="text-0 leading-relaxed text-fg">{t.text}</p>
                </div>
              ) : (
                <div key={t.id} className="resume-turn">
                  <div className="flex items-baseline gap-3">
                    <span className="label shrink-0 text-[0.55rem]" style={{ color: 'var(--hue-agent)' }}>
                      RK
                    </span>
                    <div className="min-w-0">
                      <p
                        className={cn(
                          'resume-answer whitespace-pre-wrap text-0 leading-relaxed',
                          t.degraded ? 'text-fg-soft' : 'text-fg',
                        )}
                      >
                        {t.degraded && typed.current.get(t.id) !== undefined
                          ? t.text.slice(0, typed.current.get(t.id))
                          : t.text}
                        {t.degraded &&
                          typed.current.get(t.id) !== undefined &&
                          typed.current.get(t.id)! < t.text.length && (
                            <span className="resume-caret" aria-hidden />
                          )}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="label text-[0.5rem]">
                          {t.degraded ? 'canned · no model' : 'model · live'}
                        </span>
                        <span className="h-2.5 w-px bg-line" aria-hidden />
                        <span className="label text-[0.5rem]">
                          {t.degraded ? 'same source as case studies' : 'system prompt, no invention'}
                        </span>
                      </div>
                    </div>
                  </div>
                  {t.degraded && (
                    <CannedAnswer
                      text={t.text}
                      onProgress={(n) => {
                        if (typed.current.get(t.id) === n) return
                        typed.current.set(t.id, n)
                        bumpReveal() // one re-render per revealed tick step
                      }}
                    />
                  )}
                </div>
              ),
            )}

            {busy && (
              <div className="flex items-baseline gap-3">
                <span className="label shrink-0 text-[0.55rem]">RK</span>
                <LoaderCircle className="size-3.5 animate-spin text-fg-muted" aria-label="Thinking" />
              </div>
            )}
            {status === 'error' && (
              <div
                role="alert"
                className="border-l-2 border-accent pl-3 text-[length:var(--step--1)] text-accent"
              >
                <p>
                  The assistant endpoint is not responding. The rest of the site is
                  unaffected.
                </p>
                <button
                  type="button"
                  onClick={retry}
                  className="label mt-1.5 text-[0.55rem] underline underline-offset-2 hover:text-fg"
                >
                  Retry the last question
                </button>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              submit(input)
            }}
            className="flex items-center gap-3 border-t border-line px-4"
          >
            <span className="font-mono text-accent" aria-hidden>
              ›
            </span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a question…"
              maxLength={2000}
              className="h-12 w-full bg-transparent font-mono text-[length:var(--step--1)] outline-none placeholder:text-fg-muted"
              disabled={busy}
              aria-label="Ask the assistant"
            />
            <span className="label hidden shrink-0 text-[0.5rem] tabular sm:block" aria-hidden>
              {input.length > 0 ? `${input.length}/2000` : '⏎'}
            </span>
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="flex size-8 shrink-0 items-center justify-center text-fg-muted transition-colors hover:text-accent disabled:opacity-30"
              aria-label="Send question"
            >
              <CornerDownLeft className="size-4" aria-hidden />
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
