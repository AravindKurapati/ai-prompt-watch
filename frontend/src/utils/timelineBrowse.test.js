import { describe, expect, it } from 'vitest'
import { cleanSummary, flattenTimeline, getBrowseRows, getModelProfile, getSpotlightEntry } from './timelineBrowse'

describe('timelineBrowse utilities', () => {
  const timelines = {
    claude: [
      {
        date: '2026-02-01',
        commit: 'a',
        diff: { total_change: 220 },
        behavioral_tags: ['safety'],
        prompt_delta: 3000,
      },
    ],
    openai: [],
    grok: [
      {
        date: '2026-01-01',
        commit: 'b',
        diff: { total_change: 5 },
        behavioral_tags: ['tool_definition'],
        prompt_delta: 0,
      },
    ],
  }

  it('flattens model timelines and adds impact metadata', () => {
    const entries = flattenTimeline(timelines)
    expect(entries).toHaveLength(2)
    expect(entries[0].model).toBe('claude')
    expect(entries[0].impact_level).toBe('high')
  })

  it('selects spotlight by impact before recency', () => {
    const entries = flattenTimeline(timelines)
    expect(getSpotlightEntry(entries).commit).toBe('a')
  })

  it('builds rows from behavior tags', () => {
    const rows = getBrowseRows(flattenTimeline(timelines))
    expect(rows.map(row => row.id)).toContain('safety')
    expect(rows.map(row => row.id)).toContain('tools')
  })

  it('profiles empty models without crashing', () => {
    const profile = getModelProfile('openai', { openai: { total_changes: 0 } }, [])
    expect(profile.totalChanges).toBe(0)
    expect(profile.latestDate).toBeNull()
    expect(profile.dominantTags).toEqual([])
  })

  it('treats generated unavailable summaries as missing', () => {
    expect(cleanSummary({ summary: 'Summary unavailable.', message: 'Update tool definitions' })).toBe('Update tool definitions')
  })
})
