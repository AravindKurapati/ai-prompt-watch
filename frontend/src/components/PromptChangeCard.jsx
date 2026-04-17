import TagBadge from './TagBadge'
import ModelMark from './ModelMark'
import { cleanSummary, formatDelta, formatNumber } from '../utils/timelineBrowse'

const IMPACT_LABELS = {
  high: 'High impact',
  medium: 'Medium impact',
  low: 'Low impact',
}

export default function PromptChangeCard({ entry, onOpen }) {
  const addedCount = entry.diff?.added_count ?? 0
  const removedCount = entry.diff?.removed_count ?? 0

  return (
    <article className="change-card group" style={{ '--model-color': entry.modelColor }}>
      <button type="button" className="change-card-button" onClick={() => onOpen(entry)}>
        <div className="change-card-top">
          <span className="model-chip">
            <ModelMark model={entry.model} color={entry.modelColor} size="sm" />
            {entry.modelLabel}
          </span>
          <span className={`impact-pill impact-${entry.impact_level}`}>{IMPACT_LABELS[entry.impact_level]}</span>
        </div>

        <h3 className="change-title">{cleanSummary(entry)}</h3>

        <div className="change-meta">
          <span>{entry.date}</span>
          <span>{entry.commit}</span>
        </div>

        <div className="change-stats">
          <span className="text-green-acc">+{formatNumber(addedCount)}</span>
          <span className="text-red-acc">-{formatNumber(removedCount)}</span>
          <span className={entry.prompt_delta > 0 ? 'text-green-acc' : entry.prompt_delta < 0 ? 'text-red-acc' : 'text-muted'}>
            {formatDelta(entry.prompt_delta)} chars
          </span>
        </div>

        <div className="tag-strip">
          {(entry.behavioral_tags ?? ['other']).slice(0, 3).map(tag => <TagBadge key={tag} tag={tag} />)}
        </div>
      </button>
    </article>
  )
}
