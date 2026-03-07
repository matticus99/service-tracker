import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { mergeHistory } from '@/lib/history'
import type {
  OilChangeCreate,
  ServiceRecordCreate,
  ObservationCreate,
  IntervalItemCreate,
  VehicleUpdate,
  SettingsUpdate,
} from '@/types/api'

export function useVehicles() {
  return useQuery({
    queryKey: ['vehicles'],
    queryFn: api.vehicles.list,
  })
}

export function useDashboard(vehicleId: string | undefined) {
  return useQuery({
    queryKey: ['dashboard', vehicleId],
    queryFn: () => api.dashboard.get(vehicleId!),
    enabled: !!vehicleId,
  })
}

export function useServiceHistory(vehicleId: string | undefined) {
  return useQuery({
    queryKey: ['service-history', vehicleId],
    queryFn: async () => {
      const [oilChanges, serviceRecords] = await Promise.all([
        api.oilChanges.list(vehicleId!),
        api.serviceRecords.list(vehicleId!),
      ])
      return mergeHistory(oilChanges, serviceRecords)
    },
    enabled: !!vehicleId,
  })
}

export function useIntervalItems(vehicleId: string | undefined) {
  return useQuery({
    queryKey: ['interval-items', vehicleId],
    queryFn: () => api.intervalItems.list(vehicleId!),
    enabled: !!vehicleId,
  })
}

export function useObservations(
  vehicleId: string | undefined,
  resolved?: boolean,
) {
  return useQuery({
    queryKey: ['observations', vehicleId, resolved],
    queryFn: () => api.observations.list(vehicleId!, resolved),
    enabled: !!vehicleId,
  })
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: api.settings.get,
  })
}

export function useFacilities(vehicleId: string | undefined) {
  return useQuery({
    queryKey: ['facilities', vehicleId],
    queryFn: async () => {
      const [oilChanges, serviceRecords] = await Promise.all([
        api.oilChanges.list(vehicleId!),
        api.serviceRecords.list(vehicleId!),
      ])
      const set = new Set<string>()
      for (const oc of oilChanges) if (oc.facility) set.add(oc.facility)
      for (const sr of serviceRecords) if (sr.facility) set.add(sr.facility)
      return Array.from(set).sort()
    },
    enabled: !!vehicleId,
  })
}

export function useAttachments(
  vehicleId: string | undefined,
  recordType: string,
  recordId: string | undefined,
) {
  return useQuery({
    queryKey: ['attachments', vehicleId, recordType, recordId],
    queryFn: () => api.attachments.list(vehicleId!, recordType, recordId!),
    enabled: !!vehicleId && !!recordId,
  })
}

// Mutations

export function useUpdateMileage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      vehicleId,
      mileage,
    }: {
      vehicleId: string
      mileage: number
    }) => api.vehicles.updateMileage(vehicleId, mileage),
    onSuccess: (_data, { vehicleId }) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', vehicleId] })
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      queryClient.invalidateQueries({
        queryKey: ['interval-items', vehicleId],
      })
    },
  })
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      vehicleId,
      data,
    }: {
      vehicleId: string
      data: VehicleUpdate
    }) => api.vehicles.update(vehicleId, data),
    onSuccess: (_data, { vehicleId }) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', vehicleId] })
    },
  })
}

export function useCreateOilChange() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      vehicleId,
      data,
    }: {
      vehicleId: string
      data: OilChangeCreate
    }) => api.oilChanges.create(vehicleId, data),
    onSuccess: (_data, { vehicleId }) => {
      queryClient.invalidateQueries({
        queryKey: ['service-history', vehicleId],
      })
      queryClient.invalidateQueries({ queryKey: ['dashboard', vehicleId] })
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      queryClient.invalidateQueries({ queryKey: ['facilities', vehicleId] })
    },
  })
}

export function useCreateServiceRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      vehicleId,
      data,
    }: {
      vehicleId: string
      data: ServiceRecordCreate
    }) => api.serviceRecords.create(vehicleId, data),
    onSuccess: (_data, { vehicleId }) => {
      queryClient.invalidateQueries({
        queryKey: ['service-history', vehicleId],
      })
      queryClient.invalidateQueries({ queryKey: ['dashboard', vehicleId] })
      queryClient.invalidateQueries({ queryKey: ['facilities', vehicleId] })
    },
  })
}

export function useCreateObservation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      vehicleId,
      data,
    }: {
      vehicleId: string
      data: ObservationCreate
    }) => api.observations.create(vehicleId, data),
    onSuccess: (_data, { vehicleId }) => {
      queryClient.invalidateQueries({ queryKey: ['observations', vehicleId] })
    },
  })
}

export function useCreateIntervalItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      vehicleId,
      data,
    }: {
      vehicleId: string
      data: IntervalItemCreate
    }) => api.intervalItems.create(vehicleId, data),
    onSuccess: (_data, { vehicleId }) => {
      queryClient.invalidateQueries({
        queryKey: ['interval-items', vehicleId],
      })
      queryClient.invalidateQueries({ queryKey: ['dashboard', vehicleId] })
    },
  })
}

export function useUpdateIntervalItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      vehicleId,
      itemId,
      data,
    }: {
      vehicleId: string
      itemId: string
      data: Partial<IntervalItemCreate>
    }) => api.intervalItems.update(vehicleId, itemId, data),
    onSuccess: (_data, { vehicleId }) => {
      queryClient.invalidateQueries({
        queryKey: ['interval-items', vehicleId],
      })
      queryClient.invalidateQueries({ queryKey: ['dashboard', vehicleId] })
    },
  })
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: SettingsUpdate) => api.settings.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useMarkServiced() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      vehicleId,
      itemId,
      data,
    }: {
      vehicleId: string
      itemId: string
      data: { service_date: string; odometer: number }
    }) => api.intervalItems.markServiced(vehicleId, itemId, data),
    onSuccess: (_data, { vehicleId }) => {
      queryClient.invalidateQueries({
        queryKey: ['interval-items', vehicleId],
      })
      queryClient.invalidateQueries({ queryKey: ['dashboard', vehicleId] })
    },
  })
}

export function useToggleObservationResolved() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      vehicleId,
      obsId,
      resolved,
    }: {
      vehicleId: string
      obsId: string
      resolved: boolean
    }) =>
      api.observations.update(vehicleId, obsId, {
        resolved,
        resolved_date: resolved
          ? new Date().toISOString().split('T')[0]
          : null,
      }),
    onSuccess: (_data, { vehicleId }) => {
      queryClient.invalidateQueries({
        queryKey: ['observations', vehicleId],
      })
    },
  })
}

export function useUploadAttachment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (formData: FormData) => api.attachments.upload(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments'] })
    },
  })
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.attachments.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments'] })
    },
  })
}

// Push subscriptions

export function usePushSubscriptions(vehicleId: string | undefined) {
  return useQuery({
    queryKey: ['push-subscriptions', vehicleId],
    queryFn: () => api.pushSubscriptions.list(vehicleId!),
    enabled: !!vehicleId,
  })
}

export function useDeletePushSubscription() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      vehicleId,
      subId,
    }: {
      vehicleId: string
      subId: string
    }) => api.pushSubscriptions.delete(vehicleId, subId),
    onSuccess: (_data, { vehicleId }) => {
      queryClient.invalidateQueries({
        queryKey: ['push-subscriptions', vehicleId],
      })
    },
  })
}

export function useSendTestNotification() {
  return useMutation({
    mutationFn: (subId: string) => api.pushSubscriptions.sendTest(subId),
  })
}
