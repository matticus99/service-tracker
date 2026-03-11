import { describe, it, expect } from 'vitest'
import { mergeHistory, groupByMonth } from '../history'
import type { OilChange, ServiceRecord } from '@/types/api'

function makeOilChange(overrides: Partial<OilChange> = {}): OilChange {
  return {
    id: '1',
    vehicle_id: 'v1',
    service_date: '2025-06-01',
    facility: 'Take 5',
    odometer: 183000,
    interval_miles: null,
    interval_months: null,
    notes: null,
    created_at: '2025-06-01T10:00:00Z',
    ...overrides,
  }
}

function makeServiceRecord(overrides: Partial<ServiceRecord> = {}): ServiceRecord {
  return {
    id: '2',
    vehicle_id: 'v1',
    service_date: '2025-05-01',
    facility: 'DIY',
    odometer: 182000,
    services_performed: ['Brake inspection'],
    notes: null,
    shop_id: null,
    total_cost: null,
    shop_fee: null,
    tax: null,
    items: [],
    linked_observation_ids: [],
    created_at: '2025-05-01T10:00:00Z',
    ...overrides,
  }
}

describe('mergeHistory', () => {
  it('sorts by date descending', () => {
    const oc = makeOilChange({ service_date: '2025-06-01' })
    const sr = makeServiceRecord({ service_date: '2025-05-01' })
    const merged = mergeHistory([oc], [sr])

    expect(merged).toHaveLength(2)
    expect(merged[0]!.type).toBe('oil_change')
    expect(merged[0]!.data.service_date).toBe('2025-06-01')
    expect(merged[1]!.type).toBe('service')
    expect(merged[1]!.data.service_date).toBe('2025-05-01')
  })

  it('handles empty arrays', () => {
    expect(mergeHistory([], [])).toEqual([])
  })

  it('handles only oil changes', () => {
    const oc = makeOilChange()
    const merged = mergeHistory([oc], [])
    expect(merged).toHaveLength(1)
    expect(merged[0]!.type).toBe('oil_change')
  })

  it('handles only service records', () => {
    const sr = makeServiceRecord()
    const merged = mergeHistory([], [sr])
    expect(merged).toHaveLength(1)
    expect(merged[0]!.type).toBe('service')
  })

  it('breaks ties by created_at descending', () => {
    const oc = makeOilChange({
      service_date: '2025-06-01',
      created_at: '2025-06-01T08:00:00Z',
    })
    const sr = makeServiceRecord({
      service_date: '2025-06-01',
      created_at: '2025-06-01T12:00:00Z',
    })
    const merged = mergeHistory([oc], [sr])
    // sr has later created_at so should come first
    expect(merged[0]!.type).toBe('service')
    expect(merged[1]!.type).toBe('oil_change')
  })
})

describe('groupByMonth', () => {
  it('groups entries by month', () => {
    const oc = makeOilChange({ service_date: '2025-06-01' })
    const sr = makeServiceRecord({ service_date: '2025-05-01' })
    const merged = mergeHistory([oc], [sr])
    const groups = groupByMonth(merged)

    expect(groups).toHaveLength(2)
    expect(groups[0]![0]).toBe('June 2025')
    expect(groups[0]![1]).toHaveLength(1)
    expect(groups[1]![0]).toBe('May 2025')
    expect(groups[1]![1]).toHaveLength(1)
  })

  it('groups multiple entries in same month', () => {
    const oc1 = makeOilChange({ id: '1', service_date: '2025-06-15' })
    const oc2 = makeOilChange({ id: '2', service_date: '2025-06-01' })
    const merged = mergeHistory([oc1, oc2], [])
    const groups = groupByMonth(merged)

    expect(groups).toHaveLength(1)
    expect(groups[0]![0]).toBe('June 2025')
    expect(groups[0]![1]).toHaveLength(2)
  })

  it('handles empty input', () => {
    expect(groupByMonth([])).toEqual([])
  })
})
