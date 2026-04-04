import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { MODEL_META } from '../../utils/tagColors'

const TOOLTIP = {
  contentStyle: { background: '#161b22', border: '1px solid #21262d', borderRadius: 4 },
  labelStyle:   { color: '#e6edf3', fontFamily: 'IBM Plex Mono', fontSize: 11 },
  itemStyle:    { color: '#8b949e', fontFamily: 'IBM Plex Mono', fontSize: 11 },
  cursor:       { fill: '#21262d' },
}

export default function ChangesBarChart({ stats, height = 160 }) {
  const data = Object.entries(stats).map(([key, s]) => ({
    name:    MODEL_META[key]?.label ?? key,
    changes: s.total_changes,
    color:   MODEL_META[key]?.color ?? '#8b949e',
  }))

  return (
    <div>
      <h3 className="font-display text-xs text-muted uppercase tracking-widest mb-3">Changes per model</h3>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fill: '#8b949e', fontSize: 11, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fill: '#8b949e', fontSize: 11, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
          <Tooltip {...TOOLTIP} />
          <Bar dataKey="changes" radius={[2, 2, 0, 0]}>
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
