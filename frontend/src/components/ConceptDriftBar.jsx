import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TAG_COLORS, MODEL_META, ALL_TAGS, computeTagProportions } from '../utils/tagColors'

export default function ConceptDriftBar({ timelines }) {
  const models = Object.keys(MODEL_META).filter(m => (timelines[m]?.length ?? 0) > 0)
  if (models.length === 0) return null

  const data = models.map(model => {
    const p = computeTagProportions(timelines[model] ?? [])
    const row = { model: MODEL_META[model].label }
    for (const tag of ALL_TAGS) row[tag] = Math.round((p[tag] ?? 0) * 100)
    return row
  })

  return (
    <div>
      <h3 className="font-display text-xs text-muted uppercase tracking-widest mb-1">Tag composition per model</h3>
      <p className="text-xs text-muted font-mono mb-3">
        % of changes per category · tags are not mutually exclusive — proportions may sum above 100%
      </p>
      <ResponsiveContainer width="100%" height={models.length * 48 + 40}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, left: 50, bottom: 0 }}>
          <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fill: '#8b949e', fontSize: 10, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="model" width={48} tick={{ fill: '#8b949e', fontSize: 11, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 4 }}
            itemStyle={{ fontFamily: 'IBM Plex Mono', fontSize: 10 }}
            formatter={v => [`${v}%`]}
            cursor={{ fill: '#21262d40' }}
          />
          <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'IBM Plex Mono', color: '#8b949e' }} />
          {ALL_TAGS.map(tag => (
            <Bar key={tag} dataKey={tag} name={tag} stackId="a" fill={TAG_COLORS[tag]} maxBarSize={20} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
