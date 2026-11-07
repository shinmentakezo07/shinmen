import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

/*
  Résumé as a page, not a dead PDF link: same spec-sheet language, print CSS
  strips the chrome and forces paper colours, so "Save as PDF" is the export.
  Experience entries mirror the published case studies — nothing unverifiable.
*/

const EXPERIENCE = [
  {
    org: 'Meridian Logistics',
    role: 'Lead engineer, 4-person team',
    period: '2025',
    slug: 'atlas',
    points: [
      'Rebuilt dispatch for 1,800 drivers from a spreadsheet + cron jobs into an event-sourced Go service; 340ms p95 dispatch latency, 99.97% uptime over 12 months.',
      'Encoded the undocumented assignment rules as one tested state machine; idempotent assignment via Temporal eliminated double-assignment.',
    ],
  },
  {
    org: 'Independent',
    role: 'Design and engineering',
    period: '2024',
    slug: 'sift',
    points: [
      'Built Sift, a local-first semantic search tool: Rust core compiled to WASM, SQLite hybrid index, 42ms median query over 80k chunks, zero bytes sent to a server.',
    ],
  },
  {
    org: 'Fielder',
    role: 'Founding engineer',
    period: '2023',
    slug: 'ledger',
    points: [
      'Shipped a double-entry ledger in six weeks; database-enforced balance invariant processed $2.1M in year one with zero unbalanced entries.',
    ],
  },
] as const

const SKILLS = [
  ['Backend', 'Go · Rust · Python · Node.js · Postgres · SQLite · Temporal · WebSockets'],
  ['Frontend', 'TypeScript · React · Tailwind CSS · Vite · MDX'],
  ['AI workflow', 'Claude Code · Codex · OpenCode · oh-my-pi — spec-first delegation, test gates, human review'],
] as const

export function Resume() {
  useEffect(() => {
    document.title = 'Résumé — Roshan Khatri'
    window.scrollTo(0, 0)
    return () => {
      document.title = 'Roshan Khatri — Software Engineer'
    }
  }, [])

  return (
    <article className="frame py-12">
      <div className="no-print flex items-center justify-between">
        <Link to="/" className="label inline-flex items-center gap-2 transition-colors hover:text-accent">
          <ArrowLeft className="size-3.5" aria-hidden /> Home
        </Link>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="size-3.5" aria-hidden />
          Print / save PDF
        </Button>
      </div>

      <header className="mt-8 border-b border-line pb-8">
        <p className="label mb-3">Résumé</p>
        <h1 className="text-6">Roshan Khatri</h1>
        <p className="mt-4 max-w-[52ch] text-1 leading-relaxed text-fg-soft">
          Backend-heavy full-stack engineer. Correct systems underneath, interfaces
          that explain themselves on top, AI agents in the loop with every diff reviewed.
        </p>
        <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-2 font-mono text-[length:var(--step--1)] text-fg-muted">
          <div className="flex gap-2">
            <dt className="sr-only">Email</dt>
            <dd>hello@roshankhatri.dev</dd>
          </div>
          <div className="flex gap-2">
            <dt className="sr-only">Location</dt>
            <dd>Kathmandu, Nepal · Remote (UTC+5:45)</dd>
          </div>
          <div className="flex gap-2">
            <dt className="sr-only">GitHub</dt>
            <dd>github.com/roshankhatri</dd>
          </div>
        </dl>
      </header>

      <section className="border-b border-line py-10" aria-labelledby="resume-skills">
        <h2 id="resume-skills" className="text-3">Toolbelt</h2>
        <dl className="mt-6 space-y-4">
          {SKILLS.map(([k, v]) => (
            <div key={k} className="grid gap-1 sm:grid-cols-[8rem_1fr] sm:gap-6">
              <dt className="label pt-0.5">{k}</dt>
              <dd className="font-mono text-[length:var(--step--1)] leading-relaxed text-fg-soft">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="py-10" aria-labelledby="resume-work">
        <h2 id="resume-work" className="text-3">Selected engagements</h2>
        <div className="mt-6 space-y-10">
          {EXPERIENCE.map((e) => (
            <div key={e.org}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-line pb-2">
                <h3 className="font-mono text-0 font-medium uppercase tracking-[0.06em] text-fg">
                  {e.org} <span className="text-fg-muted">· {e.role}</span>
                </h3>
                <span className="font-mono text-[length:var(--step--1)] tabular text-fg-muted">{e.period}</span>
              </div>
              <ul className="mt-3 space-y-2">
                {e.points.map((p) => (
                  <li key={p} className="list-disc pl-0 text-0 leading-relaxed text-fg-soft marker:text-accent ml-5">
                    {p}
                  </li>
                ))}
              </ul>
              <Link to={`/work/${e.slug}`} className="u-link label no-print mt-3 inline-flex text-accent">
                Case study
              </Link>
            </div>
          ))}
        </div>
      </section>
    </article>
  )
}