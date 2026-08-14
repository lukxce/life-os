'use client'
import Link from 'next/link'
import { Home, User, MessageCircle, ClipboardList, Settings } from 'lucide-react'

const ITEMS = [
  { icon: Home, href: '/beta', active: true },
  { icon: User, href: '/finance/accounts', active: false },
  { icon: MessageCircle, href: '/finance/insights', active: false },
  { icon: ClipboardList, href: '/finance/bills', active: false },
  { icon: Settings, href: '/finance', active: false },
]

// The floating left icon rail every reference design uses — persistent,
// vertically centered, small frosted circles. Real links, not decoration.
// `tone` picks the palette: 'dark' for the dark/photo betas (light icons on
// a dark/photographic backdrop), 'light' for sage (dark icons on a pale
// glass backdrop — the same rail, inverted).
export function IconRail({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const isLight = tone === 'light'
  return (
    <div style={{
      position: 'fixed', left: 20, top: '50%', transform: 'translateY(-50%)',
      display: 'flex', flexDirection: 'column', gap: 10, zIndex: 20,
    }}>
      {ITEMS.map(({ icon: Icon, href, active }, i) => (
        <Link key={i} href={href} style={{
          width: 42, height: 42, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: active
            ? (isLight ? '#4b7a53' : 'rgba(255,255,255,0.95)')
            : (isLight ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)'),
          border: active ? 'none' : `1px solid ${isLight ? 'rgba(75,122,83,0.25)' : 'rgba(255,255,255,0.14)'}`,
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          boxShadow: active ? '0 4px 16px rgba(0,0,0,0.2)' : 'none',
          transition: 'background 0.2s',
        }}>
          <Icon size={17} color={active ? '#fff' : (isLight ? 'rgba(30,50,30,0.6)' : 'rgba(255,255,255,0.7)')} />
        </Link>
      ))}
    </div>
  )
}
