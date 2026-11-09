import type { CSSProperties, MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { ProjectInstrument } from '@/components/ui/project-instrument'
import type { ProjectMeta } from '@/lib/projects'

/*
  One staged session, drawn as a panel: a transcript, then the measurements it
  produced. The parent keeps this component keyed by project, so choosing
  another project remounts it and the replay lands again — which is the point.
  The title carries no hue, so the change is announced rather than animated.
*/

export const STAGES = ['plan', 'edit', 'test', 'review', 'ship'] as const

const STEP_MS = 260
export const REPLAY_MS = 600 + (STAGES.length - 1) * STEP_MS

/** The ask, the file it lands in, and the evidence — per project, not per taste. */
export function promptFor(p: ProjectMeta) {
  const [primary, secondary] = p.stack
  return {
    ask: p.title.toLowerCase().includes('atlas')
      ? 'fix the double-assignment race'
      : `why is the ${primary} layer correct?`,
    files: primary && secondary ? `${p.slug}.go · ${secondary.toLowerCase()}.test.go` : p.slug,
    proof: p.metrics?.[0] ? `${p.metrics[0].value} ${p.metrics[0].label.toLowerCase()}` : 'reviewed before merge',
  }
}

/** Keep a rail click from also focusing the link it selects for. */
export function suppressLinkFocus(e: MouseEvent) {
  if ((e.target as HTMLElement).closest('a')) e.preventDefault()
}

export function HeroSession({
  project,
  instrument,
  signalId,
  onInstrument,
}: {
  project: ProjectMeta
  instrument: boolean
  signalId: string
  onInstrument: () => void
}) {
  const p = promptFor(project)
  const script = [
    { tag: 'plan', text: `${project.stack[0] ?? 'core'} rules → one state machine`, color: 'var(--hue-ts)' },
    { tag: 'edit', text: p.files, color: 'var(--hue-python)' },
    { tag: 'test', text: 'go test ./... · ok', color: 'var(--hue-node)' },
    { tag: 'review', text: p.proof, color: 'var(--fg-soft)' },
    { tag: 'ship', text: '✓ merged — human-reviewed', color: 'var(--success)' },
  ]

  return (
    <figure className="m-0" style={{ '--row-hue': 'var(--hue-ts)' } as CSSProperties}>
      <div className="hero-session border border-line-strong">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <span className="label text-[0.6rem]">agent session</span>
          <span className="label text-[0.55rem]" style={{ color: 'var(--row-hue)' }}>
            / {project.slug}
          </span>
        </div>

        <div
          className="hero-log space-y-2.5 p-5 font-mono text-[length:var(--step--1)] leading-relaxed"
          role="img"
          aria-label={`An agent-assisted change to ${project.title}: plan, edit, test, review, ship — reviewed by a human before merge.`}
        >
          <p className="term-line text-fg" style={{ '--d': '200ms' } as CSSProperties}>
            <span className="mr-2 text-accent">›</span>
            {p.ask}
          </p>
          {script.map((l, i) => (
            <p
              key={l.tag}
              className="term-line grid grid-cols-[4.25rem_1fr] gap-2"
              style={{ '--d': `${600 + i * STEP_MS}ms` } as CSSProperties}
            >
              <span className="uppercase tracking-[0.08em]" style={{ color: l.color }}>
                {l.tag}
              </span>
              <span className={i === script.length - 1 ? 'term-cursor text-fg' : 'text-fg-soft'}>
                {l.text}
              </span>
            </p>
          ))}
        </div>

        <ProjectInstrument
          project={project}
          on={instrument}
          signalId={signalId}
          onToggle={onInstrument}
        />

        <div className="border-t border-line px-5 py-3">
          <div className="flex items-center justify-between gap-4">
            <span className="label text-[0.5rem]">5 stages · 0 human undos</span>
            <span className="label text-[0.5rem] text-fg-muted">~{Math.round(REPLAY_MS / 100) / 10}s</span>
          </div>
          <div className="relative mt-2 h-px bg-line" aria-hidden>
            <span
              className="hero-replay-rule absolute inset-y-0 left-0 w-full origin-left bg-accent"
              style={{ '--d': `${REPLAY_MS}ms` } as CSSProperties}
            />
          </div>
        </div>
      </div>

      <figcaption className="mt-3 flex items-center justify-between gap-4">
        <span className="label text-[0.6rem]">Illustrative session · {project.year}</span>
        <Link to={`/work/${project.slug}`} className="u-link label text-[0.6rem] text-accent">
          {project.title} case study <ArrowUpRight className="size-3" aria-hidden />
        </Link>
      </figcaption>
    </figure>
  )
}
