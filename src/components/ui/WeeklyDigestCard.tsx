'use client'
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Card, Label } from '@/components/ledger/primitives'
import { Mascot } from '@/components/ui/Mascot'

function localDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// The server decides whether a digest exists and what it says — this key
// only remembers "I already closed this week's card" client-side, so
// dismissing doesn't make it vanish for good on other devices/sessions.
function weekDismissKey(d: Date) {
  const monday = new Date(d)
  const dow = d.getDay() || 7
  monday.setDate(d.getDate() - (dow - 1))
  return `weekly-digest-dismissed:${localDateStr(monday)}`
}

// Sunday-night recap card — only renders when the server says a digest
// exists for this week (it self-gates to the Sun-20:00 -> end-of-Monday
// window), so this component is invisible the rest of the week.
export function WeeklyDigestCard() {
  const [digest, setDigest] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const n = new Date()
    const p = new URLSearchParams({ h: String(n.getHours()), dow: String(n.getDay()), date: localDateStr(n) })
    fetch(`/api/life/weekly-digest?${p}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : { digest: null })
      .then(d => setDigest(d.digest ?? null))
      .catch(() => setDigest(null))
    try { setDismissed(localStorage.getItem(weekDismissKey(n)) === '1') } catch {}
  }, [])

  if (!digest || dismissed) return null

  function dismiss() {
    try { localStorage.setItem(weekDismissKey(new Date()), '1') } catch {}
    setDismissed(true)
  }

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <Mascot mood="pleased" size={36} className="shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <Label>Weekly digest</Label>
            <button onClick={dismiss} aria-label="Dismiss" className="text-ldg-ink/40 hover:text-ldg-ink/70 shrink-0">
              <X size={15} />
            </button>
          </div>
          <p className="text-[14px] text-ldg-ink leading-snug mt-1.5">{digest}</p>
        </div>
      </div>
    </Card>
  )
}
