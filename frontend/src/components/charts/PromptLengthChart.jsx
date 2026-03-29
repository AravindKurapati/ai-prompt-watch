import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { MODEL_META } from '../../utils/tagColors'

const TOOLTIP = {
  contentStyle: { background: '#161b22', border: '1px solid #21262d', borderRadius: 4 },
  labelStyle:   { color: '#e6edf3', fontFamily: 'IBM Plex Mono', fontSize: 10 },
  itemStyle:    { fontFamily: 'IBM Plex Mono', fontSize: 10 },
  cursor:       { stroke: '#21262d' },
}

export default function PromptLengthChart({ timelines }) {
  const allDates = new Set()
  const byModel = {}

  for (const [model, entries] of Object.entries(timelines)) {
    if (!entries || entries.length < 2) continue
    byModel[model] = {}
    for (const entry of entries) {
      if (entry.prompt_length != null) {
        allDates.add(entry.date)
        byModel[model][entry.date] = entry.prompt_length
      }
    }
  }

  const models = Object.keys(byModel)
  if (models.length === 0) return (
    <div>
      <h3 className="font-display text-xs text-muted uppercase tracking-widest mb-3">Prompt length over time</h3>
      <p className="text-muted font-mono text-xs">No prompt length data available yet. Re-run the pipeline to generate it.</p>
    </div>
  )

  const chartData = [...allDates].sort().map(date => {
    const point = { date }
    for (const m of models) {
      if (byModel[m][date] != null) point[m] = byModel[m][date]
    }
    return point
  })

  return (
    <div>
      <h3 className="font-display text-xs text-muted uppercase tracking-widest mb-3">Prompt length over time</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <XAxis dataKey="date" tick={{ fill: '#8b949e', fontSize: 10, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#8b949e', fontSize: 10, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
          <Tooltip {...TOOLTIP} />
          <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'IBM Plex Mono', color: '#8b949e' }} />
          {models.map(m => (
            <Line key={m} type="monotone" dataKey={m} name={MODEL_META[m]?.label ?? m}
              stroke={MODEL_META[m]?.color ?? '#8b949e'} strokeWidth={1.5} dot={false} connectNulls={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
