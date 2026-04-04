import { useState } from 'react'
import TagBadge from './TagBadge'
import DiffViewer from './DiffViewer'

export default function EntryCard({ entry, modelName, onViewPrompt }) {
  const [showDiff, setShowDiff] = useState(false)

  const addedCount   = entry.diff?.added_count   ?? 0
  const removedCount = entry.diff?.removed_count ?? 0
  const isLargeDiff  = addedCount + removedCount > 200

  return (
    <div className="bg-surface border border-border-dim rounded-lg p-3 mb-3 hover:border-muted/50 transition-colors duration-200">
      {/* Row 1: date · commit · message  +N −N */}
      <div className="flex items-baseline justify-between gap-3 mb-2 text-xs">
        <div className="font-mono flex flex-wrap items-baseline gap-1.5 min-w-0 text-muted">
          <span className="shrink-0">{entry.date}</span>
          <span className="text-border-dim">·</span>
          <span className="text-blue-acc shrink-0">{entry.commit}</span>
          <span className="text-border-dim">·</span>
          <span className="truncate">{entry.message}</span>
        </div>
        <div className="font-mono flex gap-2 shrink-0">
          <span className="text-green-acc">+{addedCount}</span>
          <span className="text-red-acc">−{removedCount}</span>
        </div>
      </div>

      {/* Row 2: summary */}
      <p className="text-sm text-primary leading-relaxed mb-2.5">
        {entry.summary ?? <span className="text-muted italic">No summary available.</span>}
      </p>

      {/* Row 3: tag badges */}
      {entry.behavioral_tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {entry.behavioral_tags.map(tag => <TagBadge key={tag} tag={tag} />)}
        </div>
      )}

      {/* Row 4: actions */}
      <div className="flex items-center gap-2 pt-2 mt-1 border-t border-border-dim/50">
        <button
          onClick={() => setShowDiff(v => !v)}
          className="text-xs font-mono px-2.5 py-1 bg-bg border border-border-dim text-blue-acc hover:bg-blue-acc/10 rounded transition-colors"
        >
          {showDiff ? '▼ hide diff' : '▶ diff'}
        </button>
        <button
          onClick={() => onViewPrompt(entry, modelName)}
          className="text-xs font-mono px-2.5 py-1 bg-bg border border-border-dim text-muted hover:text-primary hover:border-muted/50 rounded transition-colors"
        >
          ⊞ full prompt
        </button>
        {isLargeDiff && (
          <span className="ml-auto text-[10px] font-mono text-yellow-acc border border-yellow-acc/30 bg-yellow-acc/10 px-1.5 py-0.5 rounded">
            large diff
          </span>
        )}
      </div>

      {showDiff && <DiffViewer diff={entry.diff} />}
    </div>
  )
}
