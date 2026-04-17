import TagBadge from './TagBadge'
import ModelMark from './ModelMark'
import { formatDelta, formatNumber } from '../utils/timelineBrowse'

export default function ModelProfileRail({ profiles, selectedModel, onSelect }) {
  return (
    <section className="profile-section" aria-labelledby="model-profiles">
      <div className="row-heading">
        <h2 id="model-profiles">Choose A Model</h2>
        <span>profile rail</span>
      </div>
      <div className="profile-rail">
        {profiles.map(profile => {
          const active = selectedModel === profile.model
          return (
            <button
              key={profile.model}
              type="button"
              className={`model-profile ${active ? 'active' : ''}`}
              style={{ '--model-color': profile.color }}
              onClick={() => onSelect(active ? null : profile.model)}
            >
              <span className="profile-brand">
                <ModelMark model={profile.model} color={profile.color} size="lg" />
                <span>
                  <span className="profile-label">{profile.label}</span>
                  <span className="profile-provider">{profile.provider}</span>
                </span>
              </span>
              <span className="profile-status">
                {profile.totalChanges ? `${profile.totalChanges} tracked changes` : 'No tracked changes in window'}
              </span>
              <div className="profile-metrics">
                <span>latest <strong>{profile.latestDate ?? 'waiting'}</strong></span>
                <span>prompt <strong>{formatNumber(profile.currentPromptLength)}</strong></span>
                <span>growth <strong>{formatDelta(profile.promptGrowth)}</strong></span>
              </div>
              <div className="tag-strip">
                {profile.dominantTags.length > 0
                  ? profile.dominantTags.map(tag => <TagBadge key={tag} tag={tag} />)
                  : <span className="empty-tag">quiet window</span>}
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
