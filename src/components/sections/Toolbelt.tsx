import type { CSSProperties } from 'react'
import { ArrowRight } from 'lucide-react'
import { projects, projectHue } from '@/lib/projects'
import { SectionHead } from './SectionHead'

/*
  The toolbelt is a claim list, so it is built as one: every tool states the
  job it does *in this portfolio* and links to the case study that proves it.
  Proof lines are derived from the project frontmatter rather than typed here,
  so a tool cannot cite work that the case studies do not publish.

  The right column is the workflow itself, drawn as a pipeline: one spec fans
  out to N delegates, each gate is a real gate, and only the reviewed diff
  ships. No badges, no logo wall.
*/

const TOOLS = [
  {
    name: 'Go',
    hue: 'var(--hue-go)',
    role: 'Service layer',
    note: 'The load-bearing code: HTTP, state machines, the pieces that must stay up.',
    lane: 'back',
    proof: ['atlas', 'ledger'],
  },
  {
    name: 'Rust',
    hue: 'var(--hue-rust)',
    role: 'Systems edge',
    note: 'Compiled to WASM when it has to run in a browser, native when it must not leak.',
    lane: 'back',
    proof: ['sift'],
  },
  {
    name: 'Python',
    hue: 'var(--hue-python)',
    role: 'Pipelines and evals',
    note: 'Batch work and measurement — the glue that has to outlive the sprint.',
    lane: 'back',
    proof: [],
  },
  {
    name: 'Postgres',
    hue: 'var(--hue-tailwind)',
    role: 'The record',
    note: 'Where invariants live: deferred constraints, not application-side checks.',
    lane: 'back',
    proof: ['ledger', 'atlas'],
  },
  {
    name: 'TypeScript',
    hue: 'var(--hue-ts)',
    role: 'Typed boundaries',
    note: 'One type from the API response to the component that renders it.',
    lane: 'surface',
    proof: ['atlas', 'this site'],
  },
  {
    name: 'React',
    hue: 'var(--hue-react)',
    role: 'Interface',
    note: 'Screens that show the system honestly, including when it is degraded.',
    lane: 'surface',
    proof: ['atlas', 'this site'],
  },
  {
    name: 'Tailwind',
    hue: 'var(--hue-node)',
    role: 'Design tokens → CSS',
    note: 'Tokens in one file, utilities out, no dead stylesheet.',
    lane: 'surface',
    proof: ['this site'],
  },
] as const

const AGENTS = [
  {
    name: 'Claude Code',
    share: 'long refactors',
    note: 'Runs against a written spec; stops at the test gate.',
  },
  {
    name: 'Codex',
    share: 'parallel tasks',
    note: 'A review queue, not autocomplete.',
  },
  {
    name: 'OpenCode',
    share: 'remote boxes',
    note: 'Terminal-native sessions where the code actually lives.',
  },
  {
    name: 'oh-my-pi',
    share: 'orchestration',
    note: 'The shell this site was built in.',
  },
] as const

const projectBySlug = new Map(projects.map((p) => [p.slug, p]))

/** The metric a tool's proof links to, straight from frontmatter. */
function proofLabel(slug: string) {
  if (slug === 'this site') return 'this site'
  const p = projectBySlug.get(slug)
  if (!p) return slug
  const m = p.metrics?.[0]
  return m ? `${p.title} · ${m.value} ${m.label.toLowerCase()}` : p.title
}

const laneLabel = { back: 'server', surface: 'browser' } as const

