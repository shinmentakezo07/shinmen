import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { projects, projectHue } from '@/lib/projects'
import { Stagger, StaggerItem } from '@/components/ui/motion'
import { SectionHead } from './SectionHead'
import { pad } from '@/lib/utils'

/*
  The work list is the site's centrepiece: a numbered table leading with each
  project's headline metric. Rows are the navigation — no cards, no images.
*/
export function Work() {
  return (
    <section id="work" className="frame scroll-mt-20 border-b border-line py-16" aria-labelledby="work-h">
      <SectionHead
        id="work-h"
        index={1}
        kicker="Selected work"
        title="Case studies"
        note={`${pad(projects.length)} engagements shown`}
      />

      <Stagger as="ul" className="divide-y divide-line border-b border-line">
        {projects.map((p, i) => (
          <StaggerItem as="li" key={p.slug}>
            <Link
              to={`/work/${p.slug}`}
              className="group grid grid-cols-[2rem_minmax(0,1fr)_auto] items-start gap-x-4 gap-y-4 py-8 transition-colors duration-[var(--dur-2)] md:grid-cols-[3rem_1fr_minmax(0,22ch)_auto] md:items-baseline md:gap-8"
            >
              <span className="index tabular" style={{ color: projectHue(p.slug) }}>{pad(i + 1)}</span>

              <div className="min-w-0">
                <h3 className="text-3 text-fg transition-colors duration-[var(--dur-1)] group-hover:text-accent">
                  {p.title}
                </h3>
                <p className="mt-2 max-w-[52ch] text-0 leading-snug text-fg-muted">{p.summary}</p>

                {/* Touch screens see the stack immediately; hover-capable
                    pointers get the progressive reveal without hiding content. */}
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 transition-opacity duration-[var(--dur-2)] [@media(hover:hover)_and_(pointer:fine)]:opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">
                  <span className="label text-[0.62rem]">{p.role}</span>
                  <span className="label text-[0.62rem] text-line-strong" aria-hidden>
                    ·
                  </span>
                  {p.stack.slice(0, 4).map((s) => (
                    <span key={s} className="label text-[0.62rem] text-fg-soft">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <dl className="col-start-2 row-start-2 flex flex-wrap items-end gap-x-8 gap-y-3 md:col-start-auto md:row-start-auto md:block">
                {p.metrics?.[0] && (
                  <div>
                    <dt className="label mb-1">{p.metrics[0].label}</dt>
                    <dd
                      className="font-mono text-3 tabular leading-none transition-colors duration-[var(--dur-2)] md:text-2"
                      style={{ color: projectHue(p.slug) }}
                    >
                      {p.metrics[0].value}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="label mb-1">Year</dt>
                  <dd className="font-mono text-0 tabular text-fg-soft">{p.year}</dd>
                </div>
              </dl>

              <span
                className="col-start-3 row-start-1 flex size-10 items-center justify-center border border-line text-fg-muted transition-all duration-[var(--dur-2)] group-hover:border-accent group-hover:bg-accent group-hover:text-accent-ink md:col-start-auto md:row-start-auto"
                aria-hidden
              >
                <ArrowUpRight className="size-4 transition-transform duration-[var(--dur-2)] group-hover:rotate-0" />
              </span>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  )
}
