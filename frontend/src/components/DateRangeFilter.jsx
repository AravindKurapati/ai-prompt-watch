const PRESETS = [
  { id: 'all', label: 'All time', days: null },
  { id: '30', label: '30 days', days: 30 },
  { id: '90', label: '90 days', days: 90 },
  { id: '180', label: '180 days', days: 180 },
]

export default function DateRangeFilter({ range, onChange, latestDate }) {
  function applyPreset(preset) {
    if (!preset.days || !latestDate) {
      onChange({ preset: preset.id, start: '', end: '' })
      return
    }
    const end = new Date(`${latestDate}T00:00:00`)
    const start = new Date(end)
    start.setDate(start.getDate() - preset.days)
    onChange({
      preset: preset.id,
      start: start.toISOString().slice(0, 10),
      end: latestDate,
    })
  }

  return (
    <section className="research-controls" aria-label="Timeline controls">
      <div>
        <span className="eyebrow">Research Mode</span>
        <h2>Filter the evidence window</h2>
      </div>
      <div className="preset-group" aria-label="Date presets">
        {PRESETS.map(preset => (
          <button
            key={preset.id}
            type="button"
            className={range.preset === preset.id ? 'active' : ''}
            onClick={() => applyPreset(preset)}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <label>
        Start
        <input
          type="date"
          value={range.start}
          onChange={event => onChange({ ...range, preset: 'custom', start: event.target.value })}
        />
      </label>
      <label>
        End
        <input
          type="date"
          value={range.end}
          onChange={event => onChange({ ...range, preset: 'custom', end: event.target.value })}
        />
      </label>
    </section>
  )
}
