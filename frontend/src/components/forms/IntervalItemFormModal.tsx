import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { FormField, inputClass, textareaClass } from './FormField'
import {
  useCreateIntervalItem,
  useUpdateIntervalItem,
} from '@/hooks/useApi'
import { useToast } from '@/context/ToastContext'
import type { IntervalItem } from '@/types/api'

interface Props {
  open: boolean
  onClose: () => void
  vehicleId: string
  initialData?: IntervalItem
}

export function IntervalItemFormModal({
  open,
  onClose,
  vehicleId,
  initialData,
}: Props) {
  const isEdit = !!initialData
  const createMutation = useCreateIntervalItem()
  const updateMutation = useUpdateIntervalItem()
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [type, setType] = useState<'regular' | 'ad_hoc'>('regular')
  const [intervalMiles, setIntervalMiles] = useState('')
  const [thresholdMiles, setThresholdMiles] = useState('500')
  const [estimatedCost, setEstimatedCost] = useState('')
  const [lastDate, setLastDate] = useState('')
  const [lastMiles, setLastMiles] = useState('')
  const [notes, setNotes] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [targetMiles, setTargetMiles] = useState('')

  useEffect(() => {
    if (!open) return
    if (initialData) {
      setName(initialData.name)
      setType(initialData.type)
      setIntervalMiles(
        initialData.recommended_interval_miles?.toString() ?? '',
      )
      setThresholdMiles(initialData.due_soon_threshold_miles.toString())
      setEstimatedCost(initialData.estimated_cost?.toString() ?? '')
      setLastDate(initialData.last_service_date ?? '')
      setLastMiles(initialData.last_service_miles?.toString() ?? '')
      setNotes(initialData.notes ?? '')
      setTargetDate(initialData.target_date ?? '')
      setTargetMiles(initialData.target_miles?.toString() ?? '')
    } else {
      setName('')
      setType('regular')
      setIntervalMiles('')
      setThresholdMiles('500')
      setEstimatedCost('')
      setLastDate('')
      setLastMiles('')
      setNotes('')
      setTargetDate('')
      setTargetMiles('')
    }
  }, [open, initialData])

  const isValid = name.trim().length > 0

  function parseOptionalInt(s: string): number | undefined {
    const n = parseInt(s, 10)
    return !isNaN(n) && n >= 0 ? n : undefined
  }

  function parseOptionalFloat(s: string): number | undefined {
    const n = parseFloat(s)
    return !isNaN(n) && n >= 0 ? n : undefined
  }

  function handleSubmit() {
    if (!isValid) return
    const data = {
      name: name.trim(),
      type,
      recommended_interval_miles:
        type === 'regular' ? parseOptionalInt(intervalMiles) ?? null : null,
      due_soon_threshold_miles: parseOptionalInt(thresholdMiles) ?? 500,
      estimated_cost: parseOptionalFloat(estimatedCost) ?? null,
      last_service_date: lastDate || null,
      last_service_miles: parseOptionalInt(lastMiles) ?? null,
      notes: notes.trim() || null,
      target_date: type === 'ad_hoc' ? targetDate || null : null,
      target_miles:
        type === 'ad_hoc' ? parseOptionalInt(targetMiles) ?? null : null,
    }

    const callbacks = {
      onSuccess: () => {
        toast(isEdit ? 'Item updated' : 'Item created')
        onClose()
      },
      onError: () =>
        toast(`Failed to ${isEdit ? 'update' : 'create'} item`, 'error'),
    }

    if (isEdit) {
      updateMutation.mutate(
        { vehicleId, itemId: initialData!.id, data },
        callbacks,
      )
    } else {
      createMutation.mutate({ vehicleId, data }, callbacks)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit: ${initialData!.name}` : 'Add Interval Item'}
    >
      <div className="space-y-4">
        <FormField label="Name" required>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Tire Rotation"
            className={inputClass}
          />
        </FormField>
        <FormField label="Type">
          <div className="flex gap-1 bg-bg-input rounded-lg p-1">
            {(['regular', 'ad_hoc'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  type === t
                    ? 'bg-accent-subtle text-accent'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {t === 'regular' ? 'Regular' : 'Ad-Hoc'}
              </button>
            ))}
          </div>
        </FormField>
        {type === 'regular' && (
          <FormField label="Interval (miles)">
            <input
              type="number"
              value={intervalMiles}
              onChange={(e) => setIntervalMiles(e.target.value)}
              placeholder="e.g. 7500"
              className={`${inputClass} font-mono`}
            />
          </FormField>
        )}
        {type === 'ad_hoc' && (
          <>
            <FormField label="Target Date">
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className={inputClass}
              />
            </FormField>
            <FormField label="Target Mileage">
              <input
                type="number"
                value={targetMiles}
                onChange={(e) => setTargetMiles(e.target.value)}
                placeholder="Optional"
                className={`${inputClass} font-mono`}
              />
            </FormField>
          </>
        )}
        <FormField label="Alert Threshold (miles before due)">
          <input
            type="number"
            value={thresholdMiles}
            onChange={(e) => setThresholdMiles(e.target.value)}
            className={`${inputClass} font-mono`}
          />
        </FormField>
        <FormField label="Estimated Cost ($)">
          <input
            type="number"
            value={estimatedCost}
            onChange={(e) => setEstimatedCost(e.target.value)}
            step="0.01"
            placeholder="Optional"
            className={`${inputClass} font-mono`}
          />
        </FormField>
        <FormField label="Last Service Date">
          <input
            type="date"
            value={lastDate}
            onChange={(e) => setLastDate(e.target.value)}
            className={inputClass}
          />
        </FormField>
        <FormField label="Last Service Mileage">
          <input
            type="number"
            value={lastMiles}
            onChange={(e) => setLastMiles(e.target.value)}
            placeholder="Optional"
            className={`${inputClass} font-mono`}
          />
        </FormField>
        <FormField label="Notes">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes..."
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
          disabled={!isValid || isPending}
          className="flex-1 py-2.5 bg-accent text-text-inverse rounded-lg hover:bg-accent-hover transition-colors text-sm font-medium disabled:opacity-50"
        >
          {isPending ? 'Saving...' : isEdit ? 'Update' : 'Create'}
        </button>
      </div>
    </Modal>
  )
}
