import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { projects, projectHue } from '@/lib/projects'
import { Stagger, StaggerItem } from '@/components/ui/motion'
import { SectionHead } from './SectionHead'
import { pad } from '@/lib/utils'

/*
  The work list is the site's centrepiece: a numbered table leading with each
  project's headline metric. Rows are the navigation — no cards, no images.

  Each row carries its own hue as `--row-hue`: the index, the metric, the
  leading marker and the hover wash all draw from it, so a row announces its
  subject before you read a word. Hover moves the row — genuine focus — rather
  than only swapping a colour; reduced-motion keeps the colour, drops the move.
*/
const rowStyle = (slug: string) => ({ '--row-hue': projectHue(slug) }) as CSSProperties

export function Work() {
  return (
    <section
      id="work"
      className="frame scroll-mt-20 border-b border-line py-16"
      aria-labelledby="work-h"
      style={{ '--section-accent': 'var(--hue-react)' } as CSSProperties}
    >
      <SectionHead
        id="work-h"
        index={1}
        kicker="Selected work"
        title="Case studies"
        note={`${pad(projects.length)} engagements shown`}
      />

      <Stagger as="ul" className="work-list border-b border-line">
        {projects.map((p, i) => (
          <StaggerItem as="li" key={p.slug} className="work-row" style={rowStyle(p.slug)}>
            <Link
              to={`/work/${p.slug}`}
              className="group relative grid grid-cols-[2rem_minmax(0,1fr)_auto] items-start gap-x-4 gap-y-4 py-8 md:grid-cols-[3rem_minmax(0,1fr)_12rem_auto] md:items-baseline md:gap-8 md:py-10"
            >
              {/* Hue keyline: a short vertical mark that grows to full row height on hover */}
              <span className="work-keyline" aria-hidden />

              <span
                className="index relative tabular transition-transform duration-[var(--dur-2)] group-hover:-translate-y-0.5"
                style={{ color: 'var(--row-hue)' }}
              >
                {pad(i + 1)}
              </span>

              <div className="min-w-0">
                <h3 className="relative inline-block text-3 text-fg transition-colors duration-[var(--dur-1)] group-hover:text-accent">
                  {p.title}
                  <span className="work-underline" aria-hidden />
                </h3>
                <p className="mt-2 max-w-[52ch] text-0 leading-snug text-fg-muted">{p.summary}</p>

                {/* Touch screens see the stack immediately; hover-capable
                    pointers get the progressive reveal without hiding content. */}
                <div className="work-meta mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 transition-opacity duration-[var(--dur-2)]">
                  <span className="label text-[0.62rem] text-fg-soft">{p.role}</span>
                  <span className="h-3 w-px bg-line" aria-hidden />
                  {p.stack.slice(0, 4).map((s) => (
                    <span key={s} className="work-chip label text-[0.62rem] text-fg-soft">
                      {s}
                    </span>
                  ))}
                  {p.stack.length > 4 && (
                    <span className="label text-[0.62rem] text-fg-muted">+{p.stack.length - 4}</span>
                  )}
                </div>
              </div>

              {/* Metrics: primary figure in the row hue, the rest as a quiet spec column */}
              <dl className="col-start-2 row-start-2 flex flex-wrap items-end gap-x-8 gap-y-3 md:col-start-auto md:row-start-auto md:block md:space-y-4 md:border-l md:border-line md:pl-6">
                {p.metrics?.slice(0, 2).map((mtr, j) => (
                  <div key={mtr.label}>
                    <dt className="label mb-1">{mtr.label}</dt>
                    <dd
                      className={
                        j === 0
                          ? 'font-mono text-3 tabular leading-none md:text-2'
                          : 'font-mono text-0 tabular leading-none text-fg-soft'
                      }
                      style={j === 0 ? { color: 'var(--row-hue)' } : undefined}
                    >
                      {mtr.value}
                    </dd>
                  </div>
                ))}
                <div>
                  <dt className="label mb-1">Year</dt>
                  <dd className="font-mono text-0 tabular text-fg-muted">{p.year}</dd>
                </div>
              </dl>

              <span
                className="relative col-start-3 row-start-1 flex size-10 items-center justify-center overflow-hidden border border-line text-fg-muted transition-colors duration-[var(--dur-2)] group-hover:border-accent group-hover:text-accent-ink md:col-start-auto md:row-start-auto"
                aria-hidden
              >
                <span className="work-swatch absolute inset-0" />
                <ArrowUpRight className="relative size-4 transition-transform duration-[var(--dur-2)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </span>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  )
}
