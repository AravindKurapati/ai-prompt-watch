import { MODEL_META } from '../../utils/tagColors'

function heatColor(n) {
  if (n === 0) return '#0d1117'
  if (n === 1) return '#0e4429'
  if (n === 2) return '#006d32'
  if (n <= 4) return '#26a641'
  return '#3fb950'
}

export default function HeatmapChart({ timelines }) {
  const allMonths = new Set()
  const modelData = {}

  for (const [model, entries] of Object.entries(timelines)) {
    modelData[model] = {}
    for (const entry of (entries || [])) {
      const month = entry.date?.slice(0, 7)
      if (month) {
        allMonths.add(month)
        modelData[model][month] = (modelData[model][month] ?? 0) + 1
      }
    }
  }

  const months = [...allMonths].sort()
  const models = Object.keys(MODEL_META).filter(m => (timelines[m]?.length ?? 0) > 0)

  if (months.length === 0) return null

  return (
    <div>
      <h3 className="font-display text-xs text-muted uppercase tracking-widest mb-3">Changes by month</h3>
      <div className="overflow-x-auto">
        <table className="text-xs font-mono border-separate" style={{ borderSpacing: 3 }}>
          <thead>
            <tr>
              <th className="w-20 text-right pr-3 font-normal text-muted" />
              {months.map(m => (
                <th key={m} className="font-normal text-muted px-0.5" style={{ minWidth: 26 }}>
                  {m.slice(5)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {models.map(model => (
              <tr key={model}>
                <td className="text-right pr-3 text-muted">{MODEL_META[model].label}</td>
                {months.map(m => {
                  const n = modelData[model]?.[m] ?? 0
                  return (
                    <td key={m} title={`${n} change${n !== 1 ? 's' : ''}`}>
                      <div className="rounded-sm" style={{ width: 22, height: 22, background: heatColor(n) }} />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
