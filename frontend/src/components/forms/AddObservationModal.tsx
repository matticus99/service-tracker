import { useState, useEffect } from 'react'
import { Calendar, Gauge } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { FormField, inputClass, textareaClass } from './FormField'
import { useCreateObservation } from '@/hooks/useApi'
import { useToast } from '@/context/ToastContext'

interface Props {
  open: boolean
  onClose: () => void
  vehicleId: string
  currentMileage: number
}

export function AddObservationModal({
  open,
  onClose,
  vehicleId,
  currentMileage,
}: Props) {
  const [date, setDate] = useState('')
  const [odometer, setOdometer] = useState('')
  const [observation, setObservation] = useState('')
  const mutation = useCreateObservation()
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      setDate(new Date().toISOString().split('T')[0]!)
      setOdometer(String(currentMileage))
      setObservation('')
    }
  }, [open, currentMileage])

  const isValid = date.length > 0 && observation.trim().length > 0

  function handleSubmit() {
    if (!isValid) return
    const odo = parseInt(odometer, 10)
    mutation.mutate(
      {
        vehicleId,
        data: {
          observation_date: date,
          odometer: !isNaN(odo) && odo > 0 ? odo : undefined,
          observation: observation.trim(),
        },
      },
      {
        onSuccess: () => {
          toast('Observation added')
          onClose()
        },
        onError: () => toast('Failed to add observation', 'error'),
      },
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Observation">
      <div className="space-y-4">
        <FormField label="Date" icon={<Calendar className="w-3.5 h-3.5" />}>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </FormField>
        <FormField label="Odometer" icon={<Gauge className="w-3.5 h-3.5" />}>
          <input
            type="number"
            value={odometer}
            onChange={(e) => setOdometer(e.target.value)}
            placeholder="Optional"
            className={`${inputClass} font-mono`}
          />
        </FormField>
        <FormField label="Observation" required>
          <textarea
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
            placeholder="What did you notice?"
            rows={3}
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
