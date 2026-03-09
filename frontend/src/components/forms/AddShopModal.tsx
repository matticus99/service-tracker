import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { FormField, inputClass, textareaClass } from './FormField'
import { useCreateShop, useUpdateShop } from '@/hooks/useApi'
import { useToast } from '@/context/ToastContext'
import type { Shop } from '@/types/api'

interface Props {
  open: boolean
  onClose: () => void
  vehicleId: string
  editShop?: Shop | null
}

export function AddShopModal({ open, onClose, vehicleId, editShop }: Props) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [hours, setHours] = useState('')
  const createMutation = useCreateShop()
  const updateMutation = useUpdateShop()
  const { toast } = useToast()

  const isEdit = !!editShop

  useEffect(() => {
    if (open && editShop) {
      setName(editShop.name)
      setAddress(editShop.address ?? '')
      setPhone(editShop.phone ?? '')
      setWebsite(editShop.website ?? '')
      setHours(editShop.hours ?? '')
    } else if (open) {
      setName('')
      setAddress('')
      setPhone('')
      setWebsite('')
      setHours('')
    }
  }, [open, editShop])

  const isValid = name.trim().length > 0

  function handleSubmit() {
    if (!isValid) return

    const data = {
      name: name.trim(),
      address: address.trim() || null,
      phone: phone.trim() || null,
      website: website.trim() || null,
      hours: hours.trim() || null,
    }

    if (isEdit && editShop) {
      updateMutation.mutate(
        { vehicleId, shopId: editShop.id, data },
        {
          onSuccess: () => {
            toast('Shop updated')
            onClose()
          },
          onError: () => toast('Failed to update shop', 'error'),
        },
      )
    } else {
      createMutation.mutate(
        { vehicleId, data },
        {
          onSuccess: () => {
            toast('Shop added')
            onClose()
          },
          onError: () => toast('Failed to save shop', 'error'),
        },
      )
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Shop' : 'Add Shop'}>
      <div className="space-y-4">
        <FormField label="Shop Name" required>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Joe's Auto Service"
            className={inputClass}
            autoFocus
          />
        </FormField>
        <FormField label="Address">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Main St, City, ST"
            className={inputClass}
          />
        </FormField>
        <FormField label="Phone">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 123-4567"
            className={inputClass}
          />
        </FormField>
        <FormField label="Website">
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://example.com"
            className={inputClass}
          />
        </FormField>
        <FormField label="Hours">
          <textarea
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="Mon-Fri 8am-6pm&#10;Sat 9am-3pm"
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
          {isPending ? 'Saving...' : isEdit ? 'Update' : 'Save'}
        </button>
      </div>
    </Modal>
  )
}
