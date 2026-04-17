import { MODEL_META, TAG_COLORS } from './tagColors'

const TAG_IMPACT_WEIGHTS = {
  safety: 35,
  policy: 30,
  tool_definition: 25,
  capability: 20,
  memory: 20,
  persona: 15,
  formatting: 8,
  other: 0,
}

export function formatNumber(value) {
  if (value == null) return 'n/a'
  return Intl.NumberFormat('en-US', { notation: Math.abs(value) >= 10000 ? 'compact' : 'standard' }).format(value)
}

export function formatDelta(value) {
  if (value == null || value === 0) return '0'
  return `${value > 0 ? '+' : ''}${formatNumber(value)}`
}

export function cleanSummary(entry) {
  const summary = entry.summary?.trim()
  if (summary && summary.toLowerCase() !== 'summary unavailable.') return summary
  return entry.message || `${entry.modelLabel ?? 'Model'} prompt update`
}

export function computeImpactScore(entry) {
  if (entry.impact_score != null) return entry.impact_score
  const diffScore = Math.min(entry.diff?.total_change ?? 0, 500)
  const deltaScore = Math.min(Math.floor(Math.abs(entry.prompt_delta ?? 0) / 100), 250)
  const tagScore = (entry.behavioral_tags ?? []).reduce((sum, tag) => sum + (TAG_IMPACT_WEIGHTS[tag] ?? 0), 0)
  return diffScore + deltaScore + tagScore
}

export function getImpactLevel(entry) {
  if (entry.impact_level) return entry.impact_level
  const score = computeImpactScore(entry)
  if (score >= 180) return 'high'
  if (score >= 50) return 'medium'
  return 'low'
}

export function flattenTimeline(timelines) {
  return Object.entries(timelines ?? {})
    .flatMap(([model, entries]) => (entries ?? []).map(entry => {
      const meta = MODEL_META[model] ?? { label: model, color: TAG_COLORS.other }
      return {
        ...entry,
        model,
        modelLabel: meta.label,
        modelColor: meta.color,
        impact_score: computeImpactScore(entry),
        impact_level: getImpactLevel(entry),
      }
    }))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
}

export function getSpotlightEntry(entries) {
  return [...entries].sort((a, b) => {
    if (b.impact_score !== a.impact_score) return b.impact_score - a.impact_score
    return String(b.date).localeCompare(String(a.date))
  })[0] ?? null
}

export function getModelProfile(model, stats, entries) {
  const meta = MODEL_META[model] ?? { label: model, color: TAG_COLORS.other }
  const modelStats = stats?.[model] ?? {}
  const sorted = [...(entries ?? [])].sort((a, b) => String(b.date).localeCompare(String(a.date)))
  const latest = sorted[0]
  const tagCounts = {}

  for (const entry of sorted) {
    for (const tag of entry.behavioral_tags ?? []) {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1
    }
  }

  const dominantTags = modelStats.dominant_tags ?? Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([tag]) => tag)

  return {
    model,
    label: meta.label,
    color: meta.color,
    provider: meta.provider,
    totalChanges: modelStats.total_changes ?? sorted.length,
    latestDate: modelStats.latest_change_date ?? latest?.date ?? null,
    currentPromptLength: modelStats.current_prompt_length ?? latest?.prompt_length ?? null,
    promptGrowth: modelStats.prompt_growth ?? sorted.reduce((sum, entry) => sum + (entry.prompt_delta ?? 0), 0),
    highImpactChanges: modelStats.high_impact_changes ?? sorted.filter(entry => getImpactLevel(entry) === 'high').length,
    dominantTags,
    latest,
  }
}

export function getBrowseRows(entries) {
  const byDate = [...entries].sort((a, b) => String(b.date).localeCompare(String(a.date)))
  const byImpact = [...entries].sort((a, b) => b.impact_score - a.impact_score || String(b.date).localeCompare(String(a.date)))
  const safetyPolicy = byDate.filter(entry => (entry.behavioral_tags ?? []).some(tag => tag === 'safety' || tag === 'policy'))
  const toolsCapability = byDate.filter(entry => (entry.behavioral_tags ?? []).some(tag => tag === 'tool_definition' || tag === 'capability'))
  const promptGrowth = [...entries]
    .filter(entry => entry.prompt_delta != null && entry.prompt_delta !== 0)
    .sort((a, b) => Math.abs(b.prompt_delta) - Math.abs(a.prompt_delta))

  return [
    { id: 'latest', title: 'Latest Changes', entries: byDate },
    { id: 'impact', title: 'High Impact', entries: byImpact.filter(entry => entry.impact_level === 'high') },
    { id: 'safety', title: 'Safety & Policy', entries: safetyPolicy },
    { id: 'tools', title: 'Tools & Capabilities', entries: toolsCapability },
    { id: 'growth', title: 'Prompt Growth', entries: promptGrowth },
  ].filter(row => row.entries.length > 0)
}
