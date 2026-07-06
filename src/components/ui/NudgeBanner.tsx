'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Mascot, MascotMood } from './Mascot'

interface Nudge { id: string; mood: 'curious' | 'content'; message: string; href: string }

/** Real, data-backed nudges — same signal everywhere the mascot appears. */
export function NudgeBanner({ className = '' }: { className?: string }) {
  const [nudges, setNudges] = useState<Nudge[] | null>(null)

  useEffect(() => {
    fetch('/api/life/nudges').then(r => r.json()).then(d => setNudges(d.nudges ?? [])).catch(() => setNudges([]))
  }, [])

  if (nudges === null) return null

  const top = nudges[0]
  const mood: MascotMood = top ? 'curious' : 'pleased'

  return (
    <div className={`bg-surface/90 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm px-5 py-4 flex items-center gap-4 ${className}`}>
      <Mascot mood={mood} size={48} className="mascot-pop shrink-0" />
      <div className="flex-1 min-w-0">
        {top ? (
          <>
            <p className="text-sm font-semibold text-ink leading-snug">{top.message}</p>
            <Link href={top.href} className="text-xs font-bold text-[rgb(var(--coral))] hover:underline mt-0.5 inline-block">
              Take care of it →
            </Link>
          </>
        ) : (
          <p className="text-sm font-semibold text-ink leading-snug">All caught up here.</p>
        )}
      </div>
    </div>
  )
}
