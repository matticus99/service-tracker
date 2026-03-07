import { useState, useEffect } from 'react'
import { Calendar, Gauge } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { FormField, inputClass, textareaClass } from './FormField'
import { FacilityAutocomplete } from './FacilityAutocomplete'
import { TagInput } from './TagInput'
import { AutoUpdateIntervalsModal } from './AutoUpdateIntervalsModal'
import { useCreateServiceRecord } from '@/hooks/useApi'
import { useToast } from '@/context/ToastContext'

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
  const [facility, setFacility] = useState('')
  const [odometer, setOdometer] = useState('')
  const [services, setServices] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [autoUpdateOpen, setAutoUpdateOpen] = useState(false)
  const [savedData, setSavedData] = useState<{
    date: string
    odometer: number | null
    services: string[]
  } | null>(null)
  const mutation = useCreateServiceRecord()
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      setDate(new Date().toISOString().split('T')[0]!)
      setFacility('')
      setOdometer(String(currentMileage))
      setServices([])
      setNotes('')
    }
  }, [open, currentMileage])

  const isValid = date.length > 0

  function handleSubmit() {
    if (!isValid) return
    const odo = parseInt(odometer, 10)
    const odometerVal = !isNaN(odo) && odo > 0 ? odo : null
    mutation.mutate(
      {
        vehicleId,
        data: {
          service_date: date,
          facility: facility.trim() || undefined,
          odometer: odometerVal,
          services_performed: services.length > 0 ? services : undefined,
          notes: notes.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          toast('Service record added')
          if (services.length > 0) {
            setSavedData({
              date,
              odometer: odometerVal,
              services,
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
        <div className="space-y-4">
          <FormField
            label="Service Date"
            icon={<Calendar className="w-3.5 h-3.5" />}
          >
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </FormField>
          <FormField label="Facility">
            <FacilityAutocomplete
              value={facility}
              onChange={setFacility}
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
          <FormField label="Services Performed">
            <TagInput
              tags={services}
              onChange={setServices}
              placeholder="e.g. Brake pads, Tire rotation"
            />
          </FormField>
          <FormField label="Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional details..."
              rows={2}
              maxLength={1000}
              className={textareaClass}
            />
            {notes.length > 0 && (
              <span className="text-xs text-text-muted mt-1 block text-right">
                {notes.length}/1000
              </span>
            )}
          </FormField>
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
