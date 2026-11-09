import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, ArrowLeft, Check, Copy, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MetricGrid } from '@/components/ui/metric-grid'
import { useTransientFlag } from '@/lib/machine'
import { getProject, projectHue, type ProjectMeta } from '@/lib/projects'

/*
  Résumé as a page, not a dead PDF link. It is built from the same primitives
  as the case studies and draws every metric, stack, and claim straight from
  the published frontmatter — if a number changes in the MDX, it changes here.

  Layout: a fixed spec rail on the wide screen (the section you are reading,
  the year you are in) and one content column. Print strips the rail, chrome,
  and motion; "Save as PDF" is the export.
*/

const EMAIL = 'hello@roshankhatri.dev'
const ENGAGEMENTS = ['atlas', 'sift', 'ledger'] as const

const SKILLS = [
  ['Backend', 'Go · Rust · Python · Node.js · Postgres · SQLite · Temporal · WebSockets'],
  ['Frontend', 'TypeScript · React · Tailwind CSS · Vite · MDX'],
] as const

const AGENT_WORKFLOW = [
  {
    name: 'Claude Code',
    note: 'Long refactors against a written spec and a test gate',
  },
  { name: 'Codex', note: 'Parallel tasks — a review queue, not autocomplete' },
  { name: 'OpenCode', note: 'Terminal-native sessions on remote boxes' },
  { name: 'oh-my-pi', note: 'Orchestrated agents — the shell this site was built in' },
] as const

const CRAFT = [
  [
    'Correctness first',
    'A smaller system that holds its invariants beats a larger one that mostly does.',
    'State the invariant before the feature, then put it where it cannot be bypassed — a database constraint, not a code review habit.',
    'deferred constraint over application check',
  ],
  [
    'Boring where it counts',
    'Postgres, queues, typed boundaries. Novelty is spent on the problem, not the plumbing.',
    'Every new dependency has to beat the boring option already running in production, and I write down why.',
    'fewer moving parts over newer ones',
  ],
  [
    'Interfaces explain themselves',
    'If the UI needs a tutorial, the model behind it is probably wrong.',
    'I test an interface by handing it to someone who has not read the schema, and watch where they hesitate.',
    'legible surface over clever surface',
  ],
  [
    'Review is the leverage',
    'Agents write more of the code every year. Judgement about what is correct stays with the person reading the diff.',
    'Spec first, tests as the gate, every diff read before it lands. Delegation is only as good as the review behind it.',
    'one reviewed diff, not N merged ones',
  ],
] as const

const SECTIONS = [
  { id: 'resume-brief', label: 'Brief' },
  { id: 'resume-toolbelt', label: 'Toolbelt' },
  { id: 'resume-work', label: 'Engagements' },
  { id: 'resume-craft', label: 'Method' },
] as const

/** Which delegate ran the build, per engagement — a record, not a ranking. */
const DELEGATE: Record<string, string> = {
  atlas: 'Claude Code + Codex',
  sift: 'Claude Code',
  ledger: 'Codex',
}

const delegateFor = (slug: string) => DELEGATE[slug] ?? 'a reviewed agent session'

/** The second bullet per engagement — what the summary does not already say. */
const BEATS: Record<string, string> = {
  atlas:
    'Event-sourced order state with per-viewport WebSocket deltas; Temporal workflow identity plus a locked read closed a double-assignment race the cron jobs had hidden for years.',
  sift:
    'Rust core to WASM with hybrid FTS5 + vector retrieval fused by reciprocal rank fusion; chunked, cancellable indexing keeps the main thread live.',
  ledger:
    'Deferred Postgres constraint makes an unbalanced transaction unrepresentable; idempotent payment intake keyed on the provider event id.',
}

const sectionHeading = 'font-mono text-[length:var(--step--1)] uppercase tracking-[0.14em] text-fg-muted'

