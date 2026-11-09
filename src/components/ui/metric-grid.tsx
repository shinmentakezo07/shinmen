import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

/*
  Measured facts, on hairlines. Metrics, availability ledgers, and case-study
  summaries are the same kind of object — a labelled reading — so they share
  one surface: a gap-px grid on --line, each cell on the paper.

  `hue` is set as --work-hue at the point where the metric is placed, so a
  consumer only has to name the project's colour once. The lead reading takes
  it as text; the rail is optional and proportional on purpose — it exists
  where the values compare, and is omitted where the label is the point.
*/

export type MetricItem = {
  label: string
  value: string
  /** 0–1: how far the rail fills. Omit for a plain cell. */
  ratio?: number
  /** Cell accent, e.g. the project hue in a work row. */
  hue?: string
  /** The first figure in a set leads at display size, in its hue. */
  lead?: boolean
}

export function MetricGrid({
  items,
  columns = 3,
  className,
}: {
  items: MetricItem[]
  /** Columns at the `sm` breakpoint; always one column below it. */
  columns?: 2 | 3
  className?: string
}) {
  return (
    <dl
      className={cn(
        'metric-grid grid gap-px border border-line bg-line',
        columns === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3',
        className,
      )}
    >
      {items.map((m) => (
        <div
          key={m.label}
          className="metric-cell bg-bg-raised px-4 py-3"
          style={{ '--work-hue': m.hue } as CSSProperties}
        >
          <dt className="label mb-1 block text-[0.55rem]">{m.label}</dt>
          <dd
            className={cn(
              'block leading-none text-fg',
              m.lead
                ? 'metric-lead font-display text-[length:var(--step-3)] tracking-tight'
                : 'font-mono text-[length:var(--step--1)] tabular',
            )}
            style={m.lead && m.hue ? { color: 'var(--work-hue)' } : undefined}
          >
            {m.value}
          </dd>
          {m.ratio !== undefined && (
            <span className="metric-rail mt-2 block h-px w-full bg-line" aria-hidden>
              <span
                className="metric-rail-fill"
                style={{
                  width: `${Math.round(Math.max(0, Math.min(1, m.ratio)) * 100)}%`,
                  background: 'var(--work-hue, var(--accent))',
                }}
              />
            </span>
          )}
        </div>
      ))}
    </dl>
  )
}
