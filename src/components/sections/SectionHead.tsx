import { pad } from '@/lib/utils'

export function SectionHead({
  index,
  kicker,
  title,
  note,
  id,
}: {
  index: number
  kicker: string
  title: string
  note?: string
  id: string
}) {
  return (
    <div className="grid gap-6 border-b border-line pb-6 md:grid-cols-[auto_1fr_auto] md:items-end">
      <span className="index">{pad(index)}</span>
      <div>
        <p className="label mb-2" style={{ color: 'var(--section-accent, var(--fg-muted))' }}>
          {kicker}
        </p>
        <h2 id={id} className="text-4">
          {title}
        </h2>
      </div>
      {note && <p className="label max-w-[24ch] md:text-right">{note}</p>}
    </div>
  )
}
