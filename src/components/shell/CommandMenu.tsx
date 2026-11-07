import { useState } from 'react'
import { Command } from 'cmdk'
import { useNavigate } from 'react-router-dom'
import {
  ArrowUpRight,
  Code,
  Command as CommandIcon,
  Copy,
  Mail,
  Moon,
  Sun,
  Terminal,
} from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useTheme } from '@/lib/theme'
import { projects } from '@/lib/projects'

const nav = [
  { label: 'Work', to: '#work' },
  { label: 'Toolbelt', to: '#toolbelt' },
  { label: 'About', to: '#about' },
  { label: 'Agents', to: '#agents' },
  { label: 'Contact', to: '#contact' },
]

const itemClass =
  'flex items-center gap-3 px-4 py-2.5 text-[length:var(--step--1)] cursor-pointer aria-selected:bg-accent-quiet aria-selected:text-accent [&_svg]:size-4 [&_svg]:shrink-0'

export function CommandMenu({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const [copied, setCopied] = useState(false)

  const run = (fn: () => void) => {
    onOpenChange(false)
    fn()
  }

  const go = (hash: string) => {
    // Route through the router so ScrollToHash can wait for the home page to
    // mount; only scroll directly when the target hash is already current.
    if (window.location.pathname !== '/' || window.location.hash !== hash) {
      navigate({ pathname: '/', hash })
      return
    }
    document.getElementById(hash.slice(1))?.scrollIntoView()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0" aria-describedby={undefined}>
        <DialogTitle className="sr-only">Command menu</DialogTitle>
        <Command
          loop
          label="Command menu"
          className="[&_[cmdk-group-heading]]:label [&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1"
        >
          <div className="flex items-center gap-3 border-b border-line px-4">
            <CommandIcon className="size-4 text-fg-muted" aria-hidden />
            <Command.Input
              autoFocus
              placeholder="Jump to, toggle, copy…"
              className="h-[3.25rem] w-full bg-transparent text-1 outline-none placeholder:text-fg-muted"
            />
          </div>

          <Command.List className="max-h-[60vh] overflow-y-auto py-2 [&_[cmdk-group]]:py-1">
            <Command.Empty className="px-4 py-8 text-center text-[length:var(--step--1)] text-fg-muted">
              Nothing matches. Try “work”, “dark”, or “email”.
            </Command.Empty>

            <Command.Group heading="Sections">
              {nav.map((n) => (
                <Command.Item key={n.to} className={itemClass} onSelect={() => run(() => go(n.to))}>
                  <Terminal aria-hidden />
                  {n.label}
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="Case studies">
              {projects.map((p) => (
                <Command.Item
                  key={p.slug}
                  value={`${p.title} ${p.slug}`}
                  keywords={[p.title, p.slug, 'case study', 'work', 'project']}
                  className={itemClass}
                  onSelect={() => run(() => navigate(`/work/${p.slug}`))}
                >
                  <ArrowUpRight aria-hidden />
                  <span className="flex-1">{p.title}</span>
                  <span className="label text-[0.6rem]">{p.year}</span>
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="Actions">
              <Command.Item
                value="toggle theme dark light appearance"
                className={itemClass}
                onSelect={() => run(toggle)}
              >
                {theme === 'light' ? <Moon aria-hidden /> : <Sun aria-hidden />}
                Toggle appearance
              </Command.Item>
              <Command.Item
                value="Résumé"
                keywords={['resume', 'cv', 'experience', 'printable', 'pdf']}
                className={itemClass}
                onSelect={() => run(() => navigate('/resume'))}
              >
                <ArrowUpRight aria-hidden />
                Résumé
              </Command.Item>
              <Command.Item
                value="copy email address contact"
                className={itemClass}
                onSelect={() =>
                  run(async () => {
                    try {
                      await navigator.clipboard.writeText('hello@roshankhatri.dev')
                      setCopied(true)
                      setTimeout(() => setCopied(false), 1600)
                    } catch {
                      /* clipboard blocked */
                    }
                  })
                }
              >
                <Copy aria-hidden />
                {copied ? 'Copied to clipboard' : 'Copy email address'}
              </Command.Item>
              <Command.Item
                value="open github source code"
                className={itemClass}
                onSelect={() =>
                  run(() => window.open('https://github.com/roshankhatri', '_blank', 'noopener'))
                }
              >
                <Code aria-hidden />
                Open GitHub
              </Command.Item>
              <Command.Item
                value="send email mail contact"
                className={itemClass}
                onSelect={() => run(() => (window.location.href = 'mailto:hello@roshankhatri.dev'))}
              >
                <Mail aria-hidden />
                Compose email
              </Command.Item>
            </Command.Group>
          </Command.List>

          <div className="flex items-center justify-between border-t border-line px-4 py-2.5">
            <span className="label text-[0.6rem]">Navigate ↑↓ · Select ⏎ · Close esc</span>
            <span className="label text-[0.6rem] text-accent">⌘K</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
