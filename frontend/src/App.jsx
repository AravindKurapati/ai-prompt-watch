import { useMemo, useState } from 'react'
import { useTimeline } from './hooks/useTimeline'
import { MODEL_META } from './utils/tagColors'
import { flattenTimeline, getBrowseRows, getModelProfile, getSpotlightEntry } from './utils/timelineBrowse'
import BrowseRow from './components/BrowseRow'
import ModelProfileRail from './components/ModelProfileRail'
import ResearchDrawer from './components/ResearchDrawer'
import SpotlightHero from './components/SpotlightHero'
import ChangesBarChart from './components/charts/ChangesBarChart'
import PromptLengthChart from './components/charts/PromptLengthChart'
import HeatmapChart from './components/charts/HeatmapChart'
import ConceptDriftBar from './components/ConceptDriftBar'

function Header({ data, selectedModel, onClear }) {
  const total = Object.values(data.stats).reduce((sum, model) => sum + (model.total_changes ?? 0), 0)
  const updated = data.generated_at?.slice(0, 10) ?? 'n/a'
  const activeLabel = selectedModel ? MODEL_META[selectedModel]?.label : 'All models'

  return (
    <header className="top-nav">
      <div>
        <span className="brand-kicker">AI Prompt Watch</span>
        <strong>{activeLabel}</strong>
      </div>
      <nav aria-label="Dashboard stats">
        <span>{data.models.length} models</span>
        <span>{total} changes</span>
        <span>updated {updated}</span>
      </nav>
      {selectedModel && <button type="button" onClick={onClear}>All models</button>}
    </header>
  )
}

function AnalyticsShelf({ data }) {
  return (
    <section className="analytics-shelf" aria-labelledby="research-vitals">
      <div className="row-heading">
        <h2 id="research-vitals">Research Vitals</h2>
        <span>signal board</span>
      </div>
      <div className="analytics-grid">
        <div className="analytics-panel"><ChangesBarChart stats={data.stats} height={170} /></div>
        <div className="analytics-panel"><PromptLengthChart timelines={data.timelines} height={170} /></div>
        <div className="analytics-panel"><HeatmapChart timelines={data.timelines} /></div>
        <div className="analytics-panel wide"><ConceptDriftBar timelines={data.timelines} /></div>
      </div>
    </section>
  )
}

function ExplainerPanel() {
  return (
    <section className="explainer-panel" aria-labelledby="what-this-is">
      <div>
        <p className="eyebrow">Plain English</p>
        <h2 id="what-this-is">What this project tracks</h2>
        <p>
          AI companies hide a lot of product behavior inside system prompts. This dashboard watches public leak commits
          and turns prompt diffs into readable signals: what changed, which model changed, and whether the change looks
          related to safety, tools, memory, policy, persona, or formatting.
        </p>
      </div>
      <div className="explainer-grid">
        <article>
          <span>01</span>
          <strong>Prompt</strong>
          <p>The instruction file that shapes how a model behaves before you type anything.</p>
        </article>
        <article>
          <span>02</span>
          <strong>Diff</strong>
          <p>The exact lines added and removed between two prompt versions.</p>
        </article>
        <article>
          <span>03</span>
          <strong>Signal</strong>
          <p>A tagged change that hints at a product, policy, safety, or tool behavior shift.</p>
        </article>
      </div>
    </section>
  )
}

export default function App() {
  const { data, error } = useTimeline()
  const [selectedModel, setSelectedModel] = useState(null)
  const [drawer, setDrawer] = useState({ entry: null, tab: 'overview' })

  const view = useMemo(() => {
    if (!data) return null
    const allEntries = flattenTimeline(data.timelines)
    const visibleEntries = selectedModel ? allEntries.filter(entry => entry.model === selectedModel) : allEntries
    const profiles = Object.keys(MODEL_META).map(model =>
      getModelProfile(model, data.stats, flattenTimeline({ [model]: data.timelines[model] ?? [] }))
    )
    return {
      allEntries,
      visibleEntries,
      profiles,
      rows: getBrowseRows(visibleEntries),
      spotlight: getSpotlightEntry(visibleEntries),
    }
  }, [data, selectedModel])

  if (error) {
    return (
      <main className="state-screen">
        <p>Failed to load timeline: {error.message}</p>
      </main>
    )
  }

  if (!data || !view) {
    return (
      <main className="state-screen">
        <p>Loading prompt intelligence...</p>
      </main>
    )
  }

  const totalChanges = view.visibleEntries.length
  const updated = data.generated_at?.slice(0, 10) ?? 'n/a'
  const selectedLabel = selectedModel ? MODEL_META[selectedModel]?.label : null

  function openDrawer(entry, tab = 'overview') {
    setDrawer({ entry, tab })
  }

  return (
    <div className="app-shell">
      <Header data={data} selectedModel={selectedModel} onClear={() => setSelectedModel(null)} />

      <main>
        <SpotlightHero
          entry={view.spotlight}
          totalChanges={totalChanges}
          updated={updated}
          selectedLabel={selectedLabel}
          onOpen={openDrawer}
        />

        <ExplainerPanel />

        <ModelProfileRail
          profiles={view.profiles}
          selectedModel={selectedModel}
          onSelect={setSelectedModel}
        />

        <div className="browse-stack">
          {view.rows.map(row => (
            <BrowseRow key={row.id} title={row.title} entries={row.entries} onOpen={openDrawer} />
          ))}
        </div>

        <AnalyticsShelf data={data} />
      </main>

      <ResearchDrawer
        key={drawer.entry ? `${drawer.entry.model}-${drawer.entry.commit}-${drawer.tab}` : 'closed'}
        entry={drawer.entry}
        initialTab={drawer.tab}
        onClose={() => setDrawer({ entry: null, tab: 'overview' })}
      />
    </div>
  )
}
