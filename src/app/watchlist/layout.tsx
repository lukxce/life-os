import { WatchlistShell } from '@/components/layout/WatchlistShell'

export const metadata = { title: 'Watchlist — Life OS' }

export default function WatchlistLayout({ children }: { children: React.ReactNode }) {
  return <WatchlistShell>{children}</WatchlistShell>
}
