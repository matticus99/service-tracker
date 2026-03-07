import { useState, useMemo, useEffect } from 'react'
import { CheckSquare, Square } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { useIntervalItems, useMarkServiced } from '@/hooks/useApi'
import { useToast } from '@/context/ToastContext'
import { fuzzyMatch } from '@/lib/fuzzyMatch'

interface Props {
  open: boolean
  onClose: () => void
  vehicleId: string
  serviceDate: string
  odometer: number
  servicesPerformed: string[]
}

export function AutoUpdateIntervalsModal({
  open,
  onClose,
  vehicleId,
  serviceDate,
  odometer,
  servicesPerformed,
}: Props) {
  const { data: items } = useIntervalItems(vehicleId)
  const markServiced = useMarkServiced()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)

  const matches = useMemo(() => {
    if (!items) return []
    return items.filter((item) =>
      servicesPerformed.some((svc) => fuzzyMatch(svc, item.name)),
    )
  }, [items, servicesPerformed])

  const [checked, setChecked] = useState<Set<string>>(new Set())

  // Initialize checked set when matches change
  useEffect(() => {
    setChecked(new Set(matches.map((m) => m.id)))
  }, [matches])

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleConfirm() {
    const selected = matches.filter((m) => checked.has(m.id))
    if (selected.length === 0) {
      onClose()
      return
    }
    setSaving(true)
    try {
      await Promise.all(
        selected.map((item) =>
          markServiced.mutateAsync({
            vehicleId,
            itemId: item.id,
            data: { service_date: serviceDate, odometer },
          }),
        ),
      )
      toast(
        `Updated ${selected.length} interval item${selected.length > 1 ? 's' : ''}`,
      )
    } catch {
      toast('Some items failed to update', 'error')
    }
    setSaving(false)
    onClose()
  }

  useEffect(() => {
    if (matches.length === 0 && open) {
      onClose()
    }
  }, [matches, open, onClose])

  if (matches.length === 0) {
    return null
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Update Interval Tracker?"
    >
      <p className="text-sm text-text-secondary mb-4">
        These interval items match the services you performed. Would you like to
        mark them as serviced?
      </p>
      <div className="space-y-2 mb-6">
        {matches.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => toggle(item.id)}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-bg-elevated transition-colors text-left"
          >
            {checked.has(item.id) ? (
              <CheckSquare className="w-5 h-5 text-accent shrink-0" />
            ) : (
              <Square className="w-5 h-5 text-text-muted shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <span className="text-sm text-text-primary">{item.name}</span>
              {item.estimated_cost != null && (
                <span className="text-xs text-text-muted ml-2">
                  ${item.estimated_cost.toFixed(2)}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 border border-border-default rounded-lg text-text-secondary hover:bg-bg-elevated transition-colors text-sm"
        >
          Skip
        </button>
        <button
          onClick={handleConfirm}
          disabled={saving || checked.size === 0}
          className="flex-1 py-2.5 bg-accent text-text-inverse rounded-lg hover:bg-accent-hover transition-colors text-sm font-medium disabled:opacity-50"
        >
          {saving ? 'Updating...' : `Update (${checked.size})`}
        </button>
      </div>
    </Modal>
  )
}
