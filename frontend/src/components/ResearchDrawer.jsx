import { useEffect, useState } from 'react'
import TagBadge from './TagBadge'
import DiffViewer from './DiffViewer'
import ModelMark from './ModelMark'
import { cleanSummary, formatDelta, formatNumber } from '../utils/timelineBrowse'

const TABS = ['overview', 'diff', 'prompt']

export default function ResearchDrawer({ entry, initialTab = 'overview', onClose }) {
  const [activeTab, setActiveTab] = useState(initialTab)
  const [promptQuery, setPromptQuery] = useState('')
  const [copyState, setCopyState] = useState('Copy prompt')
  const [fetchedSnapshot, setFetchedSnapshot] = useState({ key: '', text: '', error: false })

  useEffect(() => {
    const handler = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    if (!entry || activeTab !== 'prompt') return
    if (entry.content_snapshot || !entry.snapshot_path) return

    const controller = new AbortController()
    const snapshotKey = `${entry.model}-${entry.commit}`
    fetch(`${import.meta.env.BASE_URL}${entry.snapshot_path}`, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.text()
      })
      .then(text => setFetchedSnapshot({ key: snapshotKey, text, error: false }))
      .catch(error => {
        if (error.name !== 'AbortError') setFetchedSnapshot({ key: snapshotKey, text: '', error: true })
      })

    return () => controller.abort()
  }, [activeTab, entry])

  if (!entry) return null

  const snapshotKey = `${entry.model}-${entry.commit}`
  const loadedSnapshot = fetchedSnapshot.key === snapshotKey ? fetchedSnapshot.text : ''
  const snapshot = entry.content_snapshot ?? loadedSnapshot
  const promptText = snapshot || ''
  const promptState = promptText
    ? `${formatNumber(promptText.length)} characters`
    : fetchedSnapshot.key === snapshotKey && fetchedSnapshot.error
      ? 'snapshot unavailable'
      : entry.snapshot_path
        ? 'loading snapshot'
        : 'no prompt content'
  const query = promptQuery.trim().toLowerCase()
  const promptLines = query
    ? promptText.split('\n').filter(line => line.toLowerCase().includes(query)).join('\n')
    : promptText

  function handleCopy() {
    navigator.clipboard.writeText(promptText)
    setCopyState('Copied')
    window.setTimeout(() => setCopyState('Copy prompt'), 1200)
  }

  return (
    <>
      <div className="drawer-scrim" onClick={onClose} />
      <aside className="research-drawer" style={{ '--model-color': entry.modelColor }} aria-label="Prompt change details">
        <header className="drawer-header">
          <div>
            <span className="model-chip">
              <ModelMark model={entry.model} color={entry.modelColor} size="sm" />
              {entry.modelLabel}
            </span>
            <h2>{cleanSummary(entry)}</h2>
            <p>{entry.date} / {entry.commit} / {entry.filepath ?? 'canonical prompt file'}</p>
          </div>
          <button type="button" className="close-button" aria-label="Close prompt change details" onClick={onClose}>Close</button>
        </header>

        <nav className="drawer-tabs" role="tablist" aria-label="Research drawer tabs">
          {TABS.map(tab => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              className={activeTab === tab ? 'active' : ''}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>

        <div className="drawer-body">
          {activeTab === 'overview' && (
            <div className="overview-grid">
              <div className="assessment-box">
                <span>Research assessment</span>
                <strong>
                  {(entry.behavioral_tags ?? []).includes('safety') || (entry.behavioral_tags ?? []).includes('policy')
                    ? 'Likely safety or policy boundary update'
                    : (entry.behavioral_tags ?? []).includes('tool_definition')
                      ? 'Likely tool behavior or interface definition change'
                      : 'Prompt text movement in the tracked source file'}
                </strong>
                <p>Assessment is inferred from changed text and deterministic tags. It is not a claim about live runtime behavior.</p>
              </div>
              <div className="overview-copy">
                <p>{cleanSummary(entry)}</p>
                <div className="tag-strip">
                  {(entry.behavioral_tags ?? ['other']).map(tag => <TagBadge key={tag} tag={tag} />)}
                </div>
              </div>
              <div className="metric-grid">
                <span><strong>{entry.impact_score}</strong> impact</span>
                <span><strong>{entry.impact_level}</strong> level</span>
                <span><strong>+{formatNumber(entry.diff?.added_count ?? 0)}</strong> added</span>
                <span><strong>-{formatNumber(entry.diff?.removed_count ?? 0)}</strong> removed</span>
                <span><strong>{formatDelta(entry.prompt_delta)}</strong> chars</span>
                <span><strong>{formatNumber(entry.prompt_length)}</strong> length</span>
              </div>
              <div className="commit-box">
                <span>commit message</span>
                <p>{entry.message}</p>
                <span>file</span>
                <p>{entry.filepath}</p>
              </div>
            </div>
          )}

          {activeTab === 'diff' && <DiffViewer diff={entry.diff} />}

          {activeTab === 'prompt' && (
            <div className="prompt-reader">
              <div className="prompt-toolbar">
                <span>{promptState}</span>
                <label>
                  Search prompt
                  <input
                    type="search"
                    value={promptQuery}
                    onChange={event => setPromptQuery(event.target.value)}
                    placeholder="filter visible lines"
                  />
                </label>
                <button type="button" onClick={handleCopy} disabled={!promptText}>{copyState}</button>
              </div>
              <pre>{promptLines || 'No prompt content available.'}</pre>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
