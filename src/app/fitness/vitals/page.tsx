'use client'
import { useEffect, useState } from 'react'
import { ScoreRing, HeroStat, Delta, grade } from '@/components/ui/synth'
import { Card, Label, Rule } from '@/components/ledger/primitives'
import { cn } from '@/lib/utils'
import { HeartPulse, Moon, Flame, Activity, Wind, Gauge } from 'lucide-react'

// ── Recovery / Sleep / Strain / cardio-load-trend snapshot for today ───────
// Every number here comes straight from src/lib/vitals.ts's read-time
// computation — nothing is stored as an opaque score. Deliberately a
// today-only snapshot for now rather than a multi-day trend chart: there's
// no real vitals history yet (Phase 2/3 of the import haven't landed real
// data), so a trend line would just be empty. The "collecting baseline"/
// null states below are the honest thing to show until there's enough days
// of real Apple Health data flowing in — this page gets a trend view once
// that history exists.

interface RecoveryComponent { value: number | null; baselineMean: number | null; baselineDays: number; score: number | null }
interface RecoveryOk { status: 'ok'; score: number; components: { hrv: RecoveryComponent; rhr: RecoveryComponent; sleepPerformance: RecoveryComponent; respiratoryRate: RecoveryComponent } }
interface RecoveryCollecting { status: 'collecting_baseline'; daysCollected: number; daysNeeded: number }
interface SleepScore { status: 'ok'; score: number; durationRatio: number; efficiency: number | null; remPct: number | null; deepPct: number | null; asleepMin: number; inBedMin: number | null }
interface Strain { status: 'ok'; strain: number; dailyTrimp: number; workoutCount: number }
interface Acwr { status: 'ok'; ratio: number; acute7d: number; chronic28d: number; band: 'undertrained' | 'sweet_spot' | 'caution' | 'elevated_risk' }
interface Trend { value: number | null; baselineMean: number | null; deltaPct: number | null }
interface VitalsData { date: string; recovery: RecoveryOk | RecoveryCollecting; sleep: SleepScore | null; strain: Strain; acwr: Acwr | null; vo2max: Trend; hrRecovery: Trend }

function toLocalDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const COMPONENT_META: Record<keyof RecoveryOk['components'], { label: string; unit: string }> = {
  hrv: { label: 'HRV', unit: 'ms' },
  rhr: { label: 'Resting HR', unit: 'bpm' },
  sleepPerformance: { label: 'Sleep', unit: 'min' },
  respiratoryRate: { label: 'Resp. Rate', unit: 'br/min' },
}

const ACWR_BAND_META: Record<Acwr['band'], { label: string; className: string }> = {
  undertrained: { label: 'Undertrained', className: 'text-ldg-ink/55' },
  sweet_spot: { label: 'Sweet spot', className: 'text-ldg-green' },
  caution: { label: 'Caution', className: 'text-amber-500' },
  elevated_risk: { label: 'Elevated risk', className: 'text-ldg-urgent' },
}

