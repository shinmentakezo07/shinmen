import { useEffect, useState, type CSSProperties } from 'react'
import { getGithubStats, type GithubStats } from '@/lib/api'
import { SectionHead } from './SectionHead'
import { Stagger, StaggerItem } from '@/components/ui/motion'

const craft = [
  ['01', 'Correctness first', 'I would rather ship a smaller system that holds its invariants than a large one that mostly does.'],
  ['02', 'Boring where it counts', 'Postgres, queues, and typed boundaries. Novelty is spent on the problem, not the plumbing.'],
  ['03', 'Interfaces explain themselves', 'If the UI needs a tutorial, the model behind it is probably wrong.'],
]

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
      <SectionHead id="about-h" index={3} kicker="About" title="How I work" />

      <div className="grid gap-14 py-12 md:grid-cols-[1fr_1fr] md:gap-20">
        <div className="space-y-6 text-1 leading-relaxed text-fg-soft">
          <p>
            I have spent seven years between the database and the browser — mostly
            at small companies where the same person designs the schema and argues
            about kerning. I like that range. Most product problems are not
            frontend problems or backend problems; they are <em className="text-fg not-italic">boundary</em>{' '}
            problems, and someone has to own the whole boundary.
          </p>
          <p>
            My work tends toward consequences: ledgers that cannot be unbalanced,
            dispatch systems that cannot double-assign, search that does not leak.
            Agents write more of the code every year; the judgement about what is
            correct — and the review that enforces it — stays mine.
          </p>
        </div>

        <Stagger as="ul" className="space-y-6">
          {craft.map(([n, title, body]) => (
            <StaggerItem as="li" key={n} className="grid grid-cols-[2.5rem_1fr] gap-4">
              <span className="index">{n}</span>
              <div>
                <h3 className="font-mono text-0 uppercase tracking-[0.06em] text-fg">{title}</h3>
                <p className="mt-1 text-0 text-fg-muted">{body}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>

      {/* Live numbers from the Go API. Rendered only when present, never faked. */}
      {stats && (
        <dl className="grid grid-cols-2 border-t border-line pt-8 sm:grid-cols-4">
          {[
            ['Public repos', stats.publicRepos],
            ['Followers', stats.followers],
            ['Contributions / yr', stats.contributionsLastYear ?? '—'],
            ['GitHub', `@${stats.user}`],
          ].map(([k, v]) => (
            <div key={String(k)} className="py-2">
              <dt className="label mb-1">{k}</dt>
              <dd className="font-mono text-2 tabular text-fg">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}
