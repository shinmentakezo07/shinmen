import type { CSSProperties } from 'react'
import { ArrowRight } from 'lucide-react'
import { Stagger, StaggerItem } from '@/components/ui/motion'
import { SectionHead } from './SectionHead'

/*
  The toolbelt: each tool carries its own hue from the subject palette, so the
  section reads as a spectrum rather than a badge cloud. The right panel is the
  actual workflow — agents as delegates, not autocomplete.
*/

const TOOLS = [
  { name: 'Go', hue: 'var(--hue-go)', note: 'Services, CLIs, the load-bearing code', tag: 'core' },
  { name: 'Rust', hue: 'var(--hue-rust)', note: 'Systems edges, WASM, code that must not leak', tag: 'core' },
  { name: 'Python', hue: 'var(--hue-python)', note: 'Pipelines, evals, glue that outlives the sprint', tag: 'core' },
  { name: 'TypeScript', hue: 'var(--hue-ts)', note: 'Typed boundaries from API to component', tag: 'surface' },
  { name: 'React', hue: 'var(--hue-react)', note: 'Interfaces that explain themselves', tag: 'surface' },
  { name: 'Node.js', hue: 'var(--hue-node)', note: 'Tooling, edge functions, quick services', tag: 'surface' },
  { name: 'Tailwind', hue: 'var(--hue-tailwind)', note: 'Design tokens → utilities, no dead CSS', tag: 'surface' },
] as const

const AGENTS = [
  { name: 'Claude Code', note: 'Long refactors against a written spec and a test gate' },
  { name: 'Codex', note: 'Parallel tasks — a review queue, not autocomplete' },
  { name: 'OpenCode', note: 'Terminal-native sessions on remote boxes' },
  { name: 'oh-my-pi', note: 'Orchestrated agents — the shell this site was built in' },
] as const

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

      <div className="grid gap-12 py-12 md:grid-cols-[1.2fr_1fr] md:gap-16">
        <Stagger as="ul" className="divide-y divide-line border-b border-line">
          {TOOLS.map((t) => (
            <StaggerItem
              as="li"
              key={t.name}
              className="group grid grid-cols-[0.75rem_7.5rem_1fr_auto] items-baseline gap-3 py-3.5 transition-colors duration-[var(--dur-1)] hover:bg-bg-raised sm:gap-4"
            >
              <span
                className="inline-block size-2 self-center transition-transform duration-[var(--dur-2)] group-hover:scale-125"
                style={{ background: t.hue }}
                aria-hidden
              />
              <span className="font-mono text-0 font-medium" style={{ color: t.hue }}>
                {t.name}
              </span>
              <span className="text-[length:var(--step--1)] leading-snug text-fg-muted">
                {t.note}
              </span>
              <span className="label hidden text-[0.55rem] sm:block">{t.tag}</span>
            </StaggerItem>
          ))}
        </Stagger>

        <div className="flex flex-col self-start border border-line bg-bg-raised">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="label text-[0.6rem]" style={{ color: 'var(--hue-agent)' }}>
              Agent workflow
            </span>
            <span className="label text-[0.6rem]">human-reviewed</span>
          </div>
          <div className="space-y-5 p-5">
            <p className="text-0 leading-relaxed text-fg-soft">
              I don’t autocomplete with agents — I delegate. Spec first, tests as
              the gate, every diff reviewed before it ships. The leverage is real
              because the review is.
            </p>
            <ul className="space-y-3">
              {AGENTS.map((a) => (
                <li key={a.name} className="grid grid-cols-[0.75rem_1fr] gap-3">
                  <span
                    className="mt-[0.45em] inline-block size-1.5"
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
          </div>
          <div className="mt-auto flex items-center gap-2 border-t border-line px-5 py-3 font-mono text-[length:var(--step--2)] uppercase tracking-[0.1em] text-fg-muted">
            <span style={{ color: 'var(--hue-ts)' }}>1 spec</span>
            <ArrowRight className="size-3" aria-hidden />
            <span style={{ color: 'var(--hue-agent)' }}>N agents</span>
            <ArrowRight className="size-3" aria-hidden />
            <span style={{ color: 'var(--success)' }}>1 reviewed diff</span>
          </div>
        </div>
      </div>
    </section>
  )
}