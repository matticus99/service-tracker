import { describe, it, expect } from 'vitest'
import { fuzzyMatch } from '../fuzzyMatch'

describe('fuzzyMatch', () => {
  it('matches exact strings', () => {
    expect(fuzzyMatch('Oil Change', 'Oil Change')).toBe(true)
  })

  it('matches case-insensitively', () => {
    expect(fuzzyMatch('oil change', 'Oil Change')).toBe(true)
  })

  it('matches when first is substring of second', () => {
    expect(fuzzyMatch('Oil', 'Oil Change')).toBe(true)
  })

  it('matches when second is substring of first', () => {
    expect(fuzzyMatch('Oil Change Service', 'Oil Change')).toBe(true)
  })

  it('matches on shared word with 3+ chars', () => {
    expect(fuzzyMatch('Brake Inspection', 'Front Brake Pads')).toBe(true)
  })

  it('does not match unrelated strings', () => {
    expect(fuzzyMatch('Oil Change', 'Tire Rotation')).toBe(false)
  })

  it('does not match on short shared words (<3 chars)', () => {
    // "AC" is only 2 chars, should not trigger word overlap match
    // But if one is substring of the other, it would match via includes
    expect(fuzzyMatch('AC Fix', 'Brake AC Recharge')).toBe(false)
  })

  it('returns false for empty first string', () => {
    expect(fuzzyMatch('', 'Oil Change')).toBe(false)
  })

  it('returns false for empty second string', () => {
    expect(fuzzyMatch('Oil Change', '')).toBe(false)
  })

  it('ignores special characters', () => {
    // normalize removes non-alphanumeric except spaces
    expect(fuzzyMatch('A/C Service', 'AC Service')).toBe(true)
  })

  it('matches with extra whitespace', () => {
    expect(fuzzyMatch('  Oil Change  ', 'Oil Change')).toBe(true)
  })
})
