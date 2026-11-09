import { lazy, Suspense, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import { MDXProvider } from '@mdx-js/react'
import { getProject, projects } from '@/lib/projects'
import { mdxComponents } from '@/components/mdx/prose'
import { MetricGrid } from '@/components/ui/metric-grid'
import { pad } from '@/lib/utils'

// One lazy component per MDX body — a case study only loads when visited.
type BodyModule = { default: React.ComponentType }
const bodyModules = import.meta.glob<BodyModule>('@/content/generated/*.body.mdx')
const bodies: Record<string, React.LazyExoticComponent<React.ComponentType>> = Object.fromEntries(
  Object.entries(bodyModules).map(([path, load]) => [
    path.split('/').pop()!.replace(/\.body\.mdx$/, ''),
    lazy(load),
  ]),
)

export function CaseStudy() {
  const { slug = '' } = useParams()
  const project = getProject(slug)
  const Body = bodies[slug]

  useEffect(() => {
    window.scrollTo(0, 0)
    if (project) document.title = `${project.title} — Roshan Khatri`
    return () => {
      document.title = 'Roshan Khatri — Software Engineer'
    }
  }, [project, slug])

  if (!project || !Body) {
    return (
      <div className="frame py-24">
        <p className="label mb-3">404</p>
        <h1 className="text-4">No such case study.</h1>
        <Link to="/" className="u-link mt-6 inline-flex text-accent">
          <ArrowLeft className="size-4" aria-hidden /> Back home
        </Link>
      </div>
    )
  }

  const others = projects.filter((p) => p.slug !== project.slug).slice(0, 2)

  return (
    <article className="frame border-t-0 py-12">
      <Link
        to="/#work"
        className="label inline-flex items-center gap-2 transition-colors hover:text-accent"
      >
        <ArrowLeft className="size-3.5" aria-hidden /> All work
      </Link>

      <header className="mt-8 border-b border-line pb-10">
        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="label mb-3">
              {project.client} <span className="mx-2 text-line-strong">/</span> {project.year}
            </p>
            <h1 className="text-6">{project.title}</h1>
            <p className="mt-4 max-w-[58ch] text-1 leading-relaxed text-fg-soft">{project.summary}</p>
          </div>
          {project.url && (
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="label inline-flex items-center gap-2 self-start text-accent"
            >
              Live <ArrowUpRight className="size-3.5" aria-hidden />
            </a>
          )}
        </div>

        {project.metrics && project.metrics.length > 0 && (
          <MetricGrid
            className="mt-10 [&_.metric-cell]:bg-bg [&_.metric-cell]:p-5"
            items={project.metrics.map((m) => ({ label: m.label, value: m.value, lead: true }))}
          />
        )}
      </header>

      <div className="grid gap-12 py-12 md:grid-cols-[minmax(0,1fr)_14rem] md:gap-16">
        <div className="min-w-0 max-w-[68ch]">
          <MDXProvider components={mdxComponents}>
            <Suspense fallback={<p className="label">Loading case study…</p>}>
              <Body />
            </Suspense>
          </MDXProvider>
        </div>

        <aside className="self-start md:sticky md:top-24">
          <p className="label mb-3">At a glance</p>
          <hr className="rule mb-4" />
          <dl className="space-y-4">
            <div>
              <dt className="label mb-1">Role</dt>
              <dd className="text-0 text-fg-soft">{project.role}</dd>
            </div>
            <div>
              <dt className="label mb-1">Year</dt>
              <dd className="font-mono text-0 tabular text-fg-soft">{project.year}</dd>
            </div>
            <div>
              <dt className="label mb-1">Stack</dt>
              <dd className="flex flex-wrap gap-x-3 gap-y-1">
                {project.stack.map((s) => (
                  <span key={s} className="font-mono text-[length:var(--step--1)] text-fg-soft">
                    {s}
                  </span>
                ))}
              </dd>
            </div>
          </dl>
        </aside>
      </div>

      <nav aria-label="More work" className="border-t border-line pt-10">
        <p className="label mb-6">Next</p>
        <ul className="grid gap-px border border-line bg-line sm:grid-cols-2">
          {others.map((p, i) => (
            <li key={p.slug} className="bg-bg">
              <Link
                to={`/work/${p.slug}`}
                className="group flex items-baseline justify-between gap-4 p-6 transition-colors hover:bg-bg-raised"
              >
                <span>
                  <span className="index mr-3">{pad(i + 1)}</span>
                  <span className="text-2 transition-colors group-hover:text-accent">{p.title}</span>
                </span>
                <ArrowUpRight className="size-4 shrink-0 text-fg-muted" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </article>
  )
}
