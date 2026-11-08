import { useEffect, useState, type CSSProperties } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { getGithubStats, type GithubStats, type Repo } from '@/lib/api'
import { SectionHead } from './SectionHead'

/*
  "How I work" is the site's only first-person argument, so it leads with the
  claim and then shows the ledger behind it: each principle carries a short
  italic gloss (how I work) and a concrete commitment stated as a checkable
  rule (what that means for you).

  The right column is the one place the site shows live data. It is rendered
  only when the Go endpoint answers — no skeletons, no invented numbers. The
  repo strip lists what the API returned, newest first, because an honest
  "recently touched" column is more useful than a badge wall.
*/

const PRINCIPLES = [
  {
    n: '01',
    title: 'Correctness first',
    gloss: 'I would rather ship a smaller system that holds its invariants than a large one that mostly does.',
    rule: 'State the invariant before the feature. If it cannot be enforced in the database, it will be violated.',
    hue: 'var(--hue-go)',
    code: 'deferred constraint > application check',
  },
  {
    n: '02',
    title: 'Boring where it counts',
    gloss: 'Postgres, queues, and typed boundaries. Novelty is spent on the problem, not the plumbing.',
    rule: 'Every new dependency has to earn its place against the boring option I already run.',
    hue: 'var(--hue-python)',
    code: 'fewer moving parts > newer moving parts',
  },
  {
    n: '03',
    title: 'Interfaces explain themselves',
    gloss: 'If the UI needs a tutorial, the model behind it is probably wrong.',
    rule: 'I test the interface by handing it to someone who has not read the schema.',
    hue: 'var(--hue-react)',
    code: 'legible surface > clever surface',
  },
] as const

const BOUNDARIES = [
  ['Schema and API', 'what the data allows'],
  ['Render and routing', 'what the person sees'],
  ['Tests and review', 'what actually ships'],
] as const

function relative(iso: string) {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '—'
  const years = (Date.now() - then) / (365.25 * 24 * 3600 * 1000)
  if (years < 1) return `${Math.max(1, Math.round(years * 12))}mo ago`
  return `${Math.floor(years)}y ago`
}

function LanguageDot({ language }: { language: string | null }) {
  const hue =
    language === 'Go'
      ? 'var(--hue-go)'
      : language === 'Rust'
        ? 'var(--hue-rust)'
        : language === 'Python'
          ? 'var(--hue-python)'
          : language === 'TypeScript' || language === 'JavaScript'
            ? 'var(--hue-ts)'
            : language === 'Java'
              ? 'var(--hue-rust)'
              : 'var(--line-strong)'
  return (
    <span
      className="inline-block size-1.5 shrink-0"
      style={{ background: hue }}
      aria-hidden
    />
  )
}

function RepoStrip({ repos }: { repos: Repo[] }) {
  return (
    <ul className="divide-y divide-line border-t border-line">
      {repos.map((r) => (
        <li key={r.name}>
          <a
            href={r.url}
            target="_blank"
            rel="noreferrer"
            className="group flex items-baseline gap-3 py-2.5 transition-colors hover:bg-bg-raised"
          >
            <LanguageDot language={r.language} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-mono text-[length:var(--step--1)] text-fg-soft transition-colors group-hover:text-accent">
                {r.name}
              </span>
              {r.description && (
                <span className="mt-0.5 block truncate text-[0.65rem] text-fg-muted">
                  {r.description}
                </span>
              )}
            </span>
            <span className="label shrink-0 text-[0.5rem] tabular">{relative(r.updatedAt)}</span>
            <ArrowUpRight
              className="size-3 shrink-0 text-fg-muted transition-colors group-hover:text-accent"
              aria-hidden
            />
          </a>
        </li>
      ))}
    </ul>
  )
}

