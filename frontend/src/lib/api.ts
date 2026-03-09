import type {
  Vehicle,
  OilChange,
  ServiceRecord,
  IntervalItem,
  Observation,
  Dashboard,
  Settings,
  OilChangeCreate,
  ServiceRecordCreate,
  ObservationCreate,
  IntervalItemCreate,
  VehicleUpdate,
  SettingsUpdate,
  AttachmentMeta,
  PushSubscriptionInfo,
  ServiceCategory,
  Shop,
  ShopCreate,
  ShopUpdate,
  NoteServiceLink,
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
    update: (id: string, data: VehicleUpdate) =>
      request<Vehicle>(`/vehicles/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
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

  categories: {
    list: () => request<ServiceCategory[]>('/categories'),
  },

  oilChanges: {
    list: (vehicleId: string) =>
      request<OilChange[]>(`/vehicles/${vehicleId}/oil-changes`),
    create: (vehicleId: string, data: OilChangeCreate) =>
      request<OilChange>(`/vehicles/${vehicleId}/oil-changes`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  serviceRecords: {
    list: (vehicleId: string) =>
      request<ServiceRecord[]>(`/vehicles/${vehicleId}/service-records`),
    get: (vehicleId: string, recordId: string) =>
      request<ServiceRecord>(`/vehicles/${vehicleId}/service-records/${recordId}`),
    create: (vehicleId: string, data: ServiceRecordCreate) =>
      request<ServiceRecord>(`/vehicles/${vehicleId}/service-records`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (vehicleId: string, recordId: string, data: Partial<ServiceRecordCreate>) =>
      request<ServiceRecord>(`/vehicles/${vehicleId}/service-records/${recordId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (vehicleId: string, recordId: string) =>
      request<void>(`/vehicles/${vehicleId}/service-records/${recordId}`, {
        method: 'DELETE',
      }),
    linkObservation: (vehicleId: string, recordId: string, observationId: string) =>
      request<NoteServiceLink>(
        `/vehicles/${vehicleId}/service-records/${recordId}/links?observation_id=${observationId}`,
        { method: 'POST' },
      ),
    unlinkObservation: (vehicleId: string, recordId: string, linkId: string) =>
      request<void>(
        `/vehicles/${vehicleId}/service-records/${recordId}/links/${linkId}`,
        { method: 'DELETE' },
      ),
  },

  shops: {
    list: (vehicleId: string) =>
      request<Shop[]>(`/vehicles/${vehicleId}/shops`),
    get: (vehicleId: string, shopId: string) =>
      request<Shop>(`/vehicles/${vehicleId}/shops/${shopId}`),
    create: (vehicleId: string, data: ShopCreate) =>
      request<Shop>(`/vehicles/${vehicleId}/shops`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (vehicleId: string, shopId: string, data: ShopUpdate) =>
      request<Shop>(`/vehicles/${vehicleId}/shops/${shopId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (vehicleId: string, shopId: string) =>
      request<void>(`/vehicles/${vehicleId}/shops/${shopId}`, {
        method: 'DELETE',
      }),
  },

  intervalItems: {
    list: (vehicleId: string) =>
      request<IntervalItem[]>(`/vehicles/${vehicleId}/interval-items`),
    create: (vehicleId: string, data: IntervalItemCreate) =>
      request<IntervalItem>(`/vehicles/${vehicleId}/interval-items`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (vehicleId: string, itemId: string, data: Partial<IntervalItemCreate>) =>
      request<IntervalItem>(`/vehicles/${vehicleId}/interval-items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    markServiced: (
      vehicleId: string,
      itemId: string,
      data: { service_date: string; odometer: number; facility?: string | null },
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
    create: (vehicleId: string, data: ObservationCreate) =>
      request<Observation>(`/vehicles/${vehicleId}/observations`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (vehicleId: string, obsId: string, data: Partial<Observation>) =>
      request<Observation>(`/vehicles/${vehicleId}/observations/${obsId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    linkServiceRecord: (vehicleId: string, obsId: string, serviceRecordId: string) =>
      request<NoteServiceLink>(
        `/vehicles/${vehicleId}/observations/${obsId}/links?service_record_id=${serviceRecordId}`,
        { method: 'POST' },
      ),
    unlinkServiceRecord: (vehicleId: string, obsId: string, linkId: string) =>
      request<void>(
        `/vehicles/${vehicleId}/observations/${obsId}/links/${linkId}`,
        { method: 'DELETE' },
      ),
  },

  settings: {
    get: () => request<Settings>('/settings'),
    update: (data: SettingsUpdate) =>
      request<Settings>('/settings', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },

  attachments: {
    list: (vehicleId: string, recordType: string, recordId: string) =>
      request<AttachmentMeta[]>(
        `/attachments?vehicle_id=${vehicleId}&record_type=${recordType}&record_id=${recordId}`,
      ),
    upload: async (data: FormData): Promise<AttachmentMeta> => {
      const res = await fetch(`${BASE}/attachments/upload`, {
        method: 'POST',
        body: data,
      })
      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText)
        throw new Error(`${res.status}: ${text}`)
      }
      return res.json()
    },
    getUrl: (id: string) => `${BASE}/attachments/${id}`,
    delete: (id: string) =>
      request<void>(`/attachments/${id}`, { method: 'DELETE' }),
  },

  pushSubscriptions: {
    list: (vehicleId: string) =>
      request<PushSubscriptionInfo[]>(`/vehicles/${vehicleId}/push-subscriptions`),
    delete: (vehicleId: string, subId: string) =>
      request<void>(`/vehicles/${vehicleId}/push-subscriptions/${subId}`, {
        method: 'DELETE',
      }),
    sendTest: (subId: string) =>
      request<{ status: string }>(`/push/test/${subId}`, { method: 'POST' }),
  },

  export: {
    url: () => `${BASE}/export`,
  },
}
