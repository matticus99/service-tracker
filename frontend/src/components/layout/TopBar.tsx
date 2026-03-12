import { Settings, Sun, Moon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { VehicleSelector } from './VehicleSelector'
import { useTheme } from '@/context/ThemeContext'

export function TopBar() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="flex items-center justify-between h-14 px-4 bg-bg-surface border-b border-border-subtle shrink-0">
      <VehicleSelector />
      <div className="flex items-center gap-1 lg:hidden">
        <button
          onClick={toggleTheme}
          className="p-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-card transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <button
          onClick={() => navigate('/settings')}
          className="p-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-card transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  )
}
