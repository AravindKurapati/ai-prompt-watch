export default function StatsBar({ data }) {
  if (!data) return null
  const total = Object.values(data.stats).reduce((s, m) => s + m.total_changes, 0)
  const updated = data.generated_at?.slice(0, 10) ?? '—'
  return (
    <div className="flex items-center gap-4 px-6 py-2.5 border-b border-border-dim text-muted font-mono text-xs">
      <span><span className="text-primary">{data.models.length}</span> models</span>
      <span className="text-border-dim">·</span>
      <span><span className="text-primary">{total}</span> changes</span>
      <span className="text-border-dim">·</span>
      <span>updated <span className="text-primary">{updated}</span></span>
    </div>
  )
}
