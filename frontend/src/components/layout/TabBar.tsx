import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Clock, Gauge, FileText } from 'lucide-react'
import { useDashboard } from '@/hooks/useApi'
import { useVehicle } from '@/context/VehicleContext'

const TABS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/history', icon: Clock, label: 'History' },
  { to: '/tracker', icon: Gauge, label: 'Tracker' },
  { to: '/notes', icon: FileText, label: 'Notes' },
]

export function TabBar() {
  const { vehicleId } = useVehicle()
  const { data } = useDashboard(vehicleId)
  const overdueCount = data?.overdue_items.length ?? 0

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-[60px] bg-bg-surface border-t border-border-subtle flex z-40">
      {TABS.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-1 text-[11px] font-medium relative transition-colors ${
              isActive ? 'text-accent' : 'text-text-muted'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2.5px] bg-accent rounded-b-full" />
              )}
              <div className="relative">
                <Icon className="w-5 h-5" />
                {to === '/dashboard' && overdueCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 flex items-center justify-center bg-status-overdue text-white text-[10px] font-bold rounded-full px-1">
                    {overdueCount}
                  </span>
                )}
              </div>
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
