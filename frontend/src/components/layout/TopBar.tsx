import { Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { VehicleSelector } from './VehicleSelector'

export function TopBar() {
  const navigate = useNavigate()

  return (
    <header className="flex items-center justify-between h-14 px-4 bg-bg-surface border-b border-border-subtle shrink-0">
      <VehicleSelector />
      <button
        onClick={() => navigate('/settings')}
        className="p-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-card transition-colors lg:hidden"
      >
        <Settings className="w-5 h-5" />
      </button>
    </header>
  )
}
