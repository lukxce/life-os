'use client'
import { useEffect, useState } from 'react'
import { HeartPulse } from 'lucide-react'
import { Card, Label } from '@/components/ledger/primitives'
import { grade } from '@/components/ui/synth'
import { cn } from '@/lib/utils'

// Compact Recovery/Strain/Sleep row for Home, same self-fetch + self-hide
// pattern as PatternsCard/WeeklyDigestCard — no props, hides itself while
// there's nothing real to show (still collecting a baseline, or no sleep
// logged yet), full detail lives at /fitness/vitals.
interface VitalsSummary {
  recovery: { status: 'ok'; score: number } | { status: 'collecting_baseline' }
  sleep: { status: 'ok'; score: number } | null
  strain: { status: 'ok'; strain: number }
}

function toLocalDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function Stat({ label, value, score }: { label: string; value: string; score: number | null }) {
  return (
    <div className="text-center">
      <p className={cn('text-lg font-bold tabular-nums', score !== null ? grade(score).text : 'text-ldg-ink/30')}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-ldg-ink/40 mt-0.5">{label}</p>
    </div>
  )
}

export function RecoveryCard() {
  const [data, setData] = useState<VitalsSummary | null>(null)

  useEffect(() => {
    fetch(`/api/fitness/vitals?date=${toLocalDate(new Date())}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => setData(null))
  }, [])

  if (!data) return null
  const hasRecovery = data.recovery.status === 'ok'
  const hasSleep = data.sleep?.status === 'ok'
  if (!hasRecovery && !hasSleep) return null // nothing real to show yet

  return (
    <Card className="p-5">
      <a href="/fitness/vitals" className="flex items-center gap-2 mb-3">
        <HeartPulse size={14} className="text-ldg-green" />
        <Label>Recovery</Label>
      </a>
      <div className="grid grid-cols-3 divide-x divide-ldg-ink/[0.07]">
        <Stat label="Recovery" value={hasRecovery ? `${(data.recovery as { score: number }).score}%` : '—'} score={hasRecovery ? (data.recovery as { score: number }).score : null} />
        <Stat label="Strain" value={data.strain.strain.toFixed(1)} score={null} />
        <Stat label="Sleep" value={hasSleep ? `${data.sleep!.score}%` : '—'} score={hasSleep ? data.sleep!.score : null} />
      </div>
    </Card>
  )
}
