import { useMemo, useState } from 'react'
import { useTimeline } from './hooks/useTimeline'
import { MODEL_META } from './utils/tagColors'
import { flattenTimeline, getModelProfile, getSpotlightEntry, cleanSummary, formatDelta, formatNumber } from './utils/timelineBrowse'
import ComparisonMatrix from './components/ComparisonMatrix'
import DateRangeFilter from './components/DateRangeFilter'
import MethodologyPanel from './components/MethodologyPanel'
import ModelMark from './components/ModelMark'
import PromptChangeReplay from './components/PromptChangeReplay'
import ResearchDrawer from './components/ResearchDrawer'
import TagBadge from './components/TagBadge'
import ChangesBarChart from './components/charts/ChangesBarChart'
import PromptLengthChart from './components/charts/PromptLengthChart'
import HeatmapChart from './components/charts/HeatmapChart'
import ConceptDriftBar from './components/ConceptDriftBar'

function SiteHeader({ data }) {
  const total = Object.values(data.stats).reduce((sum, model) => sum + (model.total_changes ?? 0), 0)
  const updated = data.generated_at?.slice(0, 10) ?? 'n/a'

  return (
    <header className="site-header">
      <a className="site-brand" href="#top" aria-label="AI Prompt Watch home">
        <span className="brand-mark">APW</span>
        <span>AI Prompt Watch</span>
      </a>
      <nav aria-label="Primary navigation">
        <a href="#research">Research</a>
        <a href="#replay">Replay</a>
        <a href="#models">Models</a>
        <a href="#dossiers">Dossiers</a>
        <a href="#explorer">Explorer</a>
        <a href="#library">Library</a>
        <a href="#methodology">Methodology</a>
      </nav>
      <div className="header-meta" aria-label="Dataset status">
        <span>{data.models.length} models</span>
        <span>{formatNumber(total)} changes</span>
        <span>updated {updated}</span>
      </div>
    </header>
  )
}

function getAssessment(entry) {
  const tags = entry.behavioral_tags ?? []
  if (tags.includes('safety') || tags.includes('policy')) return 'Likely safety or policy boundary update'
  if (tags.includes('tool_definition')) return 'Likely tool behavior or interface definition change'
  if (tags.includes('memory')) return 'Likely memory or context-handling update'
  if (tags.includes('persona')) return 'Likely assistant identity or tone adjustment'
  if (tags.includes('capability')) return 'Likely product capability or workflow expansion'
  return 'Tracked prompt text changed in the canonical source file'
}

function matchesSearch(entry, query) {
  const text = [
    entry.modelLabel,
    entry.model,
    entry.date,
    entry.commit,
    entry.message,
    entry.filepath,
    entry.summary,
    ...(entry.behavioral_tags ?? []),
  ].join(' ').toLowerCase()

  return text.includes(query.trim().toLowerCase())
}

