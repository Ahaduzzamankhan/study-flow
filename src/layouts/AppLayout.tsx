import { Outlet } from 'react-router-dom'
import { AnimatedBackground } from '@/components/AnimatedBackground'
import { Sidebar } from '@/components/Sidebar'
import { TopBar } from '@/components/TopBar'
import { Toaster } from '@/components/Toaster'

export function AppLayout() {
  return (
    <div className="relative flex h-full overflow-hidden">
      <AnimatedBackground />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto w-full max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
      <Toaster />
    </div>
  )
}
