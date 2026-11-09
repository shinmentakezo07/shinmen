import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { projects, projectHue } from '@/lib/projects'
import { Stagger, StaggerItem } from '@/components/ui/motion'
import { MetricGrid } from '@/components/ui/metric-grid'
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
          <StaggerItem as="li" key={p.slug} className="work-row group/row" style={rowStyle(p.slug)}>
            <Link
              to={`/work/${p.slug}`}
              className="group relative isolate grid grid-cols-[2rem_minmax(0,1fr)_auto] items-start gap-x-4 gap-y-4 py-8 md:grid-cols-[3rem_minmax(0,1fr)_12rem_auto] md:items-baseline md:gap-8 md:py-10"
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

              {/* Metrics: primary figure leading in the row hue, then the spec column */}
              <div className="col-start-2 row-start-2 md:col-start-auto md:row-start-auto">
                <MetricGrid
                  columns={2}
                  className="work-metrics md:border-0 md:bg-transparent"
                  items={[
                    ...(p.metrics?.slice(0, 2) ?? []).map((mtr, j) => ({
                      label: mtr.label,
                      value: mtr.value,
                      lead: j === 0,
                    })),
                    { label: 'Year', value: String(p.year) },
                  ]}
                />
              </div>

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