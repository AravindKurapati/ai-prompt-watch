import { describe, it, expect } from 'vitest'
import { filterEntries, computeTagProportions, ALL_TAGS } from './tagColors'

const e = (tags) => ({ behavioral_tags: tags })

describe('filterEntries', () => {
  it('returns all entries when all tags active', () => {
    const result = filterEntries([e(['safety']), e(['policy'])], new Set(ALL_TAGS))
    expect(result).toHaveLength(2)
  })

  it('returns empty when no tags active', () => {
    expect(filterEntries([e(['safety'])], new Set())).toHaveLength(0)
  })

  it('OR logic — entry with any matching tag passes', () => {
    const entries = [e(['safety', 'policy']), e(['persona']), e(['other'])]
    const result = filterEntries(entries, new Set(['safety', 'persona']))
    expect(result).toHaveLength(2)
  })

  it('filters to exact match', () => {
    const entries = [e(['safety']), e(['policy']), e(['persona'])]
    expect(filterEntries(entries, new Set(['safety']))).toHaveLength(1)
  })

  it('handles missing behavioral_tags gracefully', () => {
    expect(filterEntries([{ behavioral_tags: undefined }], new Set(['safety']))).toHaveLength(0)
  })
})

describe('computeTagProportions', () => {
  it('returns empty for empty entries', () => {
    expect(computeTagProportions([])).toEqual({})
  })

  it('correct proportion for single-tagged entries', () => {
    const entries = [e(['safety']), e(['safety']), e(['policy'])]
    const p = computeTagProportions(entries)
    expect(p.safety).toBeCloseTo(2 / 3)
    expect(p.policy).toBeCloseTo(1 / 3)
    expect(p.persona).toBe(0)
  })

  it('proportions sum above 1 for multi-tagged entries', () => {
    const p = computeTagProportions([e(['safety', 'policy'])])
    expect(Object.values(p).reduce((a, b) => a + b, 0)).toBeGreaterThan(1)
  })
})
