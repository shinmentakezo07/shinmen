import { useState, type CSSProperties } from 'react'
import { ArrowUpRight, Check, Copy } from 'lucide-react'
import { SectionHead } from './SectionHead'

const EMAIL = 'hello@roshankhatri.dev'

export function Contact() {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(EMAIL)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard unavailable — the mailto link still works */
    }
  }

  return (
    <section
      id="contact"
      className="frame scroll-mt-20 py-16"
      aria-labelledby="contact-h"
      style={{ '--section-accent': 'var(--hue-node)' } as CSSProperties}
    >
      <SectionHead id="contact-h" index={5} kicker="Contact" title="Start something" />

      <div className="grid gap-10 py-12 md:grid-cols-[1.2fr_1fr] md:gap-20">
        <div>
          <p className="max-w-[34ch] text-3 leading-[1.15] text-fg">
            I take on a handful of engagements a year — usually systems with a
            correctness problem and an interface that has to earn trust.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={`mailto:${EMAIL}?subject=Project%20enquiry`}
              className="inline-flex h-11 items-center gap-2 bg-fg px-5 font-mono text-[length:var(--step--1)] uppercase tracking-[0.12em] text-bg transition-colors hover:bg-accent hover:text-accent-ink"
            >
              Email me
              <ArrowUpRight className="size-4" aria-hidden />
            </a>
            <button
              onClick={copy}
              className="inline-flex h-11 items-center gap-2 border border-line-strong px-5 font-mono text-[length:var(--step--1)] uppercase tracking-[0.12em] text-fg transition-colors hover:border-accent hover:text-accent"
            >
              {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              {copied ? 'Copied' : 'Copy address'}
            </button>
          </div>
        </div>

        <dl className="divide-y divide-line self-start border-y border-line">
          {[
            ['Email', EMAIL],
            ['Location', 'Kathmandu, Nepal (UTC+5:45)'],
            ['Availability', 'Rolling · select engagements'],
            ['Response', 'Within two working days'],
          ].map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-6 py-4">
              <dt className="label">{k}</dt>
              <dd className="text-right font-mono text-[length:var(--step--1)] text-fg-soft">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
