import { useState, useMemo } from 'react'
import {
  Search,
  Plus,
  X,
  Store,
  MapPin,
  Phone,
  Globe,
  Clock,
  Pencil,
  Trash2,
} from 'lucide-react'
import { useShops, useDeleteShop } from '@/hooks/useApi'
import { useVehicle } from '@/context/VehicleContext'
import { useToast } from '@/context/ToastContext'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { AddShopModal } from '@/components/forms/AddShopModal'
import type { Shop } from '@/types/api'

export function ShopsPage() {
  const { vehicleId } = useVehicle()
  const { data: shops, isLoading, error, refetch } = useShops(vehicleId)
  const deleteMutation = useDeleteShop()
  const { toast } = useToast()
  const [addOpen, setAddOpen] = useState(false)
  const [editShop, setEditShop] = useState<Shop | null>(null)
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Shop | null>(null)

  const filtered = useMemo(() => {
    if (!shops) return []
    if (!searchQuery) return shops
    const q = searchQuery.toLowerCase()
    return shops.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.address?.toLowerCase().includes(q) ||
        s.phone?.toLowerCase().includes(q),
    )
  }, [shops, searchQuery])

  if (isLoading) return <PageSkeleton cards={3} />
  if (error) return <ErrorState onRetry={() => refetch()} />

  function handleDelete(shop: Shop) {
    deleteMutation.mutate(
      { vehicleId: vehicleId!, shopId: shop.id },
      {
        onSuccess: () => {
          toast('Shop deleted')
          setDeleteConfirm(null)
          setSelectedShop(null)
        },
        onError: () => toast('Failed to delete shop', 'error'),
      },
    )
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1">
          {searchOpen ? (
            <div className="flex items-center gap-1 bg-bg-card border border-border-default rounded-full px-3">
              <Search className="w-4 h-4 text-text-muted" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search shops..."
                className="bg-transparent text-sm py-2 focus:outline-none flex-1 text-text-primary"
                autoFocus
              />
              <button
                onClick={() => {
                  setSearchOpen(false)
                  setSearchQuery('')
                }}
              >
                <X className="w-4 h-4 text-text-muted" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 text-text-muted hover:text-text-primary hover:bg-bg-card rounded-lg transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
          )}
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="p-2 text-accent hover:bg-accent-subtle rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Store className="w-10 h-10" />}
          title={searchQuery ? 'No matching shops' : 'No shops yet'}
          description={
            searchQuery
              ? 'Try a different search term'
              : 'Add shops where you get your vehicle serviced'
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          {filtered.map((shop, i) => (
            <Card
              key={shop.id}
              delay={i * 0.04}
              onClick={() => setSelectedShop(shop)}
              className="flex items-start gap-3"
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-accent-subtle">
                <Store className="w-4 h-4 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{shop.name}</div>
                {shop.address && (
                  <div className="flex items-center gap-1.5 text-xs text-text-secondary mt-0.5 truncate">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {shop.address}
                  </div>
                )}
                {shop.phone && (
                  <div className="flex items-center gap-1.5 text-xs text-text-muted mt-0.5">
                    <Phone className="w-3 h-3 shrink-0" />
                    {shop.phone}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {vehicleId && (
        <>
          <AddShopModal
            open={addOpen}
            onClose={() => setAddOpen(false)}
            vehicleId={vehicleId}
          />
          <AddShopModal
            open={!!editShop}
            onClose={() => setEditShop(null)}
            vehicleId={vehicleId}
            editShop={editShop}
          />
        </>
      )}

      {selectedShop && (
        <Modal
          open={true}
          onClose={() => setSelectedShop(null)}
          title={selectedShop.name}
        >
          <div className="space-y-3">
            {selectedShop.address && (
              <div>
                <div className="text-xs text-text-muted uppercase tracking-wider">
                  Address
                </div>
                <div className="text-sm flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-text-muted shrink-0" />
                  {selectedShop.address}
                </div>
              </div>
            )}
            {selectedShop.phone && (
              <div>
                <div className="text-xs text-text-muted uppercase tracking-wider">
                  Phone
                </div>
                <a
                  href={`tel:${selectedShop.phone}`}
                  className="text-sm text-accent flex items-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  {selectedShop.phone}
                </a>
              </div>
            )}
            {selectedShop.website && (
              <div>
                <div className="text-xs text-text-muted uppercase tracking-wider">
                  Website
                </div>
                <a
                  href={selectedShop.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-accent flex items-center gap-1.5"
                >
                  <Globe className="w-3.5 h-3.5 shrink-0" />
                  {selectedShop.website}
                </a>
              </div>
            )}
            {selectedShop.hours && (
              <div>
                <div className="text-xs text-text-muted uppercase tracking-wider">
                  Hours
                </div>
                <div className="text-sm flex items-start gap-1.5 whitespace-pre-line">
                  <Clock className="w-3.5 h-3.5 text-text-muted shrink-0 mt-0.5" />
                  {selectedShop.hours}
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-6">
            <button
              onClick={() => {
                setSelectedShop(null)
                setEditShop(selectedShop)
              }}
              className="flex-1 py-2.5 border border-border-default rounded-lg text-text-secondary hover:bg-bg-elevated transition-colors text-sm flex items-center justify-center gap-2"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
            <button
              onClick={() => setDeleteConfirm(selectedShop)}
              className="py-2.5 px-4 border border-status-overdue/30 rounded-lg text-status-overdue hover:bg-status-overdue/10 transition-colors text-sm flex items-center justify-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </Modal>
      )}

      {deleteConfirm && (
        <Modal
          open={true}
          onClose={() => setDeleteConfirm(null)}
          title="Delete Shop"
        >
          <p className="text-sm text-text-secondary mb-6">
            Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?
            This cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="flex-1 py-2.5 border border-border-default rounded-lg text-text-secondary hover:bg-bg-elevated transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => handleDelete(deleteConfirm)}
              disabled={deleteMutation.isPending}
              className="flex-1 py-2.5 bg-status-overdue text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
