import type {
  Vehicle,
  OilChange,
  ServiceRecord,
  IntervalItem,
  Observation,
  Dashboard,
  Settings,
} from '@/types/api'

const BASE = '/api/v1'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`${res.status}: ${text}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  vehicles: {
    list: () => request<Vehicle[]>('/vehicles'),
    get: (id: string) => request<Vehicle>(`/vehicles/${id}`),
    updateMileage: (id: string, mileage: number) =>
      request<Vehicle>(`/vehicles/${id}/mileage`, {
        method: 'PATCH',
        body: JSON.stringify({ current_mileage: mileage }),
      }),
  },

  dashboard: {
    get: (vehicleId: string) =>
      request<Dashboard>(`/vehicles/${vehicleId}/dashboard`),
  },

  oilChanges: {
    list: (vehicleId: string) =>
      request<OilChange[]>(`/vehicles/${vehicleId}/oil-changes`),
  },

  serviceRecords: {
    list: (vehicleId: string) =>
      request<ServiceRecord[]>(`/vehicles/${vehicleId}/service-records`),
  },

  intervalItems: {
    list: (vehicleId: string) =>
      request<IntervalItem[]>(`/vehicles/${vehicleId}/interval-items`),
    markServiced: (
      vehicleId: string,
      itemId: string,
      data: { service_date: string; odometer: number },
    ) =>
      request<IntervalItem>(
        `/vehicles/${vehicleId}/interval-items/${itemId}/mark-serviced`,
        { method: 'POST', body: JSON.stringify(data) },
      ),
  },

  observations: {
    list: (vehicleId: string, resolved?: boolean) => {
      const params = resolved !== undefined ? `?resolved=${resolved}` : ''
      return request<Observation[]>(
        `/vehicles/${vehicleId}/observations${params}`,
      )
    },
    update: (vehicleId: string, obsId: string, data: Partial<Observation>) =>
      request<Observation>(`/vehicles/${vehicleId}/observations/${obsId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },

  settings: {
    get: () => request<Settings>('/settings'),
  },
}
