import { useRef, useState, type CSSProperties } from 'react'
import { CornerDownLeft, LoaderCircle } from 'lucide-react'
import { sendChat } from '@/lib/api'
import { SectionHead } from './SectionHead'

/*
  A small, honest assistant. It is a proxy to a model with a system prompt about
  Roshan — the point of the section is showing the *system* (a Go endpoint, a
  typed client, graceful degradation), not pretending the site is conscious.
  If the API is offline it says so instead of inventing an answer.
*/

interface Turn {
  role: 'user' | 'assistant'
  text: string
  degraded?: boolean
}

const SUGGESTIONS = [
  'What is Roshan working on now?',
  'Show me the most technically interesting project.',
  'Is he available for freelance work?',
]

export function Agents() {
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function submit(text: string) {
    const q = text.trim()
    if (!q || busy) return
    setTurns((t) => [...t, { role: 'user', text: q }])
    setInput('')
    setBusy(true)
    setError(null)
    try {
      const res = await sendChat(q)
      setTurns((t) => [...t, { role: 'assistant', text: res.reply, degraded: res.degraded }])
    } catch {
      setError('The assistant endpoint is not responding. The rest of the site is unaffected.')
    } finally {
      setBusy(false)
      inputRef.current?.focus()
    }
  }

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

      <div className="grid gap-8 py-12 md:grid-cols-[1fr_1.4fr] md:gap-16">
        <div className="space-y-4">
          <p className="text-0 text-fg-soft">
            A small assistant that answers questions about my work from the same
            source material as this site. It runs behind a Go endpoint I wrote,
            with rate limiting and a cached fallback.
          </p>
          <ul className="space-y-2">
            {SUGGESTIONS.map((s) => (
              <li key={s}>
                <button
                  onClick={() => submit(s)}
                  className="w-full border border-line px-3 py-2 text-left font-mono text-[length:var(--step--1)] text-fg-muted transition-colors hover:border-accent hover:text-accent"
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex min-h-[22rem] flex-col border border-line bg-bg-raised">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="label">Transcript</span>
            <span className="label text-[0.6rem] text-fg-muted">
              {turns.length === 0 ? 'Awaiting input' : `${turns.length} turns`}
            </span>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
            {turns.length === 0 && (
              <p className="font-mono text-[length:var(--step--1)] text-fg-muted">
                <span className="text-accent">›</span> Ask anything about the projects above.
              </p>
            )}
            {turns.map((t, i) => (
              <div key={i} className="grid grid-cols-[3.5rem_1fr] gap-3">
                <span className="label pt-0.5 text-[0.6rem]">{t.role === 'user' ? 'You' : 'RK'}</span>
                <p
                  className={
                    t.role === 'user'
                      ? 'text-0 text-fg'
                      : 'whitespace-pre-wrap text-0 text-fg-soft'
                  }
                >
                  {t.text}
                  {t.degraded && (
                    <span className="ml-2 font-mono text-[0.65rem] uppercase tracking-wider text-accent">
                      [offline answer]
                    </span>
                  )}
                </p>
              </div>
            ))}
            {busy && (
              <div className="grid grid-cols-[3.5rem_1fr] gap-3">
                <span className="label pt-0.5 text-[0.6rem]">RK</span>
                <LoaderCircle className="size-4 animate-spin text-fg-muted" aria-label="Thinking" />
              </div>
            )}
            {error && <p className="text-0 text-accent">{error}</p>}
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
              className="h-12 w-full bg-transparent font-mono text-[length:var(--step--1)] outline-none placeholder:text-fg-muted"
              disabled={busy}
              aria-label="Ask the assistant"
            />
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
