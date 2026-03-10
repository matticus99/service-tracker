import { useState, useMemo } from 'react'
import {
  Search,
  Plus,
  Store,
  MapPin,
  Phone,
  Globe,
  Clock,
  Pencil,
  Trash2,
} from 'lucide-react'
import { useShops, useServiceHistory, useDeleteShop } from '@/hooks/useApi'
import { useVehicle } from '@/context/VehicleContext'
import { useToast } from '@/context/ToastContext'
import { Modal } from '@/components/ui/Modal'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { AddShopModal } from '@/components/forms/AddShopModal'
import type { Shop, ServiceRecord } from '@/types/api'

export function ShopsPage() {
  const { vehicleId } = useVehicle()
  const { data: shops, isLoading, error, refetch } = useShops(vehicleId)
  const { data: history } = useServiceHistory(vehicleId)
  const deleteMutation = useDeleteShop()
  const { toast } = useToast()
  const [addOpen, setAddOpen] = useState(false)
  const [editShop, setEditShop] = useState<Shop | null>(null)
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<Shop | null>(null)

  const recordCounts = useMemo(() => {
    const counts = new Map<string, number>()
    if (!history) return counts
    for (const entry of history) {
      if (entry.type === 'service') {
        const sr = entry.data as ServiceRecord
        if (sr.shop_id) {
          counts.set(sr.shop_id, (counts.get(sr.shop_id) ?? 0) + 1)
        }
      }
    }
    return counts
  }, [history])

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
      {/* Toolbar */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search shops..."
            className="w-full pl-9 pr-3 py-[9px] bg-bg-card border border-border-default rounded-[10px] text-sm text-text-primary focus:outline-none focus:border-accent transition-colors"
          />
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-[9px] bg-accent text-white rounded-[10px] font-semibold text-sm hover:bg-accent-hover transition-colors whitespace-nowrap"
        >
          <Plus className="w-[18px] h-[18px]" /> Add Shop
        </button>
      </div>

      {/* Grid */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((shop, i) => (
            <ShopCard
              key={shop.id}
              shop={shop}
              recordCount={recordCounts.get(shop.id) ?? 0}
              delay={i * 0.04}
              onClick={() => setSelectedShop(shop)}
            />
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
              <div className="text-sm flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-text-muted shrink-0 mt-0.5" />
                {selectedShop.address}
              </div>
            )}
            {selectedShop.phone && (
              <a href={`tel:${selectedShop.phone}`} className="text-sm text-accent flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 shrink-0" />
                {selectedShop.phone}
              </a>
            )}
            {selectedShop.website && (
              <a href={selectedShop.website} target="_blank" rel="noopener noreferrer" className="text-sm text-accent flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 shrink-0" />
                {selectedShop.website}
              </a>
            )}
            {selectedShop.hours && (
              <div className="text-sm flex items-start gap-2 whitespace-pre-line">
                <Clock className="w-3.5 h-3.5 text-text-muted shrink-0 mt-0.5" />
                {selectedShop.hours}
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

function ShopCard({
  shop,
  recordCount,
  delay,
  onClick,
}: {
  shop: Shop
  recordCount: number
  delay: number
  onClick: () => void
}) {
  return (
    <div
      className="bg-bg-card border border-border-default rounded-[14px] p-4 transition-all duration-200 hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(0,0,0,0.25)] hover:border-[color-mix(in_srgb,var(--color-accent)_30%,var(--color-border-default))] animate-card-in cursor-pointer"
      style={{ animationDelay: `${delay}s` }}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2.5">
        <span className="font-bold text-[0.95rem]">{shop.name}</span>
        <span className="text-[0.7rem] text-text-muted font-medium bg-bg-elevated px-2 py-0.5 rounded-full border border-border-default">
          {recordCount} records
        </span>
      </div>
      {shop.address && (
        <div className="flex items-start gap-2 text-[0.8rem] text-text-secondary mb-1.5">
          <MapPin className="w-3.5 h-3.5 text-text-muted shrink-0 mt-0.5" />
          {shop.address}
        </div>
      )}
      {shop.phone && (
        <div className="flex items-center gap-2 text-[0.8rem] text-text-secondary mb-1.5">
          <Phone className="w-3.5 h-3.5 text-text-muted shrink-0" />
          {shop.phone}
        </div>
      )}
      {shop.website && (
        <div className="flex items-center gap-2 text-[0.8rem] mb-1.5">
          <Globe className="w-3.5 h-3.5 text-text-muted shrink-0" />
          <span className="text-accent">{shop.website}</span>
        </div>
      )}
      {shop.hours && (
        <div className="flex items-start gap-2 text-[0.8rem] text-text-secondary">
          <Clock className="w-3.5 h-3.5 text-text-muted shrink-0 mt-0.5" />
          {shop.hours}
        </div>
      )}
    </div>
  )
}
