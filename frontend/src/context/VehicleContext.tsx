import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react'
import { useVehicles } from '@/hooks/useApi'
import type { Vehicle } from '@/types/api'

interface VehicleContextValue {
  vehicleId: string | undefined
  vehicle: Vehicle | undefined
  vehicles: Vehicle[]
  setVehicleId: (id: string) => void
  isLoading: boolean
}

const VehicleContext = createContext<VehicleContextValue | null>(null)

const STORAGE_KEY = 'selectedVehicleId'

export function VehicleProvider({ children }: { children: ReactNode }) {
  const { data: vehicles = [], isLoading } = useVehicles()
  const [vehicleId, setVehicleId] = useState<string | undefined>(() => {
    return localStorage.getItem(STORAGE_KEY) ?? undefined
  })

  useEffect(() => {
    if (vehicles.length > 0 && !vehicles.find((v) => v.id === vehicleId)) {
      setVehicleId(vehicles[0]!.id)
    }
  }, [vehicles, vehicleId])

  useEffect(() => {
    if (vehicleId) {
      localStorage.setItem(STORAGE_KEY, vehicleId)
    }
  }, [vehicleId])

  const vehicle = vehicles.find((v) => v.id === vehicleId)

  return (
    <VehicleContext.Provider
      value={{ vehicleId, vehicle, vehicles, setVehicleId, isLoading }}
    >
      {children}
    </VehicleContext.Provider>
  )
}

export function useVehicle() {
  const ctx = useContext(VehicleContext)
  if (!ctx) throw new Error('useVehicle must be used within VehicleProvider')
  return ctx
}
