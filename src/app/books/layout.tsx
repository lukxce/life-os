'use client'
import { WatchlistShell } from '@/components/layout/WatchlistShell'

export default function BooksLayout({ children }: { children: React.ReactNode }) {
  return <WatchlistShell>{children}</WatchlistShell>
}
