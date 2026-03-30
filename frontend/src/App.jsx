import { useState } from 'react'
import { useTimeline } from './hooks/useTimeline'
import StatsBar from './components/StatsBar'
import ModelTabs from './components/ModelTabs'
import FullPromptViewer from './components/FullPromptViewer'
import ChangesBarChart from './components/charts/ChangesBarChart'
import PromptLengthChart from './components/charts/PromptLengthChart'
import HeatmapChart from './components/charts/HeatmapChart'
import ConceptDriftBar from './components/ConceptDriftBar'

function OverviewTab({ data }) {
  return (
    <div className="grid gap-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <ChangesBarChart stats={data.stats} />
        <PromptLengthChart timelines={data.timelines} />
      </div>
      <HeatmapChart timelines={data.timelines} />
      <ConceptDriftBar timelines={data.timelines} />
    </div>
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

  return (
    <div className="relative z-[1] min-h-screen text-primary">
      <header className="px-6 py-4 border-b border-border-dim">
        <h1 className="font-display text-lg font-semibold">AI Prompt Watch</h1>
        <p className="text-muted text-xs font-mono mt-0.5">
          tracking system prompt changes across frontier AI models
        </p>
      </header>

      <StatsBar data={data} />

      <ModelTabs
        timelines={data.timelines}
        onViewPrompt={(entry, modelName) => setDrawer({ open: true, entry, modelName })}
        overviewContent={<OverviewTab data={data} />}
      />

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
