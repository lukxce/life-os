'use client'
import { JournalShell } from '@/components/layout/JournalShell'

export default function JournalLayout({ children }: { children: React.ReactNode }) {
  return <JournalShell>{children}</JournalShell>
}
