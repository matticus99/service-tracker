import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { useVehicle } from '@/context/VehicleContext'
import { formatMileage } from '@/lib/format'

export function VehicleSelector() {
  const { vehicle, vehicles, setVehicleId } = useVehicle()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (!vehicle) return null

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 bg-bg-card border border-border-default rounded-full hover:border-accent/40 transition-colors"
      >
        <span className="text-sm font-semibold">
          {vehicle.year} {vehicle.make} {vehicle.model}
        </span>
        <span className="text-xs text-text-secondary font-mono">
          {formatMileage(vehicle.current_mileage)} mi
        </span>
        <ChevronDown
          className={`w-4 h-4 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && vehicles.length > 1 && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-bg-elevated border border-border-default rounded-lg shadow-xl z-50 py-1">
          {vehicles.map((v) => (
            <button
              key={v.id}
              onClick={() => {
                setVehicleId(v.id)
                setOpen(false)
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-bg-card transition-colors text-left"
            >
              <div className="flex-1">
                <div className="text-sm font-medium">
                  {v.year} {v.make} {v.model}
                </div>
                <div className="text-xs text-text-secondary font-mono">
                  {formatMileage(v.current_mileage)} mi
                </div>
              </div>
              {v.id === vehicle.id && (
                <Check className="w-4 h-4 text-accent" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
