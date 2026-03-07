import { useState, useEffect } from 'react'
import { Calendar, Gauge } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { FormField, inputClass, textareaClass } from './FormField'
import { FacilityAutocomplete } from './FacilityAutocomplete'
import { useCreateOilChange } from '@/hooks/useApi'
import { useToast } from '@/context/ToastContext'

interface Props {
  open: boolean
  onClose: () => void
  vehicleId: string
  currentMileage: number
}

export function AddOilChangeModal({
  open,
  onClose,
  vehicleId,
  currentMileage,
}: Props) {
  const [date, setDate] = useState('')
  const [facility, setFacility] = useState('')
  const [odometer, setOdometer] = useState('')
  const [notes, setNotes] = useState('')
  const mutation = useCreateOilChange()
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      setDate(new Date().toISOString().split('T')[0]!)
      setFacility('')
      setOdometer(String(currentMileage))
      setNotes('')
    }
  }, [open, currentMileage])

  const odometerNum = parseInt(odometer, 10)
  const isValid = date.length > 0 && !isNaN(odometerNum) && odometerNum > 0

  function handleSubmit() {
    if (!isValid) return
    mutation.mutate(
      {
        vehicleId,
        data: {
          service_date: date,
          facility: facility.trim() || undefined,
          odometer: odometerNum,
          notes: notes.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          toast('Oil change recorded')
          onClose()
        },
        onError: () => toast('Failed to save oil change', 'error'),
      },
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Oil Change">
      <div className="space-y-4">
        <FormField label="Service Date" icon={<Calendar className="w-3.5 h-3.5" />}>
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
        <FormField label="Odometer" required icon={<Gauge className="w-3.5 h-3.5" />}>
          <input
            type="number"
            value={odometer}
            onChange={(e) => setOdometer(e.target.value)}
            className={`${inputClass} font-mono`}
          />
        </FormField>
        <FormField label="Notes">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Oil type, filter brand, etc."
            rows={2}
            className={textareaClass}
          />
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
  )
}
