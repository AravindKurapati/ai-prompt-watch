import { useEffect, useState } from 'react'
import TagBadge from './TagBadge'
import DiffViewer from './DiffViewer'
import ModelMark from './ModelMark'
import { cleanSummary, formatDelta, formatNumber } from '../utils/timelineBrowse'

const TABS = ['overview', 'diff', 'prompt']

export default function ResearchDrawer({ entry, initialTab = 'overview', onClose }) {
  const [activeTab, setActiveTab] = useState(initialTab)

  useEffect(() => {
    const handler = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!entry) return null

  function handleCopy() {
    navigator.clipboard.writeText(entry.content_snapshot ?? '')
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
            <p>{entry.date} / {entry.commit}</p>
          </div>
          <button type="button" className="close-button" onClick={onClose}>x</button>
        </header>

        <nav className="drawer-tabs" aria-label="Research drawer tabs">
          {TABS.map(tab => (
            <button
              key={tab}
              type="button"
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
                <span>{formatNumber((entry.content_snapshot ?? '').length)} characters</span>
                <button type="button" onClick={handleCopy}>copy prompt</button>
              </div>
              <pre>{entry.content_snapshot ?? 'No prompt content available.'}</pre>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