export default function VitalsPage() {
  const [data, setData] = useState<VitalsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/fitness/vitals?date=${toLocalDate(new Date())}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => <div key={i} className="h-40 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
    </div>
  )
  if (!data) return <p className="text-sm text-gray-400">Couldn't load vitals.</p>

  const { recovery, sleep, strain, acwr, vo2max, hrRecovery } = data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Vitals</h1>
        <p className="text-sm text-gray-400 mt-0.5">Recovery, sleep, and cardio load — computed from Apple Health data</p>
      </div>

      {/* Recovery */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <HeartPulse size={14} className="text-ldg-green" />
          <Label>Recovery</Label>
        </div>
        {recovery.status === 'collecting_baseline' ? (
          <div className="text-center py-8">
            <p className="text-sm text-ldg-ink/60">
              Collecting your baseline — {recovery.daysCollected}/{recovery.daysNeeded} days of HRV/RHR/respiratory data so far.
            </p>
            <p className="text-xs text-ldg-ink/40 mt-1">Recovery needs a couple weeks of history to mean anything real.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-5">
            <ScoreRing value={recovery.score} display={`${recovery.score}%`} sub="Recovery" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
              {(Object.keys(COMPONENT_META) as (keyof RecoveryOk['components'])[]).map(key => {
                const c = recovery.components[key]
                const meta = COMPONENT_META[key]
                return (
                  <div key={key} className="text-center">
                    <p className="text-[10px] uppercase tracking-wide text-ldg-ink/40">{meta.label}</p>
                    <p className={cn('text-sm font-semibold mt-0.5', c.score !== null ? grade(c.score).text : 'text-ldg-ink/30')}>
                      {c.value !== null ? `${Math.round(c.value * 10) / 10} ${meta.unit}` : '—'}
                    </p>
                    {c.baselineMean !== null && (
                      <p className="text-[10px] text-ldg-ink/40">baseline {Math.round(c.baselineMean * 10) / 10}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Sleep */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Moon size={14} className="text-ldg-green" />
            <Label>Sleep</Label>
          </div>
          {sleep ? (
            <div className="flex flex-col items-center gap-4">
              <ScoreRing value={sleep.score} display={`${sleep.score}%`} sub="Sleep score" size={104} />
              <div className="grid grid-cols-2 gap-3 w-full text-center">
                <HeroStat label="Asleep" value={`${(sleep.asleepMin / 60).toFixed(1)}h`} className="mx-auto" />
                <HeroStat label="Efficiency" value={sleep.efficiency !== null ? `${Math.round(sleep.efficiency * 100)}%` : '—'} className="mx-auto" />
                <HeroStat label="REM" value={sleep.remPct !== null ? `${Math.round(sleep.remPct)}%` : '—'} className="mx-auto" />
                <HeroStat label="Deep" value={sleep.deepPct !== null ? `${Math.round(sleep.deepPct)}%` : '—'} className="mx-auto" />
              </div>
            </div>
          ) : (
            <p className="text-sm text-ldg-ink/40 text-center py-8">No sleep data for last night yet.</p>
          )}
        </Card>

        {/* Strain */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Flame size={14} className="text-ldg-green" />
            <Label>Strain</Label>
          </div>
          <div className="flex flex-col items-center gap-4">
            <ScoreRing value={(strain.strain / 21) * 100} display={strain.strain.toFixed(1)} sub="of 21" size={104} />
            <p className="text-xs text-ldg-ink/50 text-center">
              {strain.workoutCount > 0 ? `${strain.workoutCount} workout${strain.workoutCount > 1 ? 's' : ''} logged today` : 'No workouts logged today'}
            </p>
          </div>
        </Card>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {/* Cardio load trend (ACWR) */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Gauge size={14} className="text-ldg-green" />
            <Label>Cardio Load</Label>
          </div>
          {acwr ? (
            <>
              <p className={cn('text-2xl font-bold tabular-nums', ACWR_BAND_META[acwr.band].className)}>{acwr.ratio.toFixed(2)}</p>
              <p className={cn('text-xs font-semibold mt-0.5', ACWR_BAND_META[acwr.band].className)}>{ACWR_BAND_META[acwr.band].label}</p>
              <p className="text-[11px] text-ldg-ink/40 mt-1.5">7d avg {acwr.acute7d} / 28d avg {acwr.chronic28d} TRIMP</p>
            </>
          ) : (
            <p className="text-sm text-ldg-ink/40">Not enough workout history yet.</p>
          )}
        </Card>

        {/* VO2 Max */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={14} className="text-ldg-green" />
            <Label>VO2 Max</Label>
          </div>
          {vo2max.value !== null ? (
            <>
              <p className="text-2xl font-bold tabular-nums">{vo2max.value.toFixed(1)}</p>
              <p className="text-[11px] text-ldg-ink/40 mt-0.5">ml/kg/min</p>
              {vo2max.deltaPct !== null && <div className="mt-1.5"><Delta value={vo2max.deltaPct} /></div>}
            </>
          ) : <p className="text-sm text-ldg-ink/40">No VO2 max data yet.</p>}
        </Card>

        {/* HR Recovery */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Wind size={14} className="text-ldg-green" />
            <Label>HR Recovery</Label>
          </div>
          {hrRecovery.value !== null ? (
            <>
              <p className="text-2xl font-bold tabular-nums">{hrRecovery.value.toFixed(0)}</p>
              <p className="text-[11px] text-ldg-ink/40 mt-0.5">bpm drop, 1 min post-workout</p>
              {hrRecovery.deltaPct !== null && <div className="mt-1.5"><Delta value={hrRecovery.deltaPct} /></div>}
            </>
          ) : <p className="text-sm text-ldg-ink/40">No HR recovery data yet.</p>}
        </Card>
      </div>
    </div>
  )
}
