'use client'
import { ScheduleShell } from '@/components/layout/ScheduleShell'

export default function ScheduleLayout({ children }: { children: React.ReactNode }) {
  return <ScheduleShell>{children}</ScheduleShell>
}
