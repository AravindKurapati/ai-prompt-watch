import { useState } from 'react'
import { ALL_TAGS, filterEntries } from '../utils/tagColors'
import FilterBar from './FilterBar'
import EntryCard from './EntryCard'

export default function Timeline({ entries, modelName, onViewPrompt }) {
  const [activeTags, setActiveTags] = useState(new Set(ALL_TAGS))

  function toggle(tag) {
    setActiveTags(prev => {
      const next = new Set(prev)
      next.has(tag) ? next.delete(tag) : next.add(tag)
      return next
    })
  }

  const filtered = filterEntries(entries, activeTags)

  return (
    <div>
      <FilterBar
        activeTags={activeTags}
        onToggle={toggle}
        onSelectAll={() => setActiveTags(new Set(ALL_TAGS))}
        onClearAll={() => setActiveTags(new Set())}
      />
      {filtered.length === 0 ? (
        <p className="text-muted font-mono text-sm py-12 text-center">
          No entries match the active filters.
        </p>
      ) : (
        filtered.map((entry, i) => (
          <EntryCard
            key={`${entry.commit}-${i}`}
            entry={entry}
            modelName={modelName}
            onViewPrompt={onViewPrompt}
          />
        ))
      )}
    </div>
  )
}
