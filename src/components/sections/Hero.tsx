import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUpRight } from 'lucide-react'
import { RevealHeading } from '@/components/ui/motion'

/*
  The hero is a spec sheet masthead crossed with a terminal: the statement on
  the left, a staged agent-session illustration on the right. The illustration
  is the site's thesis in one glance — backend correctness, shipped with agents,
  human-reviewed. Lines land in order (CSS, reduced-motion safe) and stop.

  Order matters here. A visitor reads: who is this (status line), what does he
  claim (the statement), can I verify it (the session), where do I go (the
  CTAs). The status rule is shared with /resume so the two pages open alike.
*/

const REPLAY = [
  { tag: 'plan', text: 'assignment rules → one state machine', color: 'var(--hue-ts)' },
  { tag: 'edit', text: 'store.go · assign_test.go', color: 'var(--hue-python)' },
  { tag: 'test', text: 'go test ./... · ok', color: 'var(--hue-node)' },
  { tag: 'review', text: 'no double-assign under load', color: 'var(--fg-soft)' },
  { tag: 'ship', text: '✓ merged — human-reviewed', color: 'var(--success)' },
]

/** Each line's visual status: done lines keep their hue, the last one lands muted. */
const TOTAL_MS = 600 + (REPLAY.length - 1) * 260

function SessionReplay() {
  return (
    <figure className="m-0">
      <div className="hero-session border border-line-strong">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <span className="flex items-center gap-2">
            <span className="label text-[0.6rem]">agent session · dispatch</span>
            <span className="label text-[0.55rem]" style={{ color: 'var(--hue-agent)' }}>
              / atlas
            </span>
          </span>
          <span className="label text-[0.6rem] text-fg-muted">illustrative</span>
        </div>

        <div
          className="hero-log space-y-2.5 p-5 font-mono text-[length:var(--step--1)] leading-relaxed"
          role="img"
          aria-label="Illustration of an agent-assisted fix: plan, edit, test, review, ship — human-reviewed before merge."
        >
          <p className="term-line text-fg" style={{ '--d': '200ms' } as React.CSSProperties}>
            <span className="mr-2 text-accent">›</span>fix the double-assignment race
          </p>
          {REPLAY.map((l, i) => (
            <p
              key={l.tag}
              className="term-line grid grid-cols-[4.25rem_1fr] gap-2"
              style={{ '--d': `${600 + i * 260}ms` } as React.CSSProperties}
            >
              <span className="uppercase tracking-[0.08em]" style={{ color: l.color }}>
                {l.tag}
              </span>
              <span className={i === REPLAY.length - 1 ? 'term-cursor text-fg' : 'text-fg-soft'}>
                {l.text}
              </span>
            </p>
          ))}
        </div>

        {/* Pipeline footer: the same five stages stated as a scale, so the
            panel closes with a reading rather than empty space. The rule
            fills once the replay has landed. */}
        <div className="border-t border-line px-5 py-3">
          <div className="flex items-center justify-between gap-4">
            <span className="label text-[0.5rem]">5 stages · 0 human undos</span>
            <span className="label text-[0.5rem] text-fg-muted tabular">
              ~{Math.round(TOTAL_MS / 100) / 10}s end-to-end
            </span>
          </div>
          <div className="relative mt-2 h-px bg-line" aria-hidden>
            <span
              className="absolute inset-y-0 left-0 w-full origin-left bg-accent"
              style={{
                transform: 'scaleX(0)',
                animation: `rk-draw var(--dur-4) var(--ease-out) ${TOTAL_MS}ms forwards`,
              }}
            />
          </div>
        </div>
      </div>

      <figcaption className="mt-3 flex items-center justify-between gap-4">
        <span className="label text-[0.6rem]">The Atlas fix, staged as a session</span>
        <Link to="/work/atlas" className="u-link label text-[0.6rem] text-accent">
          Case study <ArrowUpRight className="size-3" aria-hidden />
        </Link>
      </figcaption>
    </figure>
  )
}

export function Hero() {
  return (
    <section
      className="frame relative border-b border-line pb-14 pt-14 md:pb-20 md:pt-20"
      aria-labelledby="hero-h"
    >
      <div className="blueprint hero-blueprint pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative">
        {/* Status line: where and when, then the one availability fact. */}
        <div className="mb-8 flex flex-col gap-3 border-b border-line pb-3 sm:flex-row sm:items-center sm:justify-between md:mb-10">
          <p className="label">
            Portfolio <span className="mx-2 text-line-strong">/</span> 2019—{new Date().getFullYear()}
            <span className="mx-2 text-line-strong">/</span> Kathmandu → Remote
          </p>
          <p className="hero-status label">
            <span className="hero-dot" aria-hidden />
            Available for select work
          </p>
        </div>

        <span className="hero-mark mb-6" aria-hidden />

        <h1 id="hero-h" className="max-w-[16ch] text-6 text-fg">
          <RevealHeading text="I build systems" />
          <br />
          <RevealHeading className="italic text-fg-soft" text="and the interfaces" delay={0.18} />
          <br />
          <RevealHeading text="on top of them." delay={0.34} />
        </h1>

        <hr className="spectrum-rule my-10" />

        <div className="grid gap-10 md:grid-cols-[1.1fr_1fr] md:gap-16">
          <div>
            <p className="max-w-[46ch] text-1 leading-relaxed text-fg-soft">
              Roshan Khatri — backend-heavy full-stack engineer. Go, Rust and Python
              underneath; React and TypeScript on top; AI agents in the loop, every
              diff reviewed. Currently taking on a small number of engagements.
            </p>

            <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-5 sm:grid-cols-3">
              {[
                ['Based', 'Kathmandu → Remote'],
                ['Focus', 'Backend & systems'],
                ['Stack', 'Go · Rust · TS'],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="label mb-1">{k}</dt>
                  <dd className="text-0 text-fg">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-10 flex flex-wrap items-center gap-3 sm:gap-4">
              <a
                href="#work"
                className="contact-cta inline-flex h-11 items-center justify-center gap-3 px-5 font-mono text-[length:var(--step--1)] uppercase tracking-[0.12em] sm:justify-start"
              >
                Selected work
                <ArrowDown className="relative size-4" aria-hidden />
              </a>
              <a
                href="#agents"
                className="contact-cta is-ghost h-11 w-full items-center justify-between gap-3 border px-5 font-mono text-[length:var(--step--1)] uppercase tracking-[0.12em] sm:inline-flex sm:w-auto"
              >
                Ask the assistant
                <ArrowUpRight className="relative size-4" aria-hidden />
              </a>
            </div>
          </div>

          <SessionReplay />
        </div>
      </div>
    </section>
  )
}
