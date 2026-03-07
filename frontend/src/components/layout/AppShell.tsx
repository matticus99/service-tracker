import { Outlet } from 'react-router-dom'
import { VehicleProvider } from '@/context/VehicleContext'
import { ToastProvider } from '@/context/ToastContext'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { TabBar } from './TabBar'

export function AppShell() {
  return (
    <VehicleProvider>
      <ToastProvider>
        <div className="flex h-dvh overflow-hidden bg-bg-body text-text-primary font-sans">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            <TopBar />
            <main className="flex-1 overflow-y-auto overflow-x-hidden pb-[76px] lg:pb-0">
              <Outlet />
            </main>
          </div>
          <TabBar />
        </div>
      </ToastProvider>
    </VehicleProvider>
  )
}
