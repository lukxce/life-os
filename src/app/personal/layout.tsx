'use client'
import { PersonalShell } from '@/components/layout/PersonalShell'

export default function PersonalLayout({ children }: { children: React.ReactNode }) {
  return <PersonalShell>{children}</PersonalShell>
}
