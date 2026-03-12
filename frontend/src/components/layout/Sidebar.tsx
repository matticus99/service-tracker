import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Clock,
  Gauge,
  Store,
  Settings,
  Wrench,
  Sun,
  Moon,
} from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/history', icon: Clock, label: 'History' },
  { to: '/tracker', icon: Gauge, label: 'Tracker' },
  { to: '/shops', icon: Store, label: 'Shops' },
]

export function Sidebar() {
  const { theme, toggleTheme } = useTheme()

  return (
    <aside className="hidden lg:flex flex-col w-[220px] bg-bg-surface border-r border-border-subtle shrink-0">
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-7 border-b border-border-subtle">
        <Wrench className="w-7 h-7 text-accent shrink-0" />
        <span className="font-bold text-[1.05rem] tracking-tight bg-gradient-to-br from-accent to-purple-400 bg-clip-text text-transparent">
          ServiceTracker
        </span>
      </div>

      <nav className="flex flex-col gap-0.5 px-2.5 py-3 flex-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] font-medium text-[0.9rem] transition-all duration-200 ${
                isActive
                  ? 'bg-accent-subtle text-accent'
                  : 'text-text-secondary hover:bg-bg-card hover:text-text-primary'
              }`
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            {label}
          </NavLink>
        ))}

        <div className="mt-auto border-t border-border-subtle pt-3 flex flex-col gap-0.5">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] font-medium text-[0.9rem] text-text-secondary hover:bg-bg-card hover:text-text-primary transition-all duration-200 w-full"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
          <NavLink
            to="/settings"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] font-medium text-[0.9rem] text-text-secondary hover:bg-bg-card hover:text-text-primary transition-all duration-200"
          >
            <Settings className="w-5 h-5 shrink-0" />
            Settings
          </NavLink>
        </div>
      </nav>
    </aside>
  )
}
