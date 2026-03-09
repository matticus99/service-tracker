import { useState, useEffect, useMemo } from 'react'
import { Calendar, Gauge, Plus, X, DollarSign, FileText } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { FormField, inputClass, textareaClass } from './FormField'
import { ShopAutocomplete } from './ShopAutocomplete'
import { AutoUpdateIntervalsModal } from './AutoUpdateIntervalsModal'
import {
  useCreateServiceRecord,
  useCategories,
  useObservations,
  useSettings,
} from '@/hooks/useApi'
import { api } from '@/lib/api'
import { useToast } from '@/context/ToastContext'
import type { ServiceCategory } from '@/types/api'

interface ServiceRow {
  id: number
  categoryId: string
  serviceDefinitionId: string
  customName: string
  cost: string
}

function emptyRow(id: number): ServiceRow {
  return { id, categoryId: '', serviceDefinitionId: '', customName: '', cost: '' }
}

interface Props {
  open: boolean
  onClose: () => void
  vehicleId: string
  currentMileage: number
}

export function AddServiceRecordModal({
  open,
  onClose,
  vehicleId,
  currentMileage,
}: Props) {
  const [date, setDate] = useState('')
  const [shopId, setShopId] = useState<string | null>(null)
  const [shopName, setShopName] = useState('')
  const [odometer, setOdometer] = useState('')
  const [rows, setRows] = useState<ServiceRow[]>([emptyRow(1)])
  const [notes, setNotes] = useState('')
  const [linkedObsIds, setLinkedObsIds] = useState<string[]>([])
  const [selectedObsId, setSelectedObsId] = useState('')
  const [shopFee, setShopFee] = useState('')
  const [tax, setTax] = useState('')
  const [nextRowId, setNextRowId] = useState(2)
  const [autoUpdateOpen, setAutoUpdateOpen] = useState(false)
  const [savedData, setSavedData] = useState<{
    date: string
    odometer: number | null
    services: string[]
    recordId: string
  } | null>(null)

  const mutation = useCreateServiceRecord()
  const { data: categories } = useCategories()
  const { data: observations } = useObservations(vehicleId, false)
  const { data: settings } = useSettings()
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      setDate(new Date().toISOString().split('T')[0]!)
      setShopId(null)
      setShopName('')
      setOdometer(String(currentMileage))
      setRows([emptyRow(1)])
      setNextRowId(2)
      setNotes('')
      setLinkedObsIds([])
      setSelectedObsId('')
      setShopFee(settings?.shop_fee != null ? String(settings.shop_fee) : '')
      setTax(settings?.tax_rate != null ? String(settings.tax_rate) : '')
    }
  }, [open, currentMileage, settings])

  // Cost calculations
  const subtotal = useMemo(() => {
    return rows.reduce((sum, r) => {
      const c = parseFloat(r.cost)
      return sum + (isNaN(c) ? 0 : c)
    }, 0)
  }, [rows])

  const shopFeeNum = parseFloat(shopFee) || 0
  const taxNum = parseFloat(tax) || 0
  const total = subtotal + shopFeeNum + taxNum

  // Unlinked observations (not already selected)
  const availableObs = useMemo(() => {
    if (!observations) return []
    return observations.filter((o) => !linkedObsIds.includes(o.id))
  }, [observations, linkedObsIds])

  function addRow() {
    setRows((prev) => [...prev, emptyRow(nextRowId)])
    setNextRowId((n) => n + 1)
  }

  function removeRow(id: number) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev))
  }

  function updateRow(id: number, field: keyof ServiceRow, value: string) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        const updated = { ...r, [field]: value }
        // Reset service when category changes
        if (field === 'categoryId') {
          updated.serviceDefinitionId = ''
          updated.customName = ''
        }
        // Reset custom name when switching away from custom
        if (field === 'serviceDefinitionId' && value !== '__custom__') {
          updated.customName = ''
        }
        return updated
      }),
    )
  }

  function getServiceName(row: ServiceRow): string {
    if (row.serviceDefinitionId === '__custom__') return row.customName
    if (!categories) return ''
    for (const cat of categories) {
      const svc = cat.services.find((s) => s.id === row.serviceDefinitionId)
      if (svc) return svc.name
    }
    return ''
  }

  const hasServices = rows.some(
    (r) => r.serviceDefinitionId && (r.serviceDefinitionId !== '__custom__' || r.customName.trim()),
  )
  const isValid = date.length > 0 && hasServices

  async function handleSubmit() {
    if (!isValid) return

    const items = rows
      .filter((r) => r.serviceDefinitionId)
      .map((r, i) => ({
        service_definition_id:
          r.serviceDefinitionId !== '__custom__' ? r.serviceDefinitionId : undefined,
        custom_service_name:
          r.serviceDefinitionId === '__custom__' ? r.customName.trim() : undefined,
        cost: parseFloat(r.cost) || undefined,
        display_order: i,
      }))

    const serviceNames = rows
      .filter((r) => r.serviceDefinitionId)
      .map((r) => getServiceName(r))
      .filter(Boolean)

    const odo = parseInt(odometer, 10)
    const odometerVal = !isNaN(odo) && odo > 0 ? odo : null

    mutation.mutate(
      {
        vehicleId,
        data: {
          service_date: date,
          facility: shopName || undefined,
          odometer: odometerVal,
          shop_id: shopId || undefined,
          total_cost: total > 0 ? total : undefined,
          shop_fee: shopFeeNum > 0 ? shopFeeNum : undefined,
          tax: taxNum > 0 ? taxNum : undefined,
          services_performed: serviceNames.length > 0 ? serviceNames : undefined,
          notes: notes.trim() || undefined,
          items: items.length > 0 ? items : undefined,
        },
      },
      {
        onSuccess: async (record) => {
          // Link selected observations
          for (const obsId of linkedObsIds) {
            try {
              await api.serviceRecords.linkObservation(vehicleId, record.id, obsId)
            } catch {
              // Best-effort linking
            }
          }

          toast('Service record added')

          if (serviceNames.length > 0) {
            setSavedData({
              date,
              odometer: odometerVal,
              services: serviceNames,
              recordId: record.id,
            })
            onClose()
            setAutoUpdateOpen(true)
          } else {
            onClose()
          }
        },
        onError: () => toast('Failed to save service record', 'error'),
      },
    )
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title="Add Service Record">
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <FormField
            label="Service Date"
            icon={<Calendar className="w-3.5 h-3.5" />}
            required
          >
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </FormField>

          <FormField label="Shop">
            <ShopAutocomplete
              value={shopId}
              onChange={(id, name) => {
                setShopId(id)
                setShopName(name)
              }}
              vehicleId={vehicleId}
            />
          </FormField>

          <FormField
            label="Odometer"
            icon={<Gauge className="w-3.5 h-3.5" />}
          >
            <input
              type="number"
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
              placeholder="Optional"
              className={`${inputClass} font-mono`}
            />
          </FormField>

          {/* Service rows */}
          <div>
            <label className="text-sm text-text-secondary block mb-2">
              Services Performed <span className="text-status-overdue">*</span>
            </label>
            <div className="space-y-2">
              {rows.map((row) => (
                <ServiceRowInput
                  key={row.id}
                  row={row}
                  categories={categories ?? []}
                  onUpdate={(field, value) => updateRow(row.id, field, value)}
                  onRemove={() => removeRow(row.id)}
                  canRemove={rows.length > 1}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover mt-2 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Service
            </button>
          </div>

          {/* Cost summary */}
          {subtotal > 0 && (
            <div className="bg-bg-elevated rounded-lg p-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Subtotal</span>
                <span className="font-mono">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm gap-2">
                <span className="text-text-secondary">Shop Fee</span>
                <input
                  type="number"
                  value={shopFee}
                  onChange={(e) => setShopFee(e.target.value)}
                  placeholder="0.00"
                  className="w-24 px-2 py-1 bg-bg-input border border-border-default rounded text-right text-sm font-mono text-text-primary focus:outline-none focus:border-accent"
                />
              </div>
              <div className="flex items-center justify-between text-sm gap-2">
                <span className="text-text-secondary">Tax</span>
                <input
                  type="number"
                  value={tax}
                  onChange={(e) => setTax(e.target.value)}
                  placeholder="0.00"
                  className="w-24 px-2 py-1 bg-bg-input border border-border-default rounded text-right text-sm font-mono text-text-primary focus:outline-none focus:border-accent"
                />
              </div>
              <div className="flex justify-between text-sm font-medium border-t border-border-subtle pt-1.5">
                <span>Total</span>
                <span className="font-mono">${total.toFixed(2)}</span>
              </div>
            </div>
          )}

          <FormField label="Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional details..."
              rows={2}
              maxLength={1000}
              className={textareaClass}
            />
          </FormField>

          {/* Link observations */}
          {availableObs.length > 0 && (
            <div>
              <label className="text-sm text-text-secondary block mb-1">
                <FileText className="w-3.5 h-3.5 inline mr-1 align-text-bottom" />
                Link Observations
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedObsId}
                  onChange={(e) => setSelectedObsId(e.target.value)}
                  className={`${inputClass} flex-1`}
                >
                  <option value="">Select an observation...</option>
                  {availableObs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.observation.length > 50
                        ? o.observation.slice(0, 50) + '...'
                        : o.observation}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!selectedObsId}
                  onClick={() => {
                    if (selectedObsId) {
                      setLinkedObsIds((prev) => [...prev, selectedObsId])
                      setSelectedObsId('')
                    }
                  }}
                  className="px-3 py-2 bg-accent text-text-inverse rounded-lg text-sm disabled:opacity-50"
                >
                  Link
                </button>
              </div>
              {linkedObsIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {linkedObsIds.map((obsId) => {
                    const obs = observations?.find((o) => o.id === obsId)
                    return (
                      <span
                        key={obsId}
                        className="inline-flex items-center gap-1 bg-accent-subtle text-accent text-xs px-2 py-1 rounded-full"
                      >
                        {obs
                          ? obs.observation.length > 30
                            ? obs.observation.slice(0, 30) + '...'
                            : obs.observation
                          : 'Note'}
                        <button
                          type="button"
                          onClick={() =>
                            setLinkedObsIds((prev) => prev.filter((id) => id !== obsId))
                          }
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-border-default rounded-lg text-text-secondary hover:bg-bg-elevated transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || mutation.isPending}
            className="flex-1 py-2.5 bg-accent text-text-inverse rounded-lg hover:bg-accent-hover transition-colors text-sm font-medium disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </Modal>

      {savedData && (
        <AutoUpdateIntervalsModal
          open={autoUpdateOpen}
          onClose={() => {
            setAutoUpdateOpen(false)
            setSavedData(null)
          }}
          vehicleId={vehicleId}
          serviceDate={savedData.date}
          odometer={savedData.odometer ?? currentMileage}
          servicesPerformed={savedData.services}
        />
      )}
    </>
  )
}

function ServiceRowInput({
  row,
  categories,
  onUpdate,
  onRemove,
  canRemove,
}: {
  row: ServiceRow
  categories: ServiceCategory[]
  onUpdate: (field: keyof ServiceRow, value: string) => void
  onRemove: () => void
  canRemove: boolean
}) {
  const selectedCategory = categories.find((c) => c.id === row.categoryId)
  const services = selectedCategory?.services ?? []

  return (
    <div className="flex gap-2 items-start">
      <div className="flex-1 space-y-2">
        <div className="flex gap-2">
          <select
            value={row.categoryId}
            onChange={(e) => onUpdate('categoryId', e.target.value)}
            className={`${inputClass} flex-1`}
          >
            <option value="">Category...</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <select
            value={row.serviceDefinitionId}
            onChange={(e) => onUpdate('serviceDefinitionId', e.target.value)}
            disabled={!row.categoryId}
            className={`${inputClass} flex-1 disabled:opacity-50`}
          >
            <option value="">Service...</option>
            {services.map((svc) => (
              <option key={svc.id} value={svc.id}>
                {svc.name}
              </option>
            ))}
            <option value="__custom__">Custom...</option>
          </select>
        </div>
        {row.serviceDefinitionId === '__custom__' && (
          <input
            type="text"
            value={row.customName}
            onChange={(e) => onUpdate('customName', e.target.value)}
            placeholder="Custom service name"
            className={inputClass}
          />
        )}
        <div className="flex items-center gap-1">
          <DollarSign className="w-3.5 h-3.5 text-text-muted" />
          <input
            type="number"
            value={row.cost}
            onChange={(e) => onUpdate('cost', e.target.value)}
            placeholder="Cost (optional)"
            step="0.01"
            className="flex-1 px-2 py-1.5 bg-bg-input border border-border-default rounded text-sm font-mono text-text-primary focus:outline-none focus:border-accent"
          />
        </div>
      </div>
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 text-text-muted hover:text-status-overdue transition-colors mt-2"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
