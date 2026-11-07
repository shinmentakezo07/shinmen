import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Command as CommandIcon, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

const SECTIONS = [
  ['Work', '#work'],
  ['Toolbelt', '#toolbelt'],
  ['About', '#about'],
  ['Agents', '#agents'],
  ['Contact', '#contact'],
] as const

/** Scroll-spy: the section nearest the top third of the viewport is current. */
function useActiveSection(enabled: boolean) {
  const [current, setCurrent] = useState<string | null>(null)
  useEffect(() => {
    if (!enabled) return
    const sections = SECTIONS.map(([, href]) => document.querySelector(href)).filter(
      (el): el is Element => el !== null,
    )
    if (sections.length === 0) return
    const visible = new Set<string>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target.id)
          else visible.delete(e.target.id)
        }
        const first = SECTIONS.find(([, href]) => visible.has(href.slice(1)))
        setCurrent(first ? first[1].slice(1) : null)
      },
      { rootMargin: '-20% 0px -55% 0px' },
    )
    sections.forEach((s) => io.observe(s))
    return () => io.disconnect()
  }, [enabled])
  return current
}

/** Reading progress: a spectrum hairline under the sticky header. */
function ScrollProgress() {
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])
  return (
    <div
      className="spectrum-rule absolute inset-x-0 bottom-0 origin-left"
      style={{ transform: `scaleX(${progress})` }}
      aria-hidden
    />
  )
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn('group inline-flex items-baseline gap-2', className)}
      aria-label="Roshan Khatri, home"
    >
      <span className="font-display text-[1.35rem] leading-none tracking-tight">Roshan&nbsp;Khatri</span>
      <span className="label hidden text-[0.55rem] transition-colors group-hover:text-accent sm:block">
        Engineer
      </span>
    </Link>
  )
}

export function Header({ onOpenCommand }: { onOpenCommand: () => void }) {
  const { theme, toggle } = useTheme()
  const { pathname } = useLocation()
  const onHome = pathname === '/'
  const current = useActiveSection(onHome)

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
      <ScrollProgress />
      <div className="frame flex h-16 items-center justify-between gap-4">
        <Wordmark />

        <div className="flex items-center gap-1">
          {onHome && (
            <nav aria-label="Sections" className="mr-2 hidden items-center gap-1 md:flex">
              {SECTIONS.map(([label, href]) => {
                const active = current === href.slice(1)
                return (
                  <a
                    key={href}
                    href={href}
                    aria-current={active ? 'true' : undefined}
                    className={cn(
                      'label relative px-3 py-2 transition-colors hover:text-accent',
                      active && 'text-fg',
                    )}
                  >
                    {label}
                    <span
                      className={cn(
                        'absolute inset-x-3 bottom-0.5 h-px origin-left bg-accent transition-transform duration-[var(--dur-2)]',
                        active ? 'scale-x-100' : 'scale-x-0',
                      )}
                      aria-hidden
                    />
                  </a>
                )
              })}
            </nav>
          )}

          <button
            onClick={onOpenCommand}
            className="label flex items-center gap-2 border border-line px-2.5 py-1.5 transition-colors hover:border-line-strong hover:text-fg"
            aria-label="Open command menu"
          >
            <CommandIcon className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">{isMac ? '⌘K' : 'Ctrl K'}</span>
          </button>

          <button
            onClick={toggle}
            className="ml-1 flex size-8 items-center justify-center border border-line transition-colors hover:border-line-strong hover:text-accent"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? (
              <Moon className="size-4" aria-hidden />
            ) : (
              <Sun className="size-4" aria-hidden />
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
