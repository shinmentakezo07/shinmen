import { ChevronDown } from 'lucide-react'
import { hash } from '@/lib/utils'
import type { ProjectMeta } from '@/lib/projects'
import { MetricGrid } from './metric-grid'

/*
  The project instrument: the measured facts of a case study, read the way they
  were measured. Metrics and dependencies are drawn on hairlines so they
  compare at a glance; the latency curve is the only illustrative element and
  it is labelled as such, in the same markup, every time.

  It is a Button with aria-expanded rather than a Dialog on purpose: the
  disclosure sits inside the hero's reading flow, in front of a case study that
  is one click away. A modal would cost a focus trap, a scroll lock, and a
  return target for three lines of prose.
*/

function numeric(value: string) {
  const n = Number.parseFloat(value.replace(/[^\d.]/g, ''))
  return Number.isFinite(n) ? n : 0
}

/** A 40-sample run: a ramp, then noise that never exceeds the measured level. */
function curve(seed: string, level: number) {
  const w = 200
  const h = 48
  const n = 40
  let x = hash(seed) || 1
  const rand = () => {
    x ^= x << 13
    x ^= x >>> 17
    x ^= x << 5
    return ((x >>> 0) % 1000) / 1000
  }
  const pts: string[] = []
  for (let i = 0; i < n; i++) {
    const ramp = Math.min(1, (i + 1) / (n * 0.55))
    const v = Math.min(1, (0.42 + 0.58 * rand()) * ramp)
    pts.push(`${((i / (n - 1)) * w).toFixed(1)},${(h - Math.max(4, v * (h - 4))).toFixed(1)}`)
  }
  const line = pts.join(' ')
  return { w, h, line, area: `0,${h} ${line} ${w},${h}`, level }
}

export function ProjectInstrument({
  project,
  on,
  signalId,
  onToggle,
}: {
  project: ProjectMeta
  on: boolean
  signalId: string
  onToggle: () => void
}) {
  const metrics = project.metrics?.slice(0, 3) ?? []
  const deps = project.stack.slice(0, 8)
  const latency = metrics.find((m) => /p\d{2}/i.test(m.label))
  const data = latency ? curve(project.slug, 0.7) : null
  const peak = Math.max(...metrics.map((m) => numeric(m.value)), 1)

  return (
    <div className="hero-instrument" data-on={on}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={on}
        aria-controls={signalId}
        className="hero-instrument-trigger group/trigger flex w-full items-center justify-between gap-4 border-b border-line px-4 py-2.5 text-left"
      >
        <span className="label flex items-center gap-2 text-[0.6rem] transition-colors group-hover/trigger:text-fg">
          <span className="hero-instrument-mark" aria-hidden />
          Read the measurements
        </span>
        <ChevronDown
          className="hero-instrument-chevron size-3.5 text-fg-muted transition-colors group-hover/trigger:text-accent"
          aria-hidden
        />
      </button>

      {data && (
        <div className="hero-curve relative overflow-hidden border-b border-line" aria-hidden>
          <svg viewBox={`0 0 ${data.w} ${data.h}`} preserveAspectRatio="none" className="block h-12 w-full">
            <polyline className="hero-curve-area" points={data.area} />
            <polyline className="hero-curve-line" points={data.line} />
          </svg>
          <span className="label absolute bottom-1.5 left-4 text-[0.5rem] text-fg-muted">
            p95 · illustrative shape, measured value below
          </span>
        </div>
      )}

      <div id={signalId}>
        <MetricGrid
          className="border-0 border-t border-line"
          items={metrics.map((m) => ({
            label: m.label,
            value: m.value,
            ratio: numeric(m.value) / peak,
          }))}
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-line px-4 py-2.5">
        <span className="label text-[0.5rem] text-fg-muted">built with</span>
        {deps.map((d) => (
          <span key={d} className="label text-[0.55rem] text-fg-soft">
            {d}
          </span>
        ))}
      </div>
    </div>
  )
}
