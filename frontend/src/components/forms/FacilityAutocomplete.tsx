import { useState, useRef, useEffect } from 'react'
import { useFacilities } from '@/hooks/useApi'
import { inputClass } from './FormField'

interface Props {
  value: string
  onChange: (value: string) => void
  vehicleId: string | undefined
}

export function FacilityAutocomplete({ value, onChange, vehicleId }: Props) {
  const { data: facilities } = useFacilities(vehicleId)
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const filtered = (facilities ?? []).filter((f) =>
    f.toLowerCase().includes(value.toLowerCase()),
  )
  const showDropdown = open && value.length > 0 && filtered.length > 0

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
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder="e.g. Valvoline, Dealer"
        className={inputClass}
      />
      {showDropdown && (
        <ul className="absolute z-10 left-0 right-0 mt-1 max-h-40 overflow-auto bg-bg-elevated border border-border-default rounded-lg shadow-xl">
          {filtered.map((f) => (
            <li key={f}>
              <button
                type="button"
                onClick={() => {
                  onChange(f)
                  setOpen(false)
                }}
                className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-bg-card transition-colors"
              >
                {f}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
