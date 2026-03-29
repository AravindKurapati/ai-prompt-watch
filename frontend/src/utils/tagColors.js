export const TAG_COLORS = {
  safety:          '#f85149',
  tool_definition: '#58a6ff',
  persona:         '#a371f7',
  capability:      '#3fb950',
  formatting:      '#8b949e',
  memory:          '#d29922',
  policy:          '#e3882a',
  other:           '#30363d',
}

export const MODEL_META = {
  claude:  { label: 'Claude',  color: '#d97706' },
  openai:  { label: 'ChatGPT', color: '#10a37f' },
  gemini:  { label: 'Gemini',  color: '#4285f4' },
  grok:    { label: 'Grok',    color: '#9333ea' },
}

export const ALL_TAGS = Object.keys(TAG_COLORS)

/**
 * Filter entries by active tag set.
 * OR logic: entry passes if it has at least one tag in activeTags.
 */
export function filterEntries(entries, activeTags) {
  if (activeTags.size === ALL_TAGS.length) return entries
  if (activeTags.size === 0) return []
  return entries.filter(e =>
    Array.isArray(e.behavioral_tags) &&
    e.behavioral_tags.some(t => activeTags.has(t))
  )
}

/**
 * Proportion of entries tagged with each tag (0.0–1.0+).
 * Proportions may sum above 1 — entries can carry multiple tags.
 */
export function computeTagProportions(entries) {
  if (!entries || entries.length === 0) return {}
  const counts = Object.fromEntries(ALL_TAGS.map(t => [t, 0]))
  for (const entry of entries) {
    for (const tag of (entry.behavioral_tags || [])) {
      if (tag in counts) counts[tag]++
    }
  }
  return Object.fromEntries(
    Object.entries(counts).map(([tag, n]) => [tag, n / entries.length])
  )
}
