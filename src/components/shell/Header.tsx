import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Command as CommandIcon, Moon, Sun } from 'lucide-react'
import { useTransientFlag } from '@/lib/machine'
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

/**
 * Reading progress: a spectrum hairline under the sticky header.
 *
 * Refinement loop, stated: scroll settles → samples are taken on the next two
 * frames → the hairline is declared settled. Late images and font swaps change
 * the document height *without* firing an event, and the earlier version
 * only listened to scroll/resize, so the bar could disagree with the page
 * until the next scroll. Three passes, each a rAF, are bounded and cheap.
 */
function ScrollProgress() {
  const bar = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0
      if (bar.current) bar.current.style.transform = `scaleX(${p})`
    }
    const settle = () => {
      update()
      requestAnimationFrame(() => requestAnimationFrame(update))
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    settle()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    window.addEventListener('load', settle)
    void document.fonts?.ready.then(settle)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('load', settle)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])
  return (
    <div
      ref={bar}
      className="spectrum-rule absolute inset-x-0 bottom-0 origin-left"
      style={{ transform: 'scaleX(0)' }}
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

export function Header({
  onOpenCommand,
  paletteOpen = false,
}: {
  onOpenCommand: () => void
  paletteOpen?: boolean
}) {
  const { theme, source, toggle, reset } = useTheme()
  const { pathname } = useLocation()
  const onHome = pathname === '/'
  const current = useActiveSection(onHome)
  // Press timestamps are bookkeeping, not rendered state — a ref, not a queue
  // array in useState.
  const presses = useRef<number[]>([])
  const hint = useTransientFlag<'system'>(3200)

  /**
   * Theme button, two affordances in one:
   *   · click / Enter / Space — flip the appearance (one-press action);
   *   · double click, or the visible "⇄ OS" chip — hand control back to the
   *     operating system (only offered once a choice is pinned).
   * The mode and who owns it are henceforth stated in the button's name.
   */
  const nextTheme = theme === 'light' ? 'dark' : 'light'
  const themeLabel =
    source === 'system'
      ? `Switch to ${nextTheme} mode (following your system)`
      : `Switch to ${nextTheme} mode (pinned)`

  const onThemePress = () => {
    toggle()
    if (source === 'user') {
      // Second deliberate press within the window → back to the OS.
      const now = Date.now()
      const recent = presses.current.filter((t) => now - t < 450)
      if (recent.length > 0) {
        reset()
        presses.current = []
        hint.flash('system')
        return
      }
      presses.current = [now]
    }
  }

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
            aria-expanded={paletteOpen}
            aria-keyshortcuts="Meta+K Control+K"
          >
            <CommandIcon className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">{isMac ? '⌘K' : 'Ctrl K'}</span>
          </button>

          <div className="relative ml-1 flex items-center">
            <button
              onClick={onThemePress}
              className="flex size-8 items-center justify-center border border-line transition-colors hover:border-line-strong hover:text-accent"
              aria-label={themeLabel}
              title={themeLabel}
            >
              {theme === 'light' ? (
                <Moon className="size-4" aria-hidden />
              ) : (
                <Sun className="size-4" aria-hidden />
              )}
            </button>
            {/* Ownership is part of the state: once pinned, the way back to
                following the OS is visible, not just a documented double-click. */}
            {source === 'user' && (
              <button
                onClick={() => {
                  reset()
                  hint.flash('system')
                }}
                className="label ml-1 hidden h-8 items-center border border-transparent px-1 text-[0.5rem] text-fg-muted transition-colors hover:text-accent sm:flex"
                aria-label="Follow the system appearance again"
                title="Follow the system appearance again"
              >
                ⇄ OS
              </button>
            )}
            <span
              className="label pointer-events-none absolute right-0 top-full mt-2 whitespace-nowrap bg-fg px-2 py-1 text-[0.5rem] text-bg transition-opacity duration-[var(--dur-1)]"
              style={{ opacity: hint.active ? 1 : 0 }}
              role="status"
            >
              Following system appearance
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
