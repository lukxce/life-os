'use client'
import { PersonalSidebar } from '@/components/layout/PersonalSidebar'

export default function PersonalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <PersonalSidebar />
      <main className="flex-1 min-w-0 p-6 md:p-8">
        {children}
      </main>
    </div>
  )
}
