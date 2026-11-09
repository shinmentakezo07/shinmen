import { useCallback, useState } from 'react'
import { ArrowUpRight, CornerRightDown } from 'lucide-react'
import { RevealHeading } from '@/components/ui/motion'
import { Button } from '@/components/ui/button'
import { useTransitionState, viewReducer, type ViewState, type ViewEvent } from '@/lib/machine'
import { nextId, pad } from '@/lib/utils'
import { projects, projectHue } from '@/lib/projects'
import { HeroSession, suppressLinkFocus } from './HeroSession'

/*
  The hero is a masthead with a working rail: the statement on the left, and on
  the right one panel that switches between projects and between a session and
  the measurements it produced.

  Every element answers a question a first-time visitor will ask over the first
  few seconds, in order — who is this, what does he claim, can it be checked,
  where do I go — and the rail is the one place the reading-that paragraph
  does not have to carry.

  ── The view machine ───────────────────────────────────────────────────────
  Switching project and opening the instrument both change *what is shown*, so
  both go through viewReducer (lib/machine). The warning it exists to prevent:
  the cap says "prepared, now showing", so if you switch projects while the
  instrument is open, the header would promise a pane that never rendered if we
  had naively kept `instrument` on across the switch. Prepares speak for
  themselves instead: a project switch closes the instrument unless it is
  already open.

  The session is keyed by slug, so a switch remounts it and the replay lands
  again. Only the panel remounts; the section, the heading, and focus stay put.
*/

export function Hero() {
  // Deterministic ids (not useId's colon form) so markup can point at the
  // instrument's region from the trigger's aria-controls.
  const [signalId] = useState(() => nextId('hero-signal'))
  const [view, dispatch] = useTransitionState<ViewState<string>, ViewEvent<string>>(
    { to: null, from: null },
    viewReducer,
  )

  // What is on screen now: the pane in flight, remembered, or the first project.
  const current = view.to ?? view.from ?? projects[0].slug
  const currentProject = projects.find((p) => p.slug === current) ?? projects[0]
  const instrument = view.from === current

  const prepare = useCallback(
    (to: string, from: string | null) => dispatch({ type: 'prepare', to, from }),
    [dispatch],
  )

  // Switching project is a prepare: the panel reads its own project metadata,
  // and a switch from the transcript starts at the transcript.
  const selectProject = (slug: string) => prepare(slug, instrument ? current : null)

  // Opening the instrument prepares it for the pane already on screen, so a
  // failed or aborted transition cannot strand a header promising it.
  const toggleInstrument = () => {
    if (instrument) dispatch({ type: 'retire', to: current })
    else prepare(current, current)
  }

  return (
    <section
      className="frame relative border-b border-line pb-14 pt-12 md:pb-20 md:pt-16"
      aria-labelledby="hero-h"
    >
      <div className="blueprint hero-blueprint pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative">
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

        {/* Two type sizes on one baseline: the statement, and the one sentence
            that says the site is a workspace rather than a brochure. */}
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,17rem)] md:items-end md:gap-10">
          <h1 id="hero-h" className="max-w-[16ch] text-6 text-fg">
            <RevealHeading text="I build systems" />
            <br />
            <RevealHeading className="italic text-fg-soft" text="and the interfaces" delay={0.18} />
            <br />
            <RevealHeading text="on top of them." delay={0.34} />
          </h1>

          <div className="md:pb-3">
            <span className="hero-mark mb-4" aria-hidden />
            <p className="max-w-[46ch] text-[length:var(--step-0)] leading-relaxed text-fg-soft">
              Roshan Khatri — backend-heavy full-stack engineer. Go, Rust and Python
              underneath; React and TypeScript on top; AI agents in the loop, every
              diff reviewed.
            </p>
          </div>
        </div>

        <hr className="spectrum-rule my-8 md:my-10" />

        <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] md:gap-14">
          {/* ── The rail: which project the panel shows, and where to go ── */}
          <div className="flex min-w-0 flex-col">
            <div role="group" aria-label="Choose a project to preview" className="hero-rail">
              <p className="label mb-1 px-3 text-[0.5rem] text-fg-muted">The work, in person</p>
              <ul className="m-0 list-none p-0">
                {projects.map((p, i) => {
                  const active = p.slug === current
                  return (
                    <li key={p.slug} style={{ '--row-hue': projectHue(p.slug) } as React.CSSProperties}>
                      <Button
                        variant="ghost"
                        size="lg"
                        aria-pressed={active}
                        onMouseDown={suppressLinkFocus}
                        onClick={() => selectProject(p.slug)}
                        className="hero-rail-row group/row h-auto w-full items-baseline justify-start gap-4 px-3 py-3 text-left normal-case tracking-normal"
                      >
                        <span className="hero-rail-keyline" aria-hidden />
                        <span className="index shrink-0 text-[length:var(--step--2)]" style={{ color: 'var(--row-hue)' }}>
                          {pad(i + 1)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block hero-rail-title font-display text-[length:var(--step-2)] leading-none text-fg">
                            {p.title}
                          </span>
                          <span className="mt-1 block font-sans text-[0.78rem] leading-snug text-fg-muted">
                            {p.summary.length > 90 ? `${p.summary.slice(0, 88).trimEnd()}…` : p.summary}
                          </span>
                        </span>
                        <ArrowUpRight className="hero-rail-arrow mt-1 size-3.5 shrink-0 text-fg-muted" aria-hidden />
                      </Button>
                    </li>
                  )
                })}
              </ul>
            </div>

            <div className="mt-auto flex flex-wrap items-center gap-3 pt-8 sm:gap-4">
              <Button variant="solid" fill size="md" asChild>
                <a href="#work" className="justify-center sm:justify-start">
                  Selected work
                  <CornerRightDown className="relative size-4" aria-hidden />
                </a>
              </Button>
              <Button variant="outline" size="md" asChild className="w-full justify-between sm:w-auto">
                <a href="#agents">
                  Ask the assistant
                  <ArrowUpRight className="size-4" aria-hidden />
                </a>
              </Button>
            </div>
          </div>

          <HeroSession
            key={currentProject.slug}
            project={currentProject}
            instrument={instrument}
            signalId={signalId}
            onInstrument={toggleInstrument}
          />
        </div>
      </div>
    </section>
  )
}
