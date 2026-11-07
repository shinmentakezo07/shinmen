import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'

const links = [
  { label: 'GitHub', href: 'https://github.com/roshankhatri' },
  { label: 'LinkedIn', href: 'https://linkedin.com/in/roshankhatri' },
  { label: 'Résumé', href: '/resume' },
  { label: 'Email', href: 'mailto:hello@roshankhatri.dev' },
]

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="frame grid gap-10 py-12 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="label mb-3">Elsewhere</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {links.map((l) => (
              <li key={l.label}>
                {l.href === '/resume' ? (
                  <Link to={l.href} className="u-link text-1 text-fg-soft transition-colors hover:text-fg">
                    {l.label}
                    <ArrowUpRight className="size-3.5 text-fg-muted" aria-hidden />
                  </Link>
                ) : (
                  <a
                    href={l.href}
                    className="u-link text-1 text-fg-soft transition-colors hover:text-fg"
                    {...(l.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  >
                    {l.label}
                    <ArrowUpRight className="size-3.5 text-fg-muted" aria-hidden />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="md:text-right">
          <p className="label">
            Built with React, Go &amp; a lot of restraint
          </p>
          <p className="label mt-1">
            © {new Date().getFullYear()} Roshan Khatri · All numbers are real
          </p>
        </div>
      </div>
    </footer>
  )
}
