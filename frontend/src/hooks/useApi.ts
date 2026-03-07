import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { mergeHistory } from '@/lib/history'

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
