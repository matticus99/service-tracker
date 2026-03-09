import { useState, useRef, useEffect } from 'react'
import { Store } from 'lucide-react'
import { useShops } from '@/hooks/useApi'
import { inputClass } from './FormField'

interface Props {
  value: string | null
  onChange: (shopId: string | null, shopName: string) => void
  vehicleId: string | undefined
}

export function ShopAutocomplete({ value, onChange, vehicleId }: Props) {
  const { data: shops } = useShops(vehicleId)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const selectedShop = shops?.find((s) => s.id === value)

  const filtered = (shops ?? []).filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase()),
  )
  const showDropdown = open && filtered.length > 0

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node))
        setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={selectedShop ? selectedShop.name : query}
          onChange={(e) => {
            setQuery(e.target.value)
            if (selectedShop) onChange(null, '')
            setOpen(true)
          }}
          onFocus={() => {
            if (selectedShop) {
              setQuery(selectedShop.name)
              onChange(null, '')
            }
            setOpen(true)
          }}
          placeholder="Select a shop..."
          className={inputClass}
        />
        {selectedShop && (
          <Store className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-accent" />
        )}
      </div>
      {showDropdown && (
        <ul className="absolute z-10 left-0 right-0 mt-1 max-h-40 overflow-auto bg-bg-elevated border border-border-default rounded-lg shadow-xl">
          {filtered.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(s.id, s.name)
                  setQuery('')
                  setOpen(false)
                }}
                className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-bg-card transition-colors"
              >
                <span className="font-medium">{s.name}</span>
                {s.address && (
                  <span className="text-text-muted ml-2 text-xs">
                    {s.address}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
