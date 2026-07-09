'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Mascot, MascotMood } from './Mascot'

interface Nudge { id: string; mood: 'curious' | 'content'; message: string; href: string; module: string }

function moduleForPath(path: string): string {
  if (path === '/') return 'home'
  const seg = path.split('/')[1]
  return seg === 'books' ? 'watchlist' : seg
}

/** Persistent companion — present on every screen, prioritizes whatever's
 *  relevant to the module you're actually looking at, not just one thing. */
export function FloatingMascot() {
  const [nudges, setNudges] = useState<Nudge[] | null>(null)
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    // Client-local time — the nudges route used to read the server's own
    // clock, which on Vercel is UTC and never matched the user's real hour
    const n = new Date()
    const p = new URLSearchParams({
      h: String(n.getHours()),
      date: `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`,
    })
    fetch(`/api/life/nudges?${p}`, { cache: 'no-store' }).then(r => r.json()).then(d => setNudges(d.nudges ?? [])).catch(() => setNudges([]))
  }, [])

  if (nudges === null) return null

  const currentModule = moduleForPath(pathname)
  // Home is the overview — showing whatever's most pressing anywhere makes
  // sense there. Any other specific module page only shows ITS OWN nudge;
  // otherwise the habits nudge (almost always true by evening) bled onto
  // every single screen regardless of what you were actually looking at.
  const top = currentModule === 'home' ? nudges[0] : nudges.find(n => n.module === currentModule)
  const mood: MascotMood = top ? 'curious' : 'pleased'

  return (
    <div className="fixed z-40 bottom-24 right-4 md:bottom-6 md:right-6">
      {open && (
        <div className="absolute bottom-full right-0 mb-3 w-64 bg-surface/95 backdrop-blur-xl rounded-2xl border border-black/5 dark:border-white/5 shadow-lg p-4 page-in">
          {top ? (
            <>
              <p className="text-sm font-semibold text-ink leading-snug">{top.message}</p>
              <Link href={top.href} onClick={() => setOpen(false)}
                className="text-xs font-bold text-[rgb(var(--coral))] hover:underline mt-1.5 inline-block">
                Take care of it →
              </Link>
              {nudges.length > 1 && (
                <p className="text-[10px] text-ink/30 mt-2">+{nudges.length - 1} more waiting elsewhere</p>
              )}
            </>
          ) : (
            <p className="text-sm font-semibold text-ink leading-snug">All caught up — nothing needs you right now.</p>
          )}
        </div>
      )}
      <button onClick={() => setOpen(o => !o)} aria-label="Companion"
        className="relative flex items-center justify-center w-14 h-14 rounded-full active:scale-95 transition-transform">
        <Mascot mood={mood} size={40} idle={!open} />
        {top && !open && (
          <span className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-[rgb(var(--coral))] border-2 border-canvas" />
        )}
      </button>
    </div>
  )
}
