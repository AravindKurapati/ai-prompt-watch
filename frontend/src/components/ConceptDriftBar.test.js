import { describe, it, expect } from 'vitest'
import { computeTagProportions } from '../utils/tagColors'

describe('computeTagProportions used by ConceptDriftBar', () => {
  it('all zeros for empty entries', () => {
    expect(computeTagProportions([])).toEqual({})
  })

  it('untagged tags have proportion 0', () => {
    const p = computeTagProportions([{ behavioral_tags: ['safety'] }])
    expect(p.safety).toBe(1)
    expect(p.policy).toBe(0)
  })

  it('proportions sum above 1 for multi-tagged entries', () => {
    const p = computeTagProportions([{ behavioral_tags: ['safety', 'policy'] }])
    expect(Object.values(p).reduce((a, b) => a + b, 0)).toBeGreaterThan(1)
  })
})
