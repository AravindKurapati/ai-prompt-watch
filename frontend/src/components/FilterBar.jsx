import { ALL_TAGS, TAG_COLORS } from '../utils/tagColors'

export default function FilterBar({ activeTags, onToggle, onSelectAll, onClearAll }) {
  const allActive = activeTags.size === ALL_TAGS.length
  return (
    <div className="flex flex-wrap items-center gap-2 py-3">
      <span className="text-muted font-mono text-xs">filter:</span>
      {ALL_TAGS.map(tag => {
        const active = activeTags.has(tag)
        const color = TAG_COLORS[tag]
        return (
          <button
            key={tag}
            onClick={() => onToggle(tag)}
            className="text-xs px-2 py-0.5 rounded-full border font-mono transition-all"
            style={{
              color:           active ? color : '#8b949e',
              backgroundColor: active ? `${color}22` : 'transparent',
              borderColor:     active ? `${color}44` : '#21262d',
              opacity:         active ? 1 : 0.5,
            }}
          >
            {tag}
          </button>
        )
      })}
      <button
        onClick={allActive ? onClearAll : onSelectAll}
        className="text-xs text-muted hover:text-primary font-mono ml-1 underline underline-offset-2"
      >
        {allActive ? 'clear all' : 'select all'}
      </button>
    </div>
  )
}