/* ── Rail ────────────────────────────────────────────────────────────────
   A reading instrument, not a nav list: an accent bar that tracks the
   viewport, the index of the active section, and the year stamped in the
   margin. Client-side only, so it never matters to the server render. */

function Rail({ active }: { active: number }) {
  return (
    <aside
      className="no-print sticky top-24 hidden h-[calc(100dvh-9rem)] flex-col justify-between self-start lg:flex"
      aria-hidden
      style={{ '--section-accent': 'var(--accent)' } as CSSProperties}
    >
      <nav>
        <p className="label mb-4">Contents</p>
        <ol className="space-y-3 border-l border-line">
          {SECTIONS.map((s, i) => (
            <li key={s.id} className="relative">
              <span
                className="resume-rail-tick absolute -left-px top-1/2 h-px -translate-y-1/2"
                style={{ width: i === active ? '1.75rem' : '0.5rem' }}
                data-on={i === active}
              />
              <a
                href={`#${s.id}`}
                className="resume-rail-link label block pl-8 transition-colors duration-[var(--dur-2)]"
                data-on={i === active}
              >
                <span className="resume-rail-num tabular">{String(i + 1).padStart(2, '0')}</span>
                <span className="ml-3 normal-case tracking-[0.08em]">{s.label}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="border-t border-line pt-4">
        <p className="font-display text-3 leading-none text-fg-muted">2026</p>
        <p className="label mt-2 leading-relaxed">
          Kathmandu
          <br />
          UTC+5:45
        </p>
      </div>
    </aside>
  )
}

/* ── Masthead mark: initials in a spec-sheet tile, print-safe ─────────── */

function MastheadMark() {
  return (
    <div
      className="resume-mark-tile relative hidden size-[4.5rem] shrink-0 items-center justify-center border border-line-strong bg-bg-raised sm:flex"
      aria-hidden
    >
      <span className="font-display text-3 leading-none text-fg">RK</span>
      <span className="resume-mark-corner absolute left-0 top-0 h-3 w-3 border-b border-r border-accent" aria-hidden />
      <span className="resume-mark-corner absolute bottom-0 right-0 h-3 w-3 border-l border-t border-accent" aria-hidden />
    </div>
  )
}

/* ── Masthead contact line, with copy-to-clipboard on the address ─────── */

function ContactLine() {
  const copy = useTransientFlag<'email'>(1600)
  const copied = copy.active === 'email'

  // Clipboard unavailable = no flash; the mailto link beside it still works.
  const onCopy = () => void copy.settle('email', () => navigator.clipboard.writeText(EMAIL))

  return (
    <div className="flex items-center gap-1.5">
      <dt className="sr-only">Email</dt>
      <dd>
        <a href={`mailto:${EMAIL}`} className="u-link text-fg-soft hover:text-accent">
          {EMAIL}
        </a>
      </dd>
      <button
        type="button"
        onClick={onCopy}
        className="no-print ml-1 inline-flex size-6 items-center justify-center border border-line text-fg-muted transition-colors duration-[var(--dur-1)] hover:border-accent hover:text-accent"
        aria-label={copied ? 'Address copied' : 'Copy email address'}
      >
        {copied ? <Check className="size-3" aria-hidden /> : <Copy className="size-3" aria-hidden />}
      </button>
    </div>
  )
}

function Chip({ children, hue, solid }: { children: ReactNode; hue?: string; solid?: boolean }) {
  return (
    <span
      className="resume-chip label inline-flex items-center px-1.5 py-0.5 text-[0.58rem]"
      style={hue ? ({ '--chip-hue': hue } as CSSProperties) : undefined}
      data-solid={solid || undefined}
    >
      {children}
    </span>
  )
}

export function Resume() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    document.title = 'Résumé — Roshan Khatri'
    window.scrollTo(0, 0)
    return () => {
      document.title = 'Roshan Khatri — Software Engineer'
    }
  }, [])

  // Reading position: the section whose head is closest above the fold.
  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => el !== null,
    )
    if (els.length === 0) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const i = els.indexOf(e.target as HTMLElement)
            if (i >= 0) setActive(i)
          }
        }
      },
      { rootMargin: '-18% 0px -60% 0px', threshold: 0 },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  const engagements = ENGAGEMENTS.map((slug) => getProject(slug)).filter(
    (p): p is ProjectMeta => p !== undefined,
  )
  const spines = engagements.filter((p) => p.metrics?.[0])

  return (
    <article className="frame pb-16 pt-8">
      <div className="no-print flex items-center justify-between">
        <Link to="/" className="label inline-flex items-center gap-2 transition-colors hover:text-accent">
          <ArrowLeft className="size-3.5" aria-hidden /> Home
        </Link>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="size-3.5" aria-hidden />
          Print / save PDF
        </Button>
      </div>

      <div className="mt-8 grid gap-16 lg:grid-cols-[12rem_minmax(0,1fr)]">
        <Rail active={active} />

        <div className="min-w-0">
          {/* ── Masthead ──────────────────────────────────────────────── */}
          <header className="border-b border-line pb-8">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <p className="label text-[0.62rem] text-accent">Résumé · Sheet 01/01</p>
              <p className="label text-[0.62rem]">Updated Nov 2026</p>
            </div>

            <div className="mt-4 flex items-start gap-6">
              <MastheadMark />
              <div className="min-w-0 flex-1">
                <h1 className="text-6">Roshan Khatri</h1>
                <p className="mt-2 font-mono text-[length:var(--step--1)] uppercase tracking-[0.14em] text-fg-muted">
                  Software engineer · backend-heavy full-stack
                </p>
              </div>
            </div>

            <p className="mt-5 max-w-[54ch] text-1 leading-relaxed text-fg-soft">
              Correct systems underneath, interfaces that explain themselves on top,
              AI agents in the loop with every diff reviewed.
            </p>

            <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-2 font-mono text-[length:var(--step--1)] text-fg-muted">
              <ContactLine />
              <div className="flex gap-2">
                <dt className="sr-only">Location</dt>
                <dd>Kathmandu, Nepal · Remote (UTC+5:45)</dd>
              </div>
              <div className="flex gap-2">
                <dt className="sr-only">GitHub</dt>
                <dd>
                  <a
                    href="https://github.com/roshankhatri"
                    target="_blank"
                    rel="noreferrer"
                    className="u-link hover:text-accent"
                  >
                    github.com/roshankhatri
                  </a>
                </dd>
              </div>
            </dl>

            {spines.length > 0 && (
              <dl className="resume-papertrail mt-8 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-3">
                {spines.map((p) => (
                  <div key={p.slug} className="bg-bg px-4 py-3">
                    <dt className="label mb-1.5 flex items-center gap-1.5 text-[0.58rem]">
                      <span className="inline-block size-1.5" style={{ background: projectHue(p.slug) }} aria-hidden />
                      {p.metrics![0].label}
                      <span className="ml-auto tabular">{p.year}</span>
                    </dt>
                    <dd
                      className="font-mono text-2 tabular leading-none"
                      style={{ color: projectHue(p.slug) }}
                    >
                      {p.metrics![0].value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </header>

          {/* ── Brief ─────────────────────────────────────────────────── */}
          <section
            id="resume-brief"
            className="scroll-mt-24 border-b border-line py-10"
            aria-labelledby="resume-brief-h"
            style={{ '--section-accent': 'var(--hue-go)' } as CSSProperties}
          >
            <div className="grid gap-6 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-8">
              <h2 id="resume-brief-h" className={sectionHeading}>
                <span className="index mr-2">01</span>Brief
              </h2>
              <p className="text-1 leading-relaxed text-fg-soft">
                I work at the boundary between the database and the browser, usually at
                small companies. I keep systems small enough to reason about, spend novelty
                on the problem rather than the plumbing, and hold every invariant in a place
                that cannot be bypassed.
              </p>
            </div>
          </section>

          {/* ── Toolbelt ──────────────────────────────────────────────── */}
          <section
            id="resume-toolbelt"
            className="scroll-mt-24 border-b border-line py-10"
            aria-labelledby="resume-toolbelt-h"
            style={{ '--section-accent': 'var(--hue-ts)' } as CSSProperties}
          >
            <div className="grid gap-6 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-8">
              <h2 id="resume-toolbelt-h" className={sectionHeading}>
                <span className="index mr-2">02</span>Toolbelt
              </h2>

              <div>
                <dl className="space-y-5">
                  {SKILLS.map(([k, v]) => (
                    <div key={k} className="grid gap-1.5 sm:grid-cols-[8rem_1fr] sm:gap-6">
                      <dt className="label pt-1">{k}</dt>
                      <dd className="flex flex-wrap gap-1.5">
                        {v.split(' · ').map((tool) => (
                          <Chip key={tool}>{tool}</Chip>
                        ))}
                      </dd>
                    </div>
                  ))}
                </dl>

                {/* AI workflow: the ledger of delegates, each reviewed */}
                <div className="resume-spec mt-8">
                  <div className="flex items-center justify-between border-b border-line px-4 py-2">
                    <span className="label text-[0.58rem]" style={{ color: 'var(--hue-agent)' }}>
                      AI workflow · delegates, not autocomplete
                    </span>
                    <span className="label text-[0.58rem]">1 reviewer</span>
                  </div>
                  <ul className="grid sm:grid-cols-2">
                    {AGENT_WORKFLOW.map((a) => (
                      <li
                        key={a.name}
                        className="flex items-baseline gap-3 border-b border-line px-4 py-2.5 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0 sm:[&:nth-child(odd)]:border-r sm:[&:nth-child(odd)]:border-line"
                      >
                        <span
                          className="mt-[0.45em] inline-block size-1.5 shrink-0"
                          style={{ background: 'var(--hue-agent)' }}
                          aria-hidden
                        />
                        <p className="text-[length:var(--step--1)] leading-snug">
                          <span className="font-mono font-medium text-fg">{a.name}</span>
                          <span className="text-fg-muted"> — {a.note}</span>
                        </p>
                      </li>
                    ))}
                  </ul>
                  <p className="border-t border-line px-4 py-2.5 font-mono text-[length:var(--step--2)] uppercase tracking-[0.1em] text-fg-muted">
                    Spec first · tests as the gate · every diff reviewed
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ── Engagements ───────────────────────────────────────────── */}
          <section
            id="resume-work"
            className="scroll-mt-24 border-b border-line py-10"
            aria-labelledby="resume-work-h"
            style={{ '--section-accent': 'var(--hue-react)' } as CSSProperties}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <h2 id="resume-work-h" className={sectionHeading}>
                <span className="index mr-2">03</span>Selected engagements
              </h2>
              <p className="label text-[0.58rem]">{engagements.length} shown · newest first</p>
            </div>

            <div className="mt-4">
              {engagements.map((p, i) => {
                const hue = projectHue(p.slug)
                return (
                  <div
                    key={p.slug}
                    className="resume-entry group border-t border-line py-7 first:border-t-0"
                    style={{ '--entry-hue': hue } as CSSProperties}
                  >
                    <div className="grid gap-x-6 gap-y-4 md:grid-cols-[5rem_minmax(0,1fr)]">
                      <div className="flex items-baseline gap-3 md:flex-col md:gap-2">
                        <span className="index tabular" style={{ color: hue }}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="font-display text-2 leading-none tabular text-fg-muted">
                          {p.year}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                          <h3 className="text-2">{p.client}</h3>
                          <p className="resume-role font-mono text-[length:var(--step--1)] text-fg-muted">
                            {p.role}
                          </p>
                        </div>

                        {/* Headline figure: the one number that carries the entry */}
                        {p.metrics && p.metrics.length > 0 && (
                          <MetricGrid
                            className="resume-metrics mt-5"
                            items={p.metrics.map((mtr, j) => ({
                              label: mtr.label,
                              value: mtr.value,
                              lead: j === 0,
                              hue,
                            }))}
                          />
                        )}

                        <ul className="mt-4 space-y-2">
                          <li className="flex gap-3 text-0 leading-relaxed text-fg">
                            <span
                              className="resume-tick mt-[0.62em] h-px w-4 shrink-0"
                              style={{ background: hue }}
                              aria-hidden
                            />
                            <span>{p.summary}</span>
                          </li>
                          {BEATS[p.slug] && (
                            <li className="flex gap-3 text-0 leading-relaxed text-fg-soft">
                              <span
                                className="resume-tick mt-[0.62em] h-px w-4 shrink-0"
                                style={{ background: hue }}
                                aria-hidden
                              />
                              <span>
                                {BEATS[p.slug]}
                              </span>
                            </li>
                          )}
                          {/* This entry's own lane in the AI workflow: what ran,
                              what it cost, who reviewed it. Nothing here is
                              invented — the delegate is named, the gate is the
                              one the method section describes. */}
                          <li className="flex gap-3 text-0 leading-relaxed text-fg-soft">
                            <span
                              className="resume-tick mt-[0.62em] h-px w-4 shrink-0"
                              style={{ background: hue }}
                              aria-hidden
                            />
                            <span>
                              Built with{' '}
                              <span className="font-mono text-[0.92em] text-fg">{delegateFor(p.slug)}</span>;
                              every diff read before merge, the review logged against the spec.
                            </span>
                          </li>
                        </ul>

                        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                          {p.stack.slice(0, 5).map((s) => (
                            <Chip key={s} hue={hue}>
                              {s}
                            </Chip>
                          ))}
                          {p.stack.length > 5 && (
                            <span className="label text-[0.58rem]">+{p.stack.length - 5}</span>
                          )}
                          <Link
                            to={`/work/${p.slug}`}
                            className="u-link no-print label ml-auto inline-flex items-center gap-1 text-accent"
                          >
                            Case study <ArrowUpRight className="size-3" aria-hidden />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* ── Method ────────────────────────────────────────────────── */}
          <section
            id="resume-craft"
            className="scroll-mt-24 py-10"
            aria-labelledby="resume-craft-h"
            style={{ '--section-accent': 'var(--hue-python)' } as CSSProperties}
          >
            <div className="grid gap-6 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-8">
              <h2 id="resume-craft-h" className={sectionHeading}>
                <span className="index mr-2">04</span>Method
              </h2>
              <ul className="space-y-5">
                {CRAFT.map(([title, body, rule, code], i) => (
                  <li
                    key={title}
                    className="resume-craft grid gap-x-4 gap-y-1.5 border-t border-line pt-4 first:border-t-0 first:pt-0 sm:grid-cols-[1.5rem_minmax(0,1fr)_11rem]"
                  >
                    <span className="index pt-0.5 tabular">{String(i + 1).padStart(2, '0')}</span>
                    <div className="min-w-0">
                      <h3 className="font-mono text-0 uppercase tracking-[0.06em] text-fg">{title}</h3>
                      <p className="mt-1 text-0 leading-relaxed text-fg-soft">{body}</p>
                      <p className="mt-1.5 max-w-[46ch] text-[length:var(--step--1)] leading-snug text-fg-muted">
                        {rule}
                      </p>
                    </div>
                    <span className="col-start-2 font-mono text-[0.6rem] leading-snug text-fg-muted sm:col-start-3 sm:border-l sm:border-line sm:pl-3 sm:self-center">
                      {code}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* ── Colophon ──────────────────────────────────────────────── */}
          <footer className="flex flex-wrap items-baseline justify-between gap-3 border-t border-line pt-5">
            <p className="label text-[0.58rem]">
              Every figure traces to a published case study
            </p>
            <p className="label text-[0.58rem] tabular">RK · 2026</p>
          </footer>
        </div>
      </div>
    </article>
  )
}