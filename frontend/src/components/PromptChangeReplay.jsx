import { useState } from 'react'
import ModelMark from './ModelMark'
import TagBadge from './TagBadge'
import { ALL_TAGS, TAG_COLORS } from '../utils/tagColors'
import { cleanSummary, formatDelta, formatNumber } from '../utils/timelineBrowse'

const REPLAY_TAGS = ['all', 'safety', 'policy', 'tool_definition', 'capability', 'memory', 'persona', 'formatting', 'other']

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function compactLine(line, maxLength = 118) {
  const cleaned = String(line ?? '').replace(/\s+/g, ' ').trim()
  if (!cleaned) return ''
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 1)}...` : cleaned
}

function getAssessment(entry) {
  const tags = entry?.behavioral_tags ?? []
  const sections = entry?.sections_changed ?? []
  if (tags.includes('safety') || tags.includes('policy')) return 'Boundary language moved. Review whether this narrows refusal behavior, compliance posture, or legal/privacy handling.'
  if (tags.includes('tool_definition')) return 'Tool instructions changed. Check schemas, calling rules, and when the assistant is allowed to delegate work.'
  if (tags.includes('memory')) return 'Memory or context language changed. Inspect how user history, recall, or session state is framed.'
  if (tags.includes('persona')) return 'Assistant identity or tone changed. Compare how strongly behavior is steered before user input arrives.'
  if (tags.includes('capability')) return 'Capability framing changed. Look for newly enabled workflows or shifted product boundaries.'
  if (sections.includes('tool_use')) return 'The changed section is tool-related, even if the keyword tagger kept the tag conservative.'
  return 'Prompt text changed in the canonical file. Open the diff to inspect the exact evidence.'
}

function getReplayLines(entry) {
  const added = (entry?.diff?.added ?? []).map(line => ({ type: 'add', text: compactLine(line) })).filter(line => line.text)
  const removed = (entry?.diff?.removed ?? []).map(line => ({ type: 'remove', text: compactLine(line) })).filter(line => line.text)
  const lines = []
  const maxPairs = Math.max(added.length, removed.length, 4)

  for (let index = 0; index < maxPairs; index += 1) {
    if (removed[index]) lines.push(removed[index])
    if (added[index]) lines.push(added[index])
    if (index === 0) lines.push({ type: 'context', text: compactLine(cleanSummary(entry), 104) })
  }

  return lines.slice(0, 10)
}

function getChangeBlocks(entry) {
  const added = entry?.diff?.added_count ?? 0
  const removed = entry?.diff?.removed_count ?? 0
  const total = Math.max(added + removed, 1)
  const tags = entry?.behavioral_tags?.length ? entry.behavioral_tags : ['other']

  return tags.slice(0, 5).map((tag, index) => {
    const base = tag === 'safety' || tag === 'policy' ? removed : added
    const width = clamp(((base || total) / total) * 62 + 18 - index * 4, 16, 92)
    return { tag, width }
  })
}

function PromptReplayDocument({ entry }) {
  const replayLines = getReplayLines(entry)
  const blocks = getChangeBlocks(entry)
  const totalChange = entry?.diff?.total_change ?? ((entry?.diff?.added_count ?? 0) + (entry?.diff?.removed_count ?? 0))

  return (
    <div className="replay-document" aria-label="Replay of selected prompt change">
      <div className="replay-doc-head">
        <span>{entry?.date ?? 'No date'}</span>
        <strong>{entry?.modelLabel ?? 'Model'} / {entry?.commit ?? 'commit'}</strong>
        <em>{entry?.filepath ?? 'canonical prompt file'}</em>
      </div>

      <div className="replay-change-map" aria-label="Changed prompt regions">
        {blocks.map((block, index) => (
          <span
            key={`${block.tag}-${index}`}
            className="replay-block"
            style={{ '--tag-color': TAG_COLORS[block.tag] ?? TAG_COLORS.other, '--block-width': `${block.width}%` }}
          >
            {block.tag}
          </span>
        ))}
      </div>

      <div className="replay-code-window">
        <div className="code-gutter" aria-hidden="true">
          {replayLines.map((_, index) => <span key={index}>{String(index + 1).padStart(2, '0')}</span>)}
        </div>
        <div className="code-lines">
          {replayLines.map((line, index) => (
            <code key={`${line.type}-${index}`} className={`replay-line ${line.type}`}>
              <span>{line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}</span>
              {line.text}
            </code>
          ))}
        </div>
      </div>

      <div className="replay-doc-footer">
        <span><strong>{formatNumber(totalChange)}</strong> changed lines</span>
        <span><strong>{formatDelta(entry?.prompt_delta)}</strong> prompt delta</span>
        <span><strong>{entry?.impact_level ?? 'n/a'}</strong> impact</span>
      </div>
    </div>
  )
}

function TimelineRail({ entries, activeIndex, onSelect }) {
  return (
    <div className="replay-timeline-rail" aria-label="Filtered change timeline">
      {entries.slice(0, 9).map((entry, index) => (
        <button
          key={`${entry.model}-${entry.commit}-${entry.date}`}
          type="button"
          className={index === activeIndex ? 'active' : ''}
          style={{ '--model-color': entry.modelColor }}
          onClick={() => onSelect(index)}
        >
          <span>{entry.date}</span>
          <strong>{cleanSummary(entry)}</strong>
        </button>
      ))}
    </div>
  )
}

export default function PromptChangeReplay({ entries, profiles, onOpen }) {
  const modelProfiles = profiles.filter(profile => profile.totalChanges)
  const [selectedModel, setSelectedModel] = useState(modelProfiles[0]?.model ?? profiles[0]?.model ?? '')
  const [selectedTag, setSelectedTag] = useState('all')
  const [impactOnly, setImpactOnly] = useState(false)
  const [frameIndex, setFrameIndex] = useState(0)

  const activeProfile = profiles.find(profile => profile.model === selectedModel) ?? modelProfiles[0] ?? profiles[0]
  const activeModel = activeProfile?.model ?? ''

  const filteredEntries = entries.filter(entry => {
    if (activeModel && entry.model !== activeModel) return false
    if (selectedTag !== 'all' && !(entry.behavioral_tags ?? []).includes(selectedTag)) return false
    if (impactOnly && entry.impact_level !== 'high') return false
    return true
  })
  const modelEntries = filteredEntries.length ? filteredEntries : entries.filter(entry => entry.model === activeModel)

  const activeIndex = clamp(frameIndex, 0, Math.max(modelEntries.length - 1, 0))
  const activeEntry = modelEntries[activeIndex]
  const activeTags = activeEntry?.behavioral_tags?.length ? activeEntry.behavioral_tags : ['other']
  const timelineProgress = modelEntries.length <= 1 ? 100 : Math.round((activeIndex / (modelEntries.length - 1)) * 100)

  return (
    <section className="content-section change-replay-section" id="replay" aria-labelledby="replay-heading">
      <div className="section-heading split">
        <div>
          <p className="eyebrow">Replay</p>
          <h2 id="replay-heading">Prompt change replay</h2>
          <p>Scrub real commits, see the changed prompt regions, and jump straight into the raw diff or snapshot.</p>
        </div>
        <span className="model-chip">
          <ModelMark model={activeProfile?.model} color={activeProfile?.color} size="sm" />
          {activeProfile?.label ?? 'Model'}
        </span>
      </div>

      <div className="change-replay" style={{ '--model-color': activeProfile?.color ?? '#9db2c5', '--timeline-progress': `${timelineProgress}%` }}>
        <div className="replay-stage">
          <PromptReplayDocument entry={activeEntry} />
          <div className="replay-brief">
            <span>{activeEntry?.date ?? 'No date'} / {activeEntry?.commit ?? 'n/a'}</span>
            <h3>{activeEntry ? cleanSummary(activeEntry) : 'No prompt change selected'}</h3>
            <p>{getAssessment(activeEntry)}</p>
            <div className="tag-strip">
              {activeTags.slice(0, 5).map(tag => <TagBadge key={tag} tag={tag} />)}
            </div>
          </div>
        </div>

        <aside className="replay-controls" aria-label="Prompt change replay controls">
          <div className="replay-field">
            <label htmlFor="replay-model">Model</label>
            <select id="replay-model" value={activeProfile?.model ?? ''} onChange={event => { setSelectedModel(event.target.value); setFrameIndex(0) }}>
              {modelProfiles.map(profile => (
                <option key={profile.model} value={profile.model}>{profile.label}</option>
              ))}
            </select>
          </div>

          <div className="replay-field">
            <label htmlFor="replay-signal">Signal</label>
            <select id="replay-signal" value={selectedTag} onChange={event => { setSelectedTag(event.target.value); setFrameIndex(0) }}>
              {REPLAY_TAGS.filter(tag => tag === 'all' || ALL_TAGS.includes(tag)).map(tag => (
                <option key={tag} value={tag}>{tag === 'all' ? 'All tags' : tag}</option>
              ))}
            </select>
          </div>

          <div className="replay-field">
            <label htmlFor="replay-timeline">Timeline</label>
            <input
              id="replay-timeline"
              type="range"
              min="0"
              max={Math.max(modelEntries.length - 1, 0)}
              value={activeIndex}
              onChange={event => setFrameIndex(Number(event.target.value))}
            />
          </div>

          <label className="replay-toggle">
            <input
              type="checkbox"
              checked={impactOnly}
              onChange={event => { setImpactOnly(event.target.checked); setFrameIndex(0) }}
            />
            High-impact changes only
          </label>

          <div className="replay-metrics">
            <span><strong>{formatDelta(activeEntry?.prompt_delta)}</strong> delta</span>
            <span><strong>{formatNumber(activeEntry?.prompt_length)}</strong> chars</span>
            <span><strong>{formatNumber(modelEntries.length)}</strong> matches</span>
          </div>

          <TimelineRail entries={modelEntries} activeIndex={activeIndex} onSelect={setFrameIndex} />

          <div className="replay-actions">
            {activeEntry && (
              <>
                <button type="button" className="primary-action" onClick={() => onOpen(activeEntry, 'diff')}>
                  View diff
                </button>
                <button type="button" className="secondary-action" onClick={() => onOpen(activeEntry, 'prompt')}>
                  Full prompt
                </button>
              </>
            )}
          </div>
        </aside>
      </div>
    </section>
  )
}
