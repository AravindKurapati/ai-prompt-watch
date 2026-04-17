import TagBadge from './TagBadge'
import ModelMark from './ModelMark'
import { cleanSummary, formatDelta, formatNumber } from '../utils/timelineBrowse'

export default function SpotlightHero({ entry, totalChanges, updated, selectedLabel, onOpen }) {
  if (!entry) {
    return (
      <section className="spotlight empty-spotlight">
        <div className="spotlight-content">
          <p className="eyebrow">Quiet Window</p>
          <h1>{selectedLabel ? `${selectedLabel} has no tracked changes here` : 'No prompt changes in this view'}</h1>
          <p className="spotlight-copy">
            This does not mean the model never changed. It only means the tracked prompt file has no commits in the current data window.
          </p>
        </div>
      </section>
    )
  }

  const addedCount = entry.diff?.added_count ?? 0
  const removedCount = entry.diff?.removed_count ?? 0

  return (
    <section className="spotlight" style={{ '--model-color': entry.modelColor }}>
      <div className="spotlight-gradient" />
      <div className="spotlight-art" aria-hidden="true" />
      <div className="spotlight-content">
        <div className="spotlight-brand">
          <ModelMark model={entry.model} color={entry.modelColor} size="xl" />
          <p className="eyebrow">{selectedLabel ? `${selectedLabel} spotlight` : 'Tonight on prompt watch'}</p>
        </div>
        <h1>{cleanSummary(entry)}</h1>
        <p className="spotlight-copy">
          {entry.modelLabel} changed on {entry.date}. The diff moved {formatNumber(addedCount)} added lines,
          {` ${formatNumber(removedCount)} removed lines, and ${formatDelta(entry.prompt_delta)} prompt characters.`}
        </p>
        <div className="spotlight-tags">
          {(entry.behavioral_tags ?? ['other']).map(tag => <TagBadge key={tag} tag={tag} />)}
        </div>
        <div className="spotlight-actions">
          <button type="button" className="primary-action" onClick={() => onOpen(entry, 'overview')}>Read Brief</button>
          <button type="button" className="secondary-action" onClick={() => onOpen(entry, 'diff')}>View Diff</button>
        </div>
      </div>
      <div className="spotlight-panel">
        <span className={`impact-score impact-${entry.impact_level}`}>{entry.impact_level}</span>
        <strong>{entry.impact_score}</strong>
        <span>impact score</span>
        <div className="panel-line" />
        <span>{formatNumber(totalChanges)} total changes</span>
        <span>updated {updated}</span>
      </div>
    </section>
  )
}
