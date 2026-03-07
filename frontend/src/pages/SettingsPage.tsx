import { useState, useEffect } from 'react'
import { Car, DollarSign, Database, Bell, Save } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { FormField, inputClass } from '@/components/forms/FormField'
import { useVehicle } from '@/context/VehicleContext'
import { useSettings, useUpdateVehicle, useUpdateSettings } from '@/hooks/useApi'
import { useToast } from '@/context/ToastContext'
import { api } from '@/lib/api'
import { PageSkeleton } from '@/components/ui/Skeleton'

export function SettingsPage() {
  const { vehicleId, vehicle } = useVehicle()
  const { data: settings, isLoading } = useSettings()
  const { toast } = useToast()

  if (isLoading) return <PageSkeleton cards={3} />

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      {vehicle && vehicleId && (
        <VehicleInfoCard vehicleId={vehicleId} vehicle={vehicle} toast={toast} />
      )}
      {settings && <CostSettingsCard settings={settings} toast={toast} />}
      <DataCard />
      <NotificationsCard />
    </div>
  )
}

function VehicleInfoCard({
  vehicleId,
  vehicle,
  toast,
}: {
  vehicleId: string
  vehicle: { year: number; make: string; model: string; trim: string | null; color: string | null; vin: string | null }
  toast: (msg: string, type?: 'success' | 'error') => void
}) {
  const mutation = useUpdateVehicle()
  const [year, setYear] = useState(String(vehicle.year))
  const [make, setMake] = useState(vehicle.make)
  const [model, setModel] = useState(vehicle.model)
  const [trim, setTrim] = useState(vehicle.trim ?? '')
  const [color, setColor] = useState(vehicle.color ?? '')
  const [vin, setVin] = useState(vehicle.vin ?? '')

  useEffect(() => {
    setYear(String(vehicle.year))
    setMake(vehicle.make)
    setModel(vehicle.model)
    setTrim(vehicle.trim ?? '')
    setColor(vehicle.color ?? '')
    setVin(vehicle.vin ?? '')
  }, [vehicle])

  function handleSave() {
    const y = parseInt(year, 10)
    if (isNaN(y) || !make.trim() || !model.trim()) {
      toast('Year, make, and model are required', 'error')
      return
    }
    mutation.mutate(
      {
        vehicleId,
        data: {
          year: y,
          make: make.trim(),
          model: model.trim(),
          trim: trim.trim() || null,
          color: color.trim() || null,
          vin: vin.trim() || null,
        },
      },
      {
        onSuccess: () => toast('Vehicle info updated'),
        onError: () => toast('Failed to update', 'error'),
      },
    )
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Car className="w-4 h-4 text-accent" />
        <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
          Vehicle Info
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Year" required>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className={`${inputClass} font-mono`}
          />
        </FormField>
        <FormField label="Make" required>
          <input
            type="text"
            value={make}
            onChange={(e) => setMake(e.target.value)}
            className={inputClass}
          />
        </FormField>
        <FormField label="Model" required>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className={inputClass}
          />
        </FormField>
        <FormField label="Trim">
          <input
            type="text"
            value={trim}
            onChange={(e) => setTrim(e.target.value)}
            className={inputClass}
          />
        </FormField>
        <FormField label="Color">
          <input
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className={inputClass}
          />
        </FormField>
        <FormField label="VIN">
          <input
            type="text"
            value={vin}
            onChange={(e) => setVin(e.target.value)}
            className={inputClass}
          />
        </FormField>
      </div>
      <button
        onClick={handleSave}
        disabled={mutation.isPending}
        className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 bg-accent text-text-inverse rounded-lg hover:bg-accent-hover transition-colors text-sm font-medium disabled:opacity-50"
      >
        <Save className="w-4 h-4" />
        {mutation.isPending ? 'Saving...' : 'Save Changes'}
      </button>
    </Card>
  )
}

function CostSettingsCard({
  settings,
  toast,
}: {
  settings: { shop_fee: number; tax_rate: number }
  toast: (msg: string, type?: 'success' | 'error') => void
}) {
  const mutation = useUpdateSettings()
  const [shopFee, setShopFee] = useState(settings.shop_fee.toFixed(2))
  const [taxRate, setTaxRate] = useState(
    (settings.tax_rate * 100).toFixed(1),
  )

  useEffect(() => {
    setShopFee(settings.shop_fee.toFixed(2))
    setTaxRate((settings.tax_rate * 100).toFixed(1))
  }, [settings])

  function handleSave() {
    const fee = parseFloat(shopFee)
    const rate = parseFloat(taxRate)
    if (isNaN(fee) || isNaN(rate) || fee < 0 || rate < 0) {
      toast('Invalid values', 'error')
      return
    }
    mutation.mutate(
      { shop_fee: fee, tax_rate: rate / 100 },
      {
        onSuccess: () => toast('Cost settings updated'),
        onError: () => toast('Failed to update', 'error'),
      },
    )
  }

  return (
    <Card delay={0.06}>
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="w-4 h-4 text-accent" />
        <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
          Cost Settings
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Shop Fee ($)">
          <input
            type="number"
            value={shopFee}
            onChange={(e) => setShopFee(e.target.value)}
            step="0.01"
            min="0"
            className={`${inputClass} font-mono`}
          />
        </FormField>
        <FormField label="Tax Rate (%)">
          <input
            type="number"
            value={taxRate}
            onChange={(e) => setTaxRate(e.target.value)}
            step="0.1"
            min="0"
            className={`${inputClass} font-mono`}
          />
        </FormField>
      </div>
      <button
        onClick={handleSave}
        disabled={mutation.isPending}
        className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 bg-accent text-text-inverse rounded-lg hover:bg-accent-hover transition-colors text-sm font-medium disabled:opacity-50"
      >
        <Save className="w-4 h-4" />
        {mutation.isPending ? 'Saving...' : 'Save Changes'}
      </button>
    </Card>
  )
}

function DataCard() {
  return (
    <Card delay={0.12}>
      <div className="flex items-center gap-2 mb-4">
        <Database className="w-4 h-4 text-accent" />
        <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
          Data
        </span>
      </div>
      <button
        onClick={() => window.open(api.export.url(), '_blank')}
        className="w-full py-2.5 border border-border-default rounded-lg text-text-secondary hover:bg-bg-elevated transition-colors text-sm"
      >
        Export All Data (JSON)
      </button>
    </Card>
  )
}

function NotificationsCard() {
  return (
    <Card delay={0.18}>
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-4 h-4 text-text-muted" />
        <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
          Push Notifications
        </span>
      </div>
      <p className="text-sm text-text-muted">Coming in Phase 4</p>
    </Card>
  )
}
