import { useEffect, useState, type CSSProperties } from 'react'
import { ArrowUpRight, Check, Clock, Copy, Mail, PenLine, Send } from 'lucide-react'
import { useTransientFlag } from '@/lib/machine'
import { MetricGrid } from '@/components/ui/metric-grid'
import { SectionHead } from './SectionHead'

/*
  The closing argument. Left: the thesis restated as a call — “bring me the
  system that has to be right” — then the availability ledger, as a spec sheet.
  Right: the direct channels and a small memo block that writes to *your*
  clipboard, not to a server (the only POST on this site is /api/chat).

  Every channel row carries its own hue in --ch-hue: the icon border, the
  hover wash and the corner tile all take it, so a row lights in its subject
  colour the same way a work row does. Motion is hover-only; nothing loops.
*/

const EMAIL = 'hello@roshankhatri.dev'
const MAILTO = `mailto:${EMAIL}?subject=${encodeURIComponent('Project enquiry — via roshankhatri.dev')}`

const CHANNELS = [
  {
    key: 'email',
    label: 'Email',
    value: EMAIL,
    note: 'fastest · replies in two working days',
    hue: 'var(--hue-ts)',
    href: MAILTO,
    external: false,
    copyable: true,
    Icon: Mail,
  },
  {
    key: 'github',
    label: 'GitHub',
    value: 'github.com/roshankhatri',
    note: 'the code, and the case studies',
    hue: 'var(--hue-go)',
    href: 'https://github.com/roshankhatri',
    external: true,
    copyable: false,
    Icon: GitHubGlyph,
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    value: 'in/roshankhatri',
    note: 'the quieter version of this page',
    hue: 'var(--hue-react)',
    href: 'https://linkedin.com/in/roshankhatri',
    external: true,
    copyable: false,
    Icon: LinkedInGlyph,
  },
  {
    key: 'resume',
    label: 'Résumé',
    value: 'CV & full history',
    note: 'one page, printable',
    hue: 'var(--hue-python)',
    href: '/resume',
    external: false,
    copyable: false,
    Icon: PenLine,
  },
] as const

/* Which copy target just succeeded — one machine, so "address copied" and
   "draft copied" can never both be true, and the 1.8s reset is owned by the
   hook (cancelled on unmount) rather than a loose timeout. */
type CopyKey = 'email' | 'memo'

/** The reader's wall clock, re-checked every minute so it never spoils. */
function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(id)
  }, [])
  return now
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false // clipboard blocked — every row still has a working path
  }
}

const CRIB = [
  ['what it is', 'one or two lines — the product, not the pitch'],
  ['what breaks', 'the condition the system fails on today'],
  ['when', 'a date you actually care about'],
]

