import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, ArrowLeft, Check, Copy, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  ['Correctness first', 'A smaller system that holds its invariants beats a larger one that mostly does.'],
  ['Boring where it counts', 'Postgres, queues, typed boundaries. Novelty is spent on the problem, not the plumbing.'],
  ['Interfaces explain themselves', 'If the UI needs a tutorial, the model behind it is probably wrong.'],
] as const

const SECTIONS = [
  { id: 'resume-brief', label: 'Brief' },
  { id: 'resume-toolbelt', label: 'Toolbelt' },
  { id: 'resume-work', label: 'Engagements' },
  { id: 'resume-craft', label: 'Method' },
] as const

/** Positions where a case-study metric is duplicated in a résumé bullet. */
const HIGHLIGHT: Record<string, string[]> = {
  atlas: ['340ms p95', '99.97% uptime'],
  sift: ['42ms median', 'zero bytes'],
  ledger: ['$2.1M', 'zero unbalanced'],
}

/** The second bullet per engagement — what the summary does not already say. */
const BEATS: Record<string, string> = {
  atlas:
    'Undocumented assignment rules became one tested state machine; idempotent assignment via Temporal ended double-assignment for good.',
  sift:
    'Rust core compiled to WASM, SQLite hybrid index with FTS5 plus vectors — the index is one file you can copy, diff, and delete.',
  ledger:
    'Balance enforced by a deferred Postgres constraint, so no application bug can write an unbalanced transaction.',
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

/* ── Masthead contact line, with copy-to-clipboard on the address ─────── */

function ContactLine() {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(EMAIL)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard unavailable — the mailto link still works */
    }
  }

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
        onClick={copy}
        className="no-print ml-1 inline-flex size-6 items-center justify-center border border-line text-fg-muted transition-colors duration-[var(--dur-1)] hover:border-accent hover:text-accent"
        aria-label={copied ? 'Address copied' : 'Copy email address'}
      >
        {copied ? <Check className="size-3" aria-hidden /> : <Copy className="size-3" aria-hidden />}
      </button>
    </div>
  )
}

/* ── Bullet copy: the figures that also appear in the case study get a
   resting hairline underline in the entry hue, so the numbers a recruiter
   scans are the ones that trace to a published claim. ─────────────────── */

function Highlighted({ text, marks }: { text: string; marks: string[] }) {
  const re = new RegExp(`(${marks.map((m) => m.replace(/[$.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`)
  const parts = text.split(re)
  return (
    <>
      {parts.map((part, i) =>
        marks.includes(part) ? (
          <mark key={i} className="resume-mark">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
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

            <h1 className="mt-4 text-6">Roshan Khatri</h1>

            <p className="mt-4 max-w-[54ch] text-1 leading-relaxed text-fg-soft">
              Backend-heavy full-stack engineer. Correct systems underneath, interfaces
              that explain themselves on top, AI agents in the loop with every diff reviewed.
            </p>

            <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-2 font-mono text-[length:var(--step--1)] text-fg-muted">
              <ContactLine />
              <div className="flex gap-2">
                <dt className="sr-only">Location</dt>
                <dd>Kathmandu, Nepal · Remote (UTC+5:45)</dd>
              </div>
              <div className="flex gap-2">
                <dt className="sr-only">GitHub</dt>
                <dd>github.com/roshankhatri</dd>
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
                Seven years of hands-on work between the database and the browser, mostly
                at small companies. I keep the systems small enough to reason about, spend
                novelty on the problem rather than the plumbing, and hold every invariant
                in a place that cannot be bypassed.
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
                        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                          <h3 className="text-2">{p.client}</h3>
                          <p className="resume-role font-mono text-[length:var(--step--1)] text-fg-muted">
                            {p.role}
                          </p>
                        </div>

                        {/* Headline figure: the one number that carries the entry */}
                        {p.metrics && p.metrics.length > 0 && (
                          <dl className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-3 border-y border-line py-3">
                            {p.metrics.map((mtr, j) => (
                              <div key={mtr.label}>
                                <dt className="label mb-1 text-[0.58rem]">{mtr.label}</dt>
                                <dd
                                  className={
                                    j === 0
                                      ? 'font-mono text-2 tabular leading-none'
                                      : 'font-mono text-0 tabular leading-none text-fg-soft'
                                  }
                                  style={j === 0 ? { color: hue } : undefined}
                                >
                                  {mtr.value}
                                </dd>
                              </div>
                            ))}
                          </dl>
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
                          {(HIGHLIGHT[p.slug] ?? []).length > 0 && (
                            <li className="flex gap-3 text-0 leading-relaxed text-fg-soft">
                              <span
                                className="resume-tick mt-[0.62em] h-px w-4 shrink-0"
                                style={{ background: hue }}
                                aria-hidden
                              />
                              <span>
                                <Highlighted text={BEATS[p.slug]} marks={HIGHLIGHT[p.slug]} />
                              </span>
                            </li>
                          )}
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
                {CRAFT.map(([title, body], i) => (
                  <li key={title} className="grid grid-cols-[1.5rem_1fr] gap-4">
                    <span className="index pt-0.5 tabular">{String(i + 1).padStart(2, '0')}</span>
                    <div>
                      <h3 className="font-mono text-0 uppercase tracking-[0.06em] text-fg">{title}</h3>
                      <p className="mt-1 text-0 leading-relaxed text-fg-muted">{body}</p>
                    </div>
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
