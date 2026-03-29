import { useState } from 'react'
import TagBadge from './TagBadge'
import DiffViewer from './DiffViewer'

export default function EntryCard({ entry, modelName, onViewPrompt }) {
  const [showDiff, setShowDiff] = useState(false)

  return (
    <div className="bg-surface border border-border-dim rounded-md p-4 mb-3">
      {/* Row 1: date · commit · message  +N −N */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="font-mono text-xs text-muted flex flex-wrap items-center gap-1.5 min-w-0">
          <span className="shrink-0">{entry.date}</span>
          <span className="text-border-dim">·</span>
          <span className="text-blue-acc shrink-0">{entry.commit}</span>
          <span className="text-border-dim">·</span>
          <span className="truncate">{entry.message}</span>
        </div>
        <div className="font-mono text-xs flex gap-3 shrink-0">
          <span className="text-green-acc">+{entry.diff?.added_count ?? 0}</span>
          <span className="text-red-acc">−{entry.diff?.removed_count ?? 0}</span>
        </div>
      </div>

      {/* Row 2: summary */}
      <p className="text-sm text-primary leading-relaxed mb-2">
        {entry.summary ?? <span className="text-muted italic">No summary available.</span>}
      </p>

      {/* Row 3: tag badges */}
      {entry.behavioral_tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {entry.behavioral_tags.map(tag => <TagBadge key={tag} tag={tag} />)}
        </div>
      )}

      {/* Row 4: actions */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowDiff(v => !v)}
          className="text-xs font-mono px-3 py-1 bg-bg border border-border-dim text-muted hover:text-primary rounded transition-colors"
        >
          {showDiff ? '▼ hide diff' : '▶ diff'}
        </button>
        <button
          onClick={() => onViewPrompt(entry, modelName)}
          className="text-xs font-mono px-3 py-1 bg-bg border border-border-dim text-muted hover:text-primary rounded transition-colors"
        >
          ⊞ full prompt
        </button>
      </div>

      {showDiff && <DiffViewer diff={entry.diff} />}
    </div>
  )
}