export function Toolbelt() {
  return (
    <section
      id="toolbelt"
      className="frame scroll-mt-20 border-b border-line py-16"
      aria-labelledby="toolbelt-h"
      style={{ '--section-accent': 'var(--hue-ts)' } as CSSProperties}
    >
      <SectionHead
        id="toolbelt-h"
        index={2}
        kicker="Toolbelt"
        title="Sharp tools, held correctly"
        note="7 tools · 4 agents · 1 reviewer"
      />

      <div className="grid gap-12 py-12 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:gap-16">
        {/* ── Tools: role first, proof attached ─────────────────────── */}
        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between">
            <p className="label text-[0.55rem]">What each one actually does here</p>
            <p className="label hidden text-[0.55rem] sm:block">proof →</p>
          </div>

          <div>
            {(['back', 'surface'] as const).map((lane) => (
              <div key={lane} className="border-t border-line">
                <p className="label py-2 text-[0.5rem] text-fg-muted/70">{laneLabel[lane]}</p>
                <ul>
                  {TOOLS.filter((t) => t.lane === lane).map((t) => (
                    <li
                      key={t.name}
                      className="group grid grid-cols-[2px_minmax(0,1fr)] gap-x-4 border-t border-line py-3.5 transition-colors duration-[var(--dur-1)] first:border-t-0 hover:bg-bg-raised sm:grid-cols-[2px_7.5rem_minmax(0,1fr)]"
                      style={{ '--row-hue': t.hue } as CSSProperties}
                    >
                      <span
                        className="toolbelt-keyline col-start-1 row-span-2 h-full w-[2px]"
                        style={{ background: t.hue }}
                        aria-hidden
                      />
                      <span
                        className="col-start-2 self-start font-mono text-[length:var(--step--1)] font-medium sm:row-start-1"
                        style={{ color: t.hue }}
                      >
                        {t.name}
                      </span>
                      <div className="col-start-2 min-w-0 sm:col-start-3 sm:row-start-1">
                        <p className="text-[length:var(--step--1)] leading-snug text-fg">
                          <span className="label mr-2 text-[0.5rem]">{t.role}</span>
                          {t.note}
                        </p>
                        {t.proof.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                            {t.proof.map((slug) =>
                              slug === 'this site' ? (
                                <span key={slug} className="label text-[0.5rem] text-fg-muted">
                                  this site
                                </span>
                              ) : (
                                <a
                                  key={slug}
                                  href="#work"
                                  className="u-link label inline-flex items-center gap-1 text-[0.5rem] text-fg-soft hover:text-accent"
                                >
                                  <span
                                    className="inline-block size-1"
                                    style={{ background: projectHue(slug) }}
                                    aria-hidden
                                  />
                                  {proofLabel(slug)}
                                </a>
                              ),
                            )}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* ── Workflow: a pipeline, not a paragraph ─────────────────── */}
        <div className="flex min-w-0 flex-col self-start border border-line bg-bg-raised">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="label text-[0.6rem]" style={{ color: 'var(--hue-agent)' }}>
              Agent workflow
            </span>
            <span className="label text-[0.6rem]">human-reviewed</span>
          </div>

          <div className="p-4">
            {/* Stage 1: the spec is the unit of delegation */}
            <div className="flex items-baseline gap-2 border-l-2 border-[color:var(--hue-ts)] pl-3">
              <span className="label text-[0.5rem]">01 · spec</span>
              <span className="font-mono text-[length:var(--step--1)] text-fg">
                one written spec
              </span>
            </div>

            {/* Fan-out: N agents on the same contract */}
            <div className="relative ml-[0.4rem] border-l border-dashed border-line py-3 pl-6">
              <span className="label absolute -left-[0.6rem] top-2.5 bg-bg-raised px-1 text-[0.5rem] text-fg-muted">
                N
              </span>
              <ul className="space-y-2.5">
                {AGENTS.map((a) => (
                  <li key={a.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
                    <p className="min-w-0">
                      <span className="font-mono text-[length:var(--step--1)] font-medium text-fg">
                        {a.name}
                      </span>
                      <span className="ml-2 label text-[0.5rem]">{a.share}</span>
                      <span className="mt-0.5 block text-[0.7rem] leading-snug text-fg-muted">
                        {a.note}
                      </span>
                    </p>
                    <span
                      className="toolbelt-dot mt-[0.35em] inline-block size-1.5 shrink-0"
                      style={{ background: 'var(--hue-agent)' }}
                      aria-hidden
                    />
                  </li>
                ))}
              </ul>
            </div>

            {/* Gates: the thing that makes delegation safe */}
            <div className="ml-[0.4rem] border-l-2 border-[color:var(--success)] pl-3">
              <p className="label mb-1.5 text-[0.5rem]">gate · run before review</p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[0.68rem] text-fg-soft">
                <span className="toolbelt-chip">spec written</span>
                <ArrowRight className="size-2.5 text-fg-muted" aria-hidden />
                <span className="toolbelt-chip">tests pass</span>
                <ArrowRight className="size-2.5 text-fg-muted" aria-hidden />
                <span className="toolbelt-chip">diff read</span>
              </div>
            </div>

            {/* Ship: one reviewed diff */}
            <div className="mt-3 flex items-baseline gap-2 border-t border-line pt-3">
              <span className="label text-[0.5rem]">02 · ship</span>
              <span className="font-mono text-[length:var(--step--1)]" style={{ color: 'var(--success)' }}>
                1 reviewed diff
              </span>
            </div>
          </div>

          <p className="mt-auto border-t border-line px-4 py-3 text-[0.7rem] leading-snug text-fg-muted">
            I don’t autocomplete with agents — I delegate. The leverage is real
            because the review is.
          </p>
        </div>
      </div>
    </section>
  )
}
