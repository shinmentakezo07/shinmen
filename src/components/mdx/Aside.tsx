export function Aside({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <aside className="my-8 border-l-2 border-accent pl-5">
      <p className="label mb-2 text-accent">{label}</p>
      <div className="text-1 leading-snug text-fg-soft [&>p]:m-0">{children}</div>
    </aside>
  )
}