export function About() {
  const [stats, setStats] = useState<GithubStats | null>(null)

  useEffect(() => {
    let live = true
    getGithubStats()
      .then((s) => live && setStats(s))
      .catch(() => live && setStats(null)) // API offline is fine — the section still reads.
    return () => {
      live = false
    }
  }, [])

  return (
    <section
      id="about"
      className="frame scroll-mt-20 border-b border-line py-16"
      aria-labelledby="about-h"
      style={{ '--section-accent': 'var(--hue-go)' } as CSSProperties}
    >
      <SectionHead
        id="about-h"
        index={3}
        kicker="About"
        title="How I work"
        note="The range and the rules behind it"
      />

      <div className="grid gap-14 py-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-16">
        {/* ── Argument ──────────────────────────────────────────────── */}
        <div className="min-w-0">
          <p className="max-w-[46ch] text-2 leading-[1.3] text-fg">
            Most product problems are not frontend problems or backend problems.
            They are <em className="not-italic text-accent">boundary</em> problems —
            and someone has to own the whole boundary.
          </p>

          <div className="mt-6 grid gap-5 text-0 leading-relaxed text-fg-soft sm:grid-cols-2 sm:gap-8">
            <p>
              Seven years between the database and the browser, mostly at small
              companies where the same person designs the schema and argues about
              kerning. I like that range more than any specialty inside it.
            </p>
            <p>
              My work tends toward consequences: ledgers that cannot be
              unbalanced, dispatch that cannot double-assign, search that does not
              leak. Agents write more of the code every year; the judgement about
              what is correct — and the review that enforces it — stays mine.
            </p>
          </div>

          {/* Boundary ledger: the range, stated as three owned seams */}
          <ol className="mt-9 grid grid-cols-1 border-y border-line sm:grid-cols-3">
            {BOUNDARIES.map(([title, note], i) => (
              <li
                key={title}
                className={
                  'flex flex-col gap-1 py-4 sm:px-4 sm:first:pl-0 sm:last:pr-0 ' +
                  (i > 0 ? 'border-t border-line sm:border-l sm:border-t-0' : '')
                }
              >
                <span className="label text-[0.55rem]">seam {String(i + 1).padStart(2, '0')}</span>
                <span className="font-mono text-[length:var(--step--1)] text-fg">{title}</span>
                <span className="text-[0.7rem] leading-snug text-fg-muted">{note}</span>
              </li>
            ))}
          </ol>

          {/* Principles: the claim, then the commitment you can hold me to */}
          <ol className="mt-9 space-y-px">
            {PRINCIPLES.map((p) => (
              <li
                key={p.n}
                className="group grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 gap-y-2 py-5 sm:grid-cols-[2.5rem_minmax(0,1fr)_12rem]"
                style={{ '--row-hue': p.hue } as CSSProperties}
              >
                <span className="index pt-0.5 tabular" style={{ color: p.hue }}>
                  {p.n}
                </span>
                <div className="min-w-0">
                  <h3 className="text-1 text-fg">{p.title}</h3>
                  <p className="mt-1.5 max-w-[42ch] text-[length:var(--step--1)] leading-relaxed text-fg-muted italic">
                    {p.gloss}
                  </p>
                  <p className="mt-2 flex gap-2 text-[length:var(--step--1)] leading-snug text-fg-soft">
                    <span className="mt-[0.5em] h-px w-3 shrink-0" style={{ background: p.hue }} aria-hidden />
                    {p.rule}
                  </p>
                </div>
                <span className="col-start-2 mt-1 self-start border-l border-line pl-3 font-mono text-[0.6rem] leading-snug text-fg-muted sm:col-start-3 sm:pl-0 sm:border-l-0 sm:border-r sm:pr-3 sm:text-right">
                  {p.code}
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* ── Live data ─────────────────────────────────────────────── */}
        <aside className="min-w-0 lg:pt-1" aria-label="Live GitHub activity">
          <div className="border border-line bg-bg-raised">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <span className="label text-[0.6rem]">Live from GitHub</span>
              <span className="label flex items-center gap-1.5 text-[0.55rem]">
                <span
                  className="inline-block size-1 rounded-full"
                  style={{ background: stats ? 'var(--success)' : 'var(--fg-muted)' }}
                  aria-hidden
                />
                {stats ? 'api · cached 10m' : 'api offline'}
              </span>
            </div>

            {stats ? (
              <>
                <dl className="grid grid-cols-3 divide-x divide-line border-b border-line">
                  {[
                    ['Repos', stats.publicRepos],
                    ['Followers', stats.followers],
                    ['Contribs', stats.contributionsLastYear ?? '—'],
                  ].map(([k, v]) => (
                    <div key={String(k)} className="px-3 py-3">
                      <dt className="label mb-1 text-[0.5rem]">{k}</dt>
                      <dd className="font-mono text-1 tabular leading-none text-fg">{v}</dd>
                    </div>
                  ))}
                </dl>

                <div className="px-4 pb-4 pt-3">
                  <p className="label mb-2 text-[0.5rem]">Recently pushed</p>
                  {stats.repos.length > 0 ? (
                    <RepoStrip repos={stats.repos} />
                  ) : (
                    <p className="border-t border-line pt-3 text-[0.7rem] text-fg-muted">
                      No public repositories returned.
                    </p>
                  )}
                  <a
                    href={`https://github.com/${stats.user}`}
                    target="_blank"
                    rel="noreferrer"
                    className="u-link label mt-4 inline-flex items-center gap-1 text-[0.55rem] text-fg-soft hover:text-accent"
                  >
                    github.com/{stats.user}
                    <ArrowUpRight className="size-3" aria-hidden />
                  </a>
                </div>
              </>
            ) : (
              <div className="px-4 py-6">
                <p className="max-w-[30ch] text-[length:var(--step--1)] leading-relaxed text-fg-muted">
                  The GitHub endpoint is not answering, so this panel stays empty
                  rather than showing made-up numbers. The rest of the page is
                  unaffected.
                </p>
              </div>
            )}
          </div>

          <p className="label mt-4 text-[0.5rem] leading-relaxed">
            Fetched by the Go service · 10-minute in-memory cache · stale on error
          </p>
        </aside>
      </div>
    </section>
  )
}