function compactLine(line, maxLength = 94) {
  const cleaned = String(line ?? '').replace(/\s+/g, ' ').trim()
  if (!cleaned) return ''
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 1)}...` : cleaned
}

function getPreviewLines(lines, fallback, count = 3) {
  const preview = (lines ?? [])
    .map(line => compactLine(line))
    .filter(Boolean)
    .slice(0, count)

  return preview.length ? preview : fallback
}

function HeroEvidence({ entry, onOpen }) {
  if (!entry) {
    return (
      <aside className="evidence-panel">
        <p className="panel-kicker">Latest finding</p>
        <h2>No tracked changes in this view</h2>
        <p className="panel-copy">Adjust the evidence window to inspect model prompt activity.</p>
      </aside>
    )
  }

  const added = entry.diff?.added_count ?? 0
  const removed = entry.diff?.removed_count ?? 0
  const addedPreview = entry.diff?.added?.slice(0, 2) ?? []
  const removedPreview = entry.diff?.removed?.slice(0, 1) ?? []

  return (
    <aside className="evidence-panel" style={{ '--model-color': entry.modelColor }}>
      <div className="evidence-topline">
        <p className="panel-kicker">Latest finding</p>
        <span className={`impact-pill impact-${entry.impact_level}`}>{entry.impact_level}</span>
      </div>
      <div className="evidence-model">
        <ModelMark model={entry.model} color={entry.modelColor} size="md" />
        <div>
          <strong>{entry.modelLabel}</strong>
          <span>{entry.date} / {entry.commit}</span>
        </div>
      </div>
      <p className="assessment-line">{getAssessment(entry)}</p>
      <h2>{cleanSummary(entry)}</h2>
      <div className="tag-strip">
        {(entry.behavioral_tags ?? ['other']).slice(0, 3).map(tag => <TagBadge key={tag} tag={tag} />)}
      </div>
      <div className="diff-preview" aria-label="Diff preview">
        {addedPreview.map((line, index) => <code key={`add-${index}`} className="line-add">+ {line}</code>)}
        {removedPreview.map((line, index) => <code key={`remove-${index}`} className="line-remove">- {line}</code>)}
      </div>
      <div className="evidence-stats">
        <span><strong>+{formatNumber(added)}</strong> added</span>
        <span><strong>-{formatNumber(removed)}</strong> removed</span>
        <span><strong>{formatDelta(entry.prompt_delta)}</strong> chars</span>
      </div>
      <p className="source-note">Source: {entry.filepath ?? 'canonical prompt file'}</p>
      <div className="evidence-actions">
        <button type="button" className="primary-action" onClick={() => onOpen(entry, 'diff')}>View diff</button>
        <button type="button" className="secondary-action" onClick={() => onOpen(entry, 'prompt')}>Full prompt</button>
      </div>
    </aside>
  )
}

function PromptAssemblyScene({ entry }) {
  const tags = entry?.behavioral_tags?.length ? entry.behavioral_tags : ['safety', 'tool_definition', 'persona']
  const addedLines = getPreviewLines(entry?.diff?.added, [
    'must follow the system prompt hierarchy',
    'tool call arguments are validated before execution',
    'surface policy-relevant prompt movement',
  ])
  const removedLines = getPreviewLines(entry?.diff?.removed, [
    'older instruction block replaced',
    'legacy formatting guidance removed',
  ], 2)
  const modelLabel = entry?.modelLabel ?? 'Tracked model'
  const changeTotal = (entry?.diff?.added_count ?? 0) + (entry?.diff?.removed_count ?? 0)

  return (
    <aside className="prompt-assembly" style={{ '--model-color': entry?.modelColor ?? '#58a6ff' }} aria-label="Prompt intelligence assembly">
      <div className="assembly-topline">
        <span>Prompt assembly</span>
        <strong>{modelLabel}</strong>
      </div>

      <div className="assembly-stage" aria-hidden="true">
        <span className="assembly-rail rail-a" />
        <span className="assembly-rail rail-b" />
        <span className="assembly-rail rail-c" />

        <div className="assembly-layer layer-source">
          <span>Source</span>
          <code>{entry?.filepath ?? 'canonical prompt file'}</code>
        </div>

        <div className="assembly-layer layer-diff">
          <span>Diff</span>
          {addedLines.slice(0, 2).map((line, index) => (
            <code className="line-add" key={`assembly-add-${index}`}>+ {line}</code>
          ))}
          {removedLines.slice(0, 1).map((line, index) => (
            <code className="line-remove" key={`assembly-remove-${index}`}>- {line}</code>
          ))}
        </div>

        <div className="assembly-layer layer-tags">
          <span>Behavior</span>
          <div className="assembly-tags">
            {tags.slice(0, 4).map(tag => <TagBadge key={tag} tag={tag} />)}
          </div>
        </div>

        <div className="assembly-core">
          <span>Snapshot</span>
          <strong>{formatNumber(entry?.prompt_length)} chars</strong>
          <em>{formatNumber(changeTotal)} changed lines</em>
        </div>
      </div>

      <div className="assembly-footer">
        <span><strong>{formatDelta(entry?.prompt_delta)}</strong> prompt delta</span>
        <span><strong>{entry?.impact_level ?? 'n/a'}</strong> impact</span>
        <span><strong>{entry?.date ?? 'n/a'}</strong> latest signal</span>
      </div>
    </aside>
  )
}

function CredibilityStrip() {
  return (
    <section className="credibility-strip" aria-label="Research caveats">
      <span>Evidence first</span>
      <p>
        This archive tracks public file changes. Tags and impact labels describe prompt text movement, not verified
        live model behavior.
      </p>
      <a href="#methodology">Read methodology</a>
    </section>
  )
}

function HeroSection({ spotlight, onOpen }) {
  return (
    <section className="website-hero" id="top">
      <div className="hero-copy">
        <p className="eyebrow">Public prompt research archive</p>
        <h1>Track prompt evolution.</h1>
        <p>
          A research console for studying safety, tools, policy, persona, and instruction drift across frontier
          assistants through versioned prompt evidence.
        </p>
        <div className="hero-actions">
          <a className="primary-action" href="#explorer">Explore changes</a>
          <a className="secondary-action" href="#methodology">View methodology</a>
        </div>
      </div>
      <div className="hero-stage">
        <PromptAssemblyScene entry={spotlight} />
        <HeroEvidence entry={spotlight} onOpen={onOpen} />
      </div>
    </section>
  )
}

function FindingCard({ entry, onOpen }) {
  const added = entry.diff?.added_count ?? 0
  const removed = entry.diff?.removed_count ?? 0

  return (
    <article className="finding-card" style={{ '--model-color': entry.modelColor }}>
      <div className="finding-model">
        <span className="model-chip">
          <ModelMark model={entry.model} color={entry.modelColor} size="sm" />
          {entry.modelLabel}
        </span>
        <span>{entry.date}</span>
      </div>
      <div className="finding-copy">
        <h3>{cleanSummary(entry)}</h3>
        <div className="tag-strip">
          {(entry.behavioral_tags ?? ['other']).slice(0, 4).map(tag => <TagBadge key={tag} tag={tag} />)}
        </div>
      </div>
      <div className="finding-meta">
        <span className={`impact-pill impact-${entry.impact_level}`}>{entry.impact_level}</span>
        <span className="mono-stat">+{formatNumber(added)} / -{formatNumber(removed)}</span>
        <button type="button" onClick={() => onOpen(entry, 'diff')}>Diff</button>
        <button type="button" onClick={() => onOpen(entry, 'prompt')}>Prompt</button>
      </div>
    </article>
  )
}

function FindingsSection({ entries, onOpen }) {
  return (
    <section className="content-section" id="research" aria-labelledby="findings-heading">
      <div className="section-heading">
        <p className="eyebrow">Research</p>
        <h2 id="findings-heading">Latest high-signal findings</h2>
        <p>Prioritized changes with enough context to move from summary to raw evidence in one click.</p>
      </div>
      <div className="findings-list">
        {entries.length ? (
          entries.slice(0, 3).map(entry => (
            <FindingCard key={`${entry.model}-${entry.commit}-${entry.date}`} entry={entry} onOpen={onOpen} />
          ))
        ) : (
          <EmptyState title="No findings in this window" body="Try expanding the date range or clearing the selected model filter." />
        )}
      </div>
    </section>
  )
}

function ModelCoverage({ profiles, selectedModel, onSelect }) {
  return (
    <section className="content-section" id="models" aria-labelledby="models-heading">
      <div className="section-heading">
        <p className="eyebrow">Coverage</p>
        <h2 id="models-heading">Model coverage</h2>
        <p>Each profile summarizes the tracked prompt file, recent activity, and dominant change categories.</p>
      </div>
      <div className="model-grid">
        {profiles.map(profile => {
          const active = selectedModel === profile.model
          return (
            <button
              key={profile.model}
              type="button"
              className={`model-card ${active ? 'active' : ''}`}
              style={{ '--model-color': profile.color }}
              onClick={() => onSelect(active ? null : profile.model)}
            >
              <span className="model-card-head">
                <ModelMark model={profile.model} color={profile.color} size="lg" />
                <span>
                  <strong>{profile.label}</strong>
                  <em>{profile.provider}</em>
                </span>
              </span>
              <span className="model-status">
                {profile.totalChanges ? `${formatNumber(profile.totalChanges)} tracked changes` : 'Quiet tracked window'}
              </span>
              <span className="model-stat-row"><span>Prompt length</span><strong>{formatNumber(profile.currentPromptLength)}</strong></span>
              <span className="model-stat-row"><span>Growth</span><strong>{formatDelta(profile.promptGrowth)}</strong></span>
              <span className="model-stat-row"><span>Latest change</span><strong>{profile.latestDate ?? 'No commits'}</strong></span>
              <div className="mini-bars" aria-hidden="true">
                {profile.dominantTags.slice(0, 3).map((tag, index) => (
                  <span key={tag} style={{ width: `${88 - index * 18}%` }}>{tag}</span>
                ))}
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function ModelDossier({ profile, entries, onOpen }) {
  if (!profile) return null

  const modelEntries = entries.filter(entry => entry.model === profile.model)
  const latest = modelEntries[0]

  return (
    <section className="content-section dossier-section" id="dossiers" aria-labelledby="dossier-heading" style={{ '--model-color': profile.color }}>
      <div className="section-heading split">
        <div>
          <p className="eyebrow">Dossier</p>
          <h2 id="dossier-heading">{profile.label} model profile</h2>
          <p>
            A focused view of one tracked prompt file, including current size, recent movement, and dominant signals.
          </p>
        </div>
        <span className="model-chip">
          <ModelMark model={profile.model} color={profile.color} size="sm" />
          {profile.provider}
        </span>
      </div>
      <div className="dossier-grid">
        <article className="dossier-main">
          <div className="dossier-head">
            <ModelMark model={profile.model} color={profile.color} size="lg" />
            <div>
              <h3>{profile.label}</h3>
              <p>{profile.totalChanges ? `${formatNumber(profile.totalChanges)} tracked changes` : 'No tracked commits in this dataset window.'}</p>
            </div>
          </div>
          <div className="dossier-metrics">
            <span><strong>{formatNumber(profile.currentPromptLength)}</strong> prompt length</span>
            <span><strong>{formatDelta(profile.promptGrowth)}</strong> tracked growth</span>
            <span><strong>{profile.latestDate ?? 'quiet'}</strong> latest change</span>
          </div>
          <div className="tag-strip">
            {profile.dominantTags.length
              ? profile.dominantTags.map(tag => <TagBadge key={tag} tag={tag} />)
              : <span className="empty-tag">quiet tracked window</span>}
          </div>
        </article>
        <article className="dossier-latest">
          <p className="eyebrow">Latest movement</p>
          {latest ? (
            <>
              <h3>{cleanSummary(latest)}</h3>
              <p>{getAssessment(latest)}</p>
              <div className="dossier-actions">
                <button type="button" className="secondary-action" onClick={() => onOpen(latest, 'diff')}>Open diff</button>
                <button type="button" className="secondary-action" onClick={() => onOpen(latest, 'prompt')}>Prompt snapshot</button>
              </div>
            </>
          ) : (
            <EmptyState title="No commits tracked" body="This canonical file has no commits in the selected dataset window." />
          )}
        </article>
      </div>
    </section>
  )
}

function EmptyState({ title, body }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  )
}

function ExplorerTable({ entries, onOpen }) {
  if (!entries.length) {
    return (
      <EmptyState
        title="No changes match these filters"
        body="Broaden the date range, select all models, or search for a different prompt concept."
      />
    )
  }

  return (
    <div className="explorer-table" role="table" aria-label="Prompt change register">
      <div className="explorer-row table-head" role="row">
        <span role="columnheader">Date</span>
        <span role="columnheader">Model</span>
        <span role="columnheader">Signal</span>
        <span role="columnheader">Finding</span>
        <span role="columnheader">Change</span>
        <span role="columnheader">Actions</span>
      </div>
      {entries.slice(0, 14).map(entry => (
        <div className="explorer-row" role="row" key={`${entry.model}-${entry.commit}-${entry.date}`}>
          <span role="cell">{entry.date}</span>
          <span role="cell">
            <span className="model-chip">
              <ModelMark model={entry.model} color={entry.modelColor} size="sm" />
              {entry.modelLabel}
            </span>
          </span>
          <span role="cell" className="tag-strip">
            {(entry.behavioral_tags ?? ['other']).slice(0, 2).map(tag => <TagBadge key={tag} tag={tag} />)}
          </span>
          <span role="cell" className="table-summary">{cleanSummary(entry)}</span>
          <span role="cell" className="mono-stat">{formatDelta(entry.prompt_delta)} chars</span>
          <span role="cell" className="table-actions">
            <button type="button" onClick={() => onOpen(entry, 'diff')}>Diff</button>
            <button type="button" onClick={() => onOpen(entry, 'prompt')}>Prompt</button>
          </span>
        </div>
      ))}
    </div>
  )
}

function ExplorerSection({ entries, dateRange, setDateRange, latestDate, selectedModel, setSelectedModel, searchQuery, setSearchQuery, onOpen }) {
  return (
    <section className="content-section explorer-section" id="explorer" aria-labelledby="explorer-heading">
      <div className="section-heading split">
        <div>
          <p className="eyebrow">Explorer</p>
          <h2 id="explorer-heading">Research explorer</h2>
          <p>Filter the archive, then open the exact diff or full prompt snapshot behind any finding.</p>
        </div>
        {selectedModel && (
          <button type="button" className="secondary-action" onClick={() => setSelectedModel(null)}>All models</button>
        )}
      </div>
      <div className="search-panel">
        <label htmlFor="prompt-search">Search the archive</label>
        <input
          id="prompt-search"
          type="search"
          value={searchQuery}
          onChange={event => setSearchQuery(event.target.value)}
          placeholder="Try refusal, browsing, memory, policy, tool schema..."
        />
        <span>{formatNumber(entries.length)} matching changes</span>
      </div>
      <DateRangeFilter range={dateRange} onChange={setDateRange} latestDate={latestDate} />
      <ExplorerTable entries={entries} onOpen={onOpen} />
    </section>
  )
}

function PromptLibrary({ profiles, onOpen }) {
  return (
    <section className="content-section prompt-library" id="library" aria-labelledby="library-heading">
      <div className="section-heading">
        <p className="eyebrow">Library</p>
        <h2 id="library-heading">Prompt snapshot library</h2>
        <p>Open the latest tracked prompt snapshot for each model, with the source caveat kept visible.</p>
      </div>
      <div className="library-table" role="table" aria-label="Prompt snapshot library">
        <div className="library-row table-head" role="row">
          <span role="columnheader">Model</span>
          <span role="columnheader">Snapshot</span>
          <span role="columnheader">Length</span>
          <span role="columnheader">Source</span>
          <span role="columnheader">Action</span>
        </div>
        {profiles.map(profile => (
          <div className="library-row" role="row" key={profile.model}>
            <span role="cell">
              <span className="model-chip">
                <ModelMark model={profile.model} color={profile.color} size="sm" />
                {profile.label}
              </span>
            </span>
            <span role="cell">{profile.latestDate ?? 'No tracked snapshot'}</span>
            <span role="cell">{formatNumber(profile.currentPromptLength)}</span>
            <span role="cell">{profile.latest?.filepath ?? 'canonical file unavailable'}</span>
            <span role="cell" className="table-actions">
              {profile.latest
                ? <button type="button" onClick={() => onOpen(profile.latest, 'prompt')}>Open</button>
                : <span className="empty-tag">quiet</span>}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

function AnalyticsSection({ data }) {
  return (
    <section className="content-section analytics-shelf" id="signals" aria-labelledby="signals-heading">
      <div className="section-heading">
        <p className="eyebrow">Signals</p>
        <h2 id="signals-heading">Prompt archive signals</h2>
        <p>Charts are supporting evidence for growth, category concentration, and update cadence.</p>
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

export default function App() {
  const { data, error } = useTimeline()
  const [selectedModel, setSelectedModel] = useState(null)
  const [dateRange, setDateRange] = useState({ preset: 'all', start: '', end: '' })
  const [searchQuery, setSearchQuery] = useState('')
  const [drawer, setDrawer] = useState({ entry: null, tab: 'overview' })

  const view = useMemo(() => {
    if (!data) return null
    const allEntries = flattenTimeline(data.timelines)
    const latestDate = allEntries[0]?.date ?? ''
    const visibleEntries = allEntries.filter(entry => {
      if (selectedModel && entry.model !== selectedModel) return false
      if (dateRange.start && entry.date < dateRange.start) return false
      if (dateRange.end && entry.date > dateRange.end) return false
      if (searchQuery.trim() && !matchesSearch(entry, searchQuery)) return false
      return true
    })
    const profiles = Object.keys(MODEL_META).map(model =>
      getModelProfile(model, data.stats, flattenTimeline({ [model]: data.timelines[model] ?? [] }))
    )
    return {
      allEntries,
      visibleEntries,
      latestDate,
      profiles,
      spotlight: getSpotlightEntry(visibleEntries),
      highSignal: [...visibleEntries].sort((a, b) => b.impact_score - a.impact_score || String(b.date).localeCompare(String(a.date))),
      selectedProfile: profiles.find(profile => profile.model === selectedModel) ?? profiles.find(profile => profile.totalChanges) ?? profiles[0],
    }
  }, [data, selectedModel, dateRange, searchQuery])

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

  function openDrawer(entry, tab = 'overview') {
    setDrawer({ entry, tab })
  }

  return (
    <div className="app-shell">
      <SiteHeader data={data} />

      <main>
        <HeroSection spotlight={view.spotlight} onOpen={openDrawer} />
        <CredibilityStrip />
        <PromptChangeReplay entries={view.allEntries} profiles={view.profiles} onOpen={openDrawer} />
        <FindingsSection entries={view.highSignal} onOpen={openDrawer} />
        <ModelCoverage profiles={view.profiles} selectedModel={selectedModel} onSelect={setSelectedModel} />
        <ModelDossier profile={view.selectedProfile} entries={view.allEntries} onOpen={openDrawer} />
        <ExplorerSection
          entries={view.visibleEntries}
          dateRange={dateRange}
          setDateRange={setDateRange}
          latestDate={view.latestDate}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onOpen={openDrawer}
        />
        <PromptLibrary profiles={view.profiles} onOpen={openDrawer} />
        <AnalyticsSection data={data} />
        <ComparisonMatrix comparison={data.comparison} stats={data.stats} />
        <div id="methodology">
          <MethodologyPanel sources={data.model_sources} />
        </div>
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
