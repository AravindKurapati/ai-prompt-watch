import { useState } from 'react'
import { useTimeline } from './hooks/useTimeline'
import ModelTabs from './components/ModelTabs'
import FullPromptViewer from './components/FullPromptViewer'
import ChangesBarChart from './components/charts/ChangesBarChart'
import PromptLengthChart from './components/charts/PromptLengthChart'
import HeatmapChart from './components/charts/HeatmapChart'
import ConceptDriftBar from './components/ConceptDriftBar'

function LiveBadge() {
  return (
    <div className="flex items-center gap-1.5 border border-border-dim bg-bg px-2.5 py-1 rounded-full">
      <span className="live-dot" />
      <span className="text-green-acc text-[10px] uppercase font-mono font-bold tracking-wider">Live</span>
    </div>
  )
}

function IntelligenceVitals({ data }) {
  return (
    <aside className="hidden lg:flex w-[350px] shrink-0 flex-col sticky top-[57px] self-start max-h-[calc(100vh-57px)] overflow-y-auto pb-8">
      <div className="bg-surface border border-border-dim rounded-lg p-4 flex flex-col gap-5">
        <h3 className="font-display text-xs text-muted uppercase tracking-wider border-b border-border-dim pb-2">
          Intelligence Vitals
        </h3>
        <ChangesBarChart stats={data.stats} height={120} />
        <div className="border-t border-border-dim pt-4">
          <PromptLengthChart timelines={data.timelines} height={150} />
        </div>
        <div className="border-t border-border-dim pt-4">
          <HeatmapChart timelines={data.timelines} />
        </div>
        <div className="border-t border-border-dim pt-4">
          <ConceptDriftBar timelines={data.timelines} />
        </div>
      </div>
    </aside>
  )
}

export default function App() {
  const { data, error } = useTimeline()
  const [drawer, setDrawer] = useState({ open: false, entry: null, modelName: null })

  if (error) return (
    <div className="relative z-[1] min-h-screen flex items-center justify-center">
      <p className="font-mono text-red-acc text-sm">Failed to load: {error.message}</p>
    </div>
  )
  if (!data) return (
    <div className="relative z-[1] min-h-screen flex items-center justify-center">
      <p className="font-mono text-muted text-sm">Loading…</p>
    </div>
  )

  const total = Object.values(data.stats).reduce((s, m) => s + m.total_changes, 0)
  const updated = data.generated_at?.slice(0, 10) ?? '—'

  return (
    <div className="relative z-[1] min-h-screen text-primary flex flex-col">

      {/* Sticky header */}
      <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-border-dim">
        <div className="px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="font-display font-semibold text-lg tracking-wide shrink-0">AI Prompt Watch</h1>
            <p className="text-muted text-xs font-mono hidden md:block truncate">
              tracking system prompt changes across frontier AI models
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden md:flex items-center gap-2 text-xs font-mono text-muted">
              <span><span className="text-primary">{data.models.length}</span> models</span>
              <span className="text-border-dim">·</span>
              <span><span className="text-primary">{total}</span> changes</span>
              <span className="text-border-dim">·</span>
              <span>updated <span className="text-primary">{updated}</span></span>
            </div>
            <LiveBadge />
          </div>
        </div>
      </header>

      {/* Two-column body */}
      <div className="flex flex-1 gap-6 px-6 pt-6 pb-8 w-full mx-auto" style={{ maxWidth: 1400 }}>
        {/* Left: tab bar + timeline */}
        <div className="flex-1 min-w-0">
          <ModelTabs
            timelines={data.timelines}
            onViewPrompt={(entry, modelName) => setDrawer({ open: true, entry, modelName })}
          />
        </div>

        {/* Right: sticky analytics sidebar */}
        <IntelligenceVitals data={data} />
      </div>

      {drawer.open && drawer.entry && (
        <FullPromptViewer
          entry={drawer.entry}
          modelName={drawer.modelName}
          onClose={() => setDrawer({ open: false, entry: null, modelName: null })}
        />
      )}
    </div>
  )
}
