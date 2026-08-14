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

// The floating left icon rail both reference designs use — persistent,
// vertically centered, small frosted circles. Real links, not decoration.
export function IconRail() {
  return (
    <div style={{
      position: 'fixed', left: 20, top: '50%', transform: 'translateY(-50%)',
      display: 'flex', flexDirection: 'column', gap: 10, zIndex: 20,
    }}>
      {ITEMS.map(({ icon: Icon, href, active }, i) => (
        <Link key={i} href={href} style={{
          width: 42, height: 42, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.1)',
          border: active ? 'none' : '1px solid rgba(255,255,255,0.14)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          boxShadow: active ? '0 4px 16px rgba(0,0,0,0.25)' : 'none',
          transition: 'background 0.2s',
        }}>
          <Icon size={17} color={active ? '#0b0b0d' : 'rgba(255,255,255,0.7)'} />
        </Link>
      ))}
    </div>
  )
}