export function Contact() {
  const copy = useTransientFlag<CopyKey>(1800)
  const copied = copy.active
  const now = useClock()

  /** Flash `kind` only if the clipboard write actually lands. */
  const onCopy = (kind: CopyKey, text: string) => void copy.settle(kind, () => copyText(text))

  const crib = CRIB.map(([k, v]) => `- ${k}: ${v}`).join('\n')
  const memo = `To: ${EMAIL}\nSubject: Project enquiry\n\n${crib}\n`

  return (
    <section
      id="contact"
      className="frame scroll-mt-20 py-16"
      aria-labelledby="contact-h"
      style={{ '--section-accent': 'var(--hue-node)' } as CSSProperties}
    >
      <SectionHead id="contact-h" index={5} kicker="Contact" title="Start something" />

      <div className="grid gap-12 py-12 md:grid-cols-[1.35fr_1fr] md:gap-20">
        {/* ── The ask ─────────────────────────────────────────────── */}
        <div className="min-w-0">
          <p className="label mb-6 flex items-center gap-3">
            <span className="contact-pulse size-1.5 rounded-full" aria-hidden />
            Open to new engagements · {now.getFullYear()}
          </p>

          <blockquote className="contact-statement">
            <span className="contact-quote" aria-hidden>
              “
            </span>
            <p className="font-display text-4 leading-[1.02] tracking-tight text-fg">
              Bring me the system that has to be{' '}
              <em className="contact-em">right</em>, not just shipped.
            </p>
          </blockquote>

          <p className="mt-6 max-w-[46ch] text-1 leading-relaxed text-fg-soft">
            A handful of engagements a year — usually systems with a correctness
            problem and an interface that has to earn trust. Tell me what you are
            building and what breaks under load; I will tell you honestly whether
            I am the right person.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
            <a
              href={MAILTO}
              className="cta-fill group relative isolate inline-flex h-12 items-center gap-3 overflow-hidden px-6 font-mono text-[length:var(--step--1)] uppercase tracking-[0.14em]"
            >
              <Send className="relative size-4" aria-hidden />
              <span className="relative">Start a conversation</span>
              <ArrowUpRight
                className="relative size-4 transition-transform duration-[var(--dur-2)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                aria-hidden
              />
            </a>
            <button
              type="button"
              onClick={() => onCopy('email', EMAIL)}
              className="u-link label text-fg-soft transition-colors hover:text-fg"
            >
              {copied === 'email' ? 'Copied' : 'Copy address'}
              {copied === 'email' ? (
                <Check className="size-3.5 text-success" aria-hidden />
              ) : (
                <Copy className="size-3.5 text-fg-muted" aria-hidden />
              )}
            </button>
          </div>

          {/* Availability ledger — the section's claims as a spec sheet */}
          <MetricGrid
            className="contact-facts mt-12 [&_.metric-cell]:bg-bg [&_.metric-cell]:p-4"
            items={[
              { label: 'Based in', value: 'Kathmandu, NP' },
              { label: 'Time zone', value: 'UTC+5:45' },
              { label: 'Engagements', value: '2–3 per year' },
            ]}
          />
        </div>

        {/* ── Channels, memo, clock ───────────────────────────────── */}
        <div className="min-w-0 self-start">
          <div className="contact-channels">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line pb-3">
              <p className="label">Direct channels</p>
              <p className="label">Response in two working days</p>
            </div>

            <ul>
              {CHANNELS.map((c) => (
                <li key={c.key} className="group" style={{ '--ch-hue': c.hue } as CSSProperties}>
                  {c.copyable ? (
                    <div className="contact-channel is-email group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4">
                      <button
                        type="button"
                        onClick={() => onCopy('email', c.value)}
                        className="contact-channel-body col-span-2 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-4 text-left sm:gap-4"
                        aria-label={copied === 'email' ? 'Email address copied' : `Copy email address ${c.value}`}
                      >
                        <ChannelIcon Icon={c.Icon} />
                        <span className="contact-channel-value">
                          <span className="contact-channel-label">{c.value}</span>
                          <span className="contact-channel-sub">{c.note}</span>
                        </span>
                        <span className="contact-channel-hint label flex items-center gap-1.5">
                          {copied === 'email' ? (
                            <Check className="size-3.5" aria-hidden />
                          ) : (
                            <Copy className="size-3.5" aria-hidden />
                          )}
                          <span className="hidden sm:inline">{copied === 'email' ? 'Copied' : 'Copy'}</span>
                        </span>
                      </button>
                      <a
                        href={c.href}
                        className="contact-channel-tile"
                        aria-label="Open a mail draft"
                        title={`Write to ${c.value}`}
                      >
                        <ArrowUpRight className="relative size-4" aria-hidden />
                      </a>
                    </div>
                  ) : (
                    <a
                      href={c.href}
                      {...(c.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      className="contact-channel group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-4 sm:gap-4"
                    >
                      <ChannelIcon Icon={c.Icon} />
                      <span className="contact-channel-value">
                        <span className="contact-channel-label">
                          {c.label === 'GitHub' ? c.value : `${c.label} · ${c.value}`}
                        </span>
                        <span className="contact-channel-sub">{c.note}</span>
                      </span>
                      <span className="contact-channel-tile" aria-hidden>
                        <ArrowUpRight className="relative size-4" />
                      </span>
                    </a>
                  )}
                </li>
              ))}
            </ul>

            {/* Memo block — a prepared draft the reader fills in, not a form
                that pretends to send. Copy → paste into your own mail client. */}
            <div className="contact-memo">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="label">Write the memo</p>
                <p className="label text-[0.5rem] text-fg-muted">copies to your clipboard · no server</p>
              </div>
              <ol className="contact-crib mt-3">
                {CRIB.map(([k, v], i) => (
                  <li key={k} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-2 py-1.5">
                    <span className="label text-[0.5rem] tabular" aria-hidden>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-mono text-[0.7rem] text-fg">{k}</span>
                      <span className="block text-[0.7rem] leading-snug text-fg-muted">{v}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                <a href={MAILTO} className="label flex items-center gap-1.5 text-fg-soft transition-colors hover:text-accent">
                  <span className="text-accent" aria-hidden>
                    ›
                  </span>
                  open the draft
                </a>
                <button
                  type="button"
                  onClick={() => onCopy('memo', memo)}
                  className="contact-memo-copy label flex items-center gap-1.5"
                  aria-pressed={copied === 'memo'}
                >
                  {copied === 'memo' ? (
                    <>
                      <Check className="size-3.5" aria-hidden /> Draft copied
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" aria-hidden /> Copy the template
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Wall clock — the one live number in the section, and it's honest */}
          <p className="contact-local label mt-4 flex items-center gap-2">
            <Clock className="size-3 shrink-0" aria-hidden />
            <span className="tabular">
              {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span aria-hidden>·</span>
            <span>
              {now.toLocaleDateString([], { month: 'long', day: 'numeric' })} — where you are, right now
            </span>
          </p>
        </div>
      </div>
    </section>
  )
}

function ChannelIcon({ Icon }: { Icon: React.ComponentType<{ className?: string }> }) {
  return (
    <span className="contact-channel-icon flex size-9 shrink-0 items-center justify-center border border-line" aria-hidden>
      <Icon className="size-4" />
    </span>
  )
}

/* Inline brand glyphs lead with the row hue; lucide's Mail already exists in
   the bundle, so only the two marks without a lucide equivalent get drawn. */

function GitHubGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M9 19c-4.5 1.4-4.5-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12 12 0 0 0-6.2 0C6.5 2.7 5.4 3 5.4 3a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.4c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />
    </svg>
  )
}

function LinkedInGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  )
}