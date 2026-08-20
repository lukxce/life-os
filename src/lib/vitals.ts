import { prisma } from '@/lib/prisma'

// ── Vitals scoring engine ───────────────────────────────────────────────────
// Recovery / Sleep / Strain / cardio-load-trend (ACWR), computed at read
// time from raw stored data — same precedent as patterns.ts and nudges.ts,
// never a stored opaque number. This is a deliberate, stated difference from
// Whoop/Bevel: every formula here is plain, commented arithmetic, and every
// API response includes the intermediate components alongside the final
// score, not just the headline number, so any score can be sanity-checked
// or recomputed by hand. Sources for the formulas below: Whoop's public
// description of its Recovery inputs (HRV-dominant, plus RHR/sleep
// performance/respiratory rate); Banister's TRIMP (1991) for training load;
// the Acute:Chronic Workload Ratio literature (0.8–1.3 sweet spot, ≥1.5
// elevated injury risk) for the cardio-load trend; HRV research consensus on
// log-transforming rMSSD-family metrics against a personal rolling baseline
// rather than population norms. Apple only exposes HRV as SDNN, not rMSSD —
// the "hrvSDNN" metric name reflects that; the log-baseline-deviation
// approach still applies, just to a different (still autonomic-nervous-
// -system-linked) HRV statistic.

const BASELINE_DAYS = 60
const MIN_BASELINE_DAYS = 14
const STRAIN_CALIBRATION_DAYS = 90
const MIN_STRAIN_CALIBRATION_DAYS = 10
const DEFAULT_STRAIN_K = 0.15 // fallback saturating-exponential constant before 10 days of workout history exist

function dayUTC(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setUTCDate(r.getUTCDate() + n)
  return r
}

function mean(xs: number[]): number { return xs.reduce((a, b) => a + b, 0) / xs.length }
function stdev(xs: number[], m: number): number {
  if (xs.length < 2) return 0
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1))
}
function clamp(x: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, x)) }

interface Baseline { mean: number; std: number; n: number }

async function getBaseline(metric: string, forDate: Date, days = BASELINE_DAYS): Promise<Baseline> {
  const rows = await prisma.bodyMetric.findMany({
    where: { metric, date: { gte: addDays(forDate, -days), lt: forDate } },
    select: { value: true },
  })
  const vals = rows.map(r => r.value)
  return { mean: vals.length ? mean(vals) : 0, std: stdev(vals, vals.length ? mean(vals) : 0), n: vals.length }
}

async function getLatest(metric: string, forDate: Date): Promise<number | null> {
  const row = await prisma.bodyMetric.findUnique({ where: { date_metric: { date: forDate, metric } } })
  return row?.value ?? null
}

// ── Recovery ─────────────────────────────────────────────────────────────
// 0.50·HRV + 0.25·RHR + 0.15·sleep performance + 0.10·respiratory rate.
// HRV/RHR/resp scores are baseline-deviation z-scores centered on 50;
// sleep performance is a plain ratio. Requires MIN_BASELINE_DAYS of history
// per vital or returns a "collecting" state instead of a fabricated score.

export interface RecoveryComponent { value: number | null; baselineMean: number | null; baselineDays: number; score: number | null }
export interface RecoveryResult {
  status: 'ok'
  score: number
  components: { hrv: RecoveryComponent; rhr: RecoveryComponent; sleepPerformance: RecoveryComponent; respiratoryRate: RecoveryComponent }
}
export interface CollectingBaseline { status: 'collecting_baseline'; daysCollected: number; daysNeeded: number }

async function scoreDeviation(metric: string, forDate: Date, higherIsBetter: boolean): Promise<RecoveryComponent> {
  const baseline = await getBaseline(metric, forDate)
  const value = await getLatest(metric, forDate)
  if (value === null || baseline.n < MIN_BASELINE_DAYS || baseline.std === 0) {
    return { value, baselineMean: baseline.n ? baseline.mean : null, baselineDays: baseline.n, score: null }
  }
  const z = (value - baseline.mean) / baseline.std
  const signed = higherIsBetter ? z : -z
  const score = clamp(50 + 25 * signed, 0, 100)
  return { value, baselineMean: baseline.mean, baselineDays: baseline.n, score }
}

async function scoreEitherDirectionDeviation(metric: string, forDate: Date): Promise<RecoveryComponent> {
  const baseline = await getBaseline(metric, forDate)
  const value = await getLatest(metric, forDate)
  if (value === null || baseline.n < MIN_BASELINE_DAYS || baseline.std === 0) {
    return { value, baselineMean: baseline.n ? baseline.mean : null, baselineDays: baseline.n, score: null }
  }
  const z = Math.abs((value - baseline.mean) / baseline.std)
  const score = clamp(50 - 25 * z, 0, 100)
  return { value, baselineMean: baseline.mean, baselineDays: baseline.n, score }
}

export async function computeRecovery(dateStr: string): Promise<RecoveryResult | CollectingBaseline> {
  const date = dayUTC(dateStr)
  const [hrv, rhr, resp, sleep, settings] = await Promise.all([
    scoreDeviation('hrvSDNN', date, true),
    scoreDeviation('restingHeartRate', date, false),
    scoreEitherDirectionDeviation('respiratoryRate', date),
    prisma.sleepSession.findUnique({ where: { date } }),
    prisma.settings.findUnique({ where: { id: 'default' } }),
  ])

  const sleepNeedMin = (settings?.sleepNeedHours ?? 8) * 60
  const asleepMin = sleep?.asleepMin ?? null
  const sleepPerf: RecoveryComponent = asleepMin === null
    ? { value: null, baselineMean: null, baselineDays: 0, score: null }
    : { value: asleepMin, baselineMean: sleepNeedMin, baselineDays: 1, score: clamp((asleepMin / sleepNeedMin) * 100, 0, 100) }

  const components = { hrv, rhr, sleepPerformance: sleepPerf, respiratoryRate: resp }
  const missing = Object.values(components).filter(c => c.score === null)
  if (missing.length === Object.values(components).length) {
    const daysCollected = Math.max(hrv.baselineDays, rhr.baselineDays, resp.baselineDays)
    return { status: 'collecting_baseline', daysCollected, daysNeeded: MIN_BASELINE_DAYS }
  }

  // Weighted average over whichever components actually have a score today
  // (renormalizing weights) rather than failing the whole score for one
  // missing input — e.g. no respiratory-rate reading yet shouldn't block HRV.
  const weights = { hrv: 0.50, rhr: 0.25, sleepPerformance: 0.15, respiratoryRate: 0.10 }
  let weightedSum = 0, weightTotal = 0
  for (const k of Object.keys(weights) as (keyof typeof weights)[]) {
    const c = components[k]
    if (c.score !== null) { weightedSum += c.score * weights[k]; weightTotal += weights[k] }
  }
  const score = weightTotal > 0 ? Math.round(weightedSum / weightTotal) : 0

  return { status: 'ok', score, components }
}

// ── Sleep score ──────────────────────────────────────────────────────────
// 0.5·duration ratio + 0.3·efficiency (asleep/inBed) + 0.2·stage composition
// (REM% and Deep% scored against standard adult reference bands: ~20–25%
// REM, ~13–23% Deep of total asleep time — full credit inside the band,
// linear decay outside it).

export interface SleepScoreResult {
  status: 'ok'
  score: number
  durationRatio: number
  efficiency: number | null
  remPct: number | null
  deepPct: number | null
  asleepMin: number
  inBedMin: number | null
}

function bandScore(pct: number, lo: number, hi: number): number {
  if (pct >= lo && pct <= hi) return 100
  const dist = pct < lo ? lo - pct : pct - hi
  return clamp(100 - dist * 8, 0, 100) // ~12.5 points off the band range fully zeroes it out
}

export async function computeSleepScore(dateStr: string): Promise<SleepScoreResult | null> {
  const date = dayUTC(dateStr)
  const [session, settings] = await Promise.all([
    prisma.sleepSession.findUnique({ where: { date } }),
    prisma.settings.findUnique({ where: { id: 'default' } }),
  ])
  if (!session || session.asleepMin === null) return null

  const sleepNeedMin = (settings?.sleepNeedHours ?? 8) * 60
  const durationRatio = clamp(session.asleepMin / sleepNeedMin, 0, 1.3)
  const efficiency = session.inBedMin ? clamp(session.asleepMin / session.inBedMin, 0, 1) : null
  const remPct = session.remMin !== null ? (session.remMin / session.asleepMin) * 100 : null
  const deepPct = session.deepMin !== null ? (session.deepMin / session.asleepMin) * 100 : null

  const durationScore = clamp(durationRatio * 100, 0, 100)
  const efficiencyScore = efficiency !== null ? efficiency * 100 : durationScore // fall back to duration if no inBed data
  const remScore = remPct !== null ? bandScore(remPct, 20, 25) : durationScore
  const deepScore = deepPct !== null ? bandScore(deepPct, 13, 23) : durationScore
  const stageScore = (remScore + deepScore) / 2

  const score = Math.round(0.5 * durationScore + 0.3 * efficiencyScore + 0.2 * stageScore)

  return { status: 'ok', score, durationRatio, efficiency, remPct, deepPct, asleepMin: session.asleepMin, inBedMin: session.inBedMin }
}

// ── Daily Strain (Banister TRIMP → 0–21 Whoop-style scale) ────────────────
// Per-workout TRIMP = duration_min × ΔHR × 0.64 × e^(1.92·ΔHR), the standard
// Banister exponential (male-coefficient) form; ΔHR is heart-rate-reserve
// fraction using Settings.maxHeartRate (or 220-birthYear fallback) and that
// day's restingHeartRate baseline. Daily total sums the day's workout TRIMPs
// plus a small non-exercise contribution from steps/activeEnergy relative to
// the person's own rolling average, so a high-activity rest day isn't a hard
// zero. Mapped to 0–21 via a saturating exponential self-calibrated from the
// person's own trailing-90-day max daily TRIMP, so a maximal-effort day
// approaches ~20 rather than an arbitrarily guessed constant.

async function dailyTRIMP(dateStr: string): Promise<number> {
  const date = dayUTC(dateStr)
  const nextDay = addDays(date, 1)
  const [workouts, settings, rhr, steps, activeEnergy, stepsBaseline, energyBaseline] = await Promise.all([
    prisma.workoutLog.findMany({ where: { date: { gte: date, lt: nextDay }, avgHeartRate: { not: null } } }),
    prisma.settings.findUnique({ where: { id: 'default' } }),
    getLatest('restingHeartRate', date),
    getLatest('steps', date),
    getLatest('activeEnergyKcal', date),
    getBaseline('steps', date, 28),
    getBaseline('activeEnergyKcal', date, 28),
  ])

  const maxHR = settings?.maxHeartRate ?? (settings?.birthYear ? 220 - (new Date().getUTCFullYear() - settings.birthYear) : 190)
  const restHR = rhr ?? 60

  let workoutTrimp = 0
  for (const w of workouts) {
    if (!w.avgHeartRate || !w.duration) continue
    const dHR = clamp((w.avgHeartRate - restHR) / Math.max(maxHR - restHR, 1), 0, 1)
    workoutTrimp += w.duration * dHR * 0.64 * Math.exp(1.92 * dHR)
  }

  // Small non-exercise contribution: activity relative to personal rolling
  // average, capped so it can never dominate a real workout's contribution.
  let neat = 0
  if (steps !== null && stepsBaseline.n >= 7 && stepsBaseline.mean > 0) neat += clamp((steps / stepsBaseline.mean) * 2, 0, 4)
  if (activeEnergy !== null && energyBaseline.n >= 7 && energyBaseline.mean > 0) neat += clamp((activeEnergy / energyBaseline.mean) * 2, 0, 4)

  return workoutTrimp + neat
}

export interface StrainResult { status: 'ok'; strain: number; dailyTrimp: number; k: number; workoutCount: number }

export async function computeStrain(dateStr: string): Promise<StrainResult> {
  const date = dayUTC(dateStr)
  const [trimp, calibrationRows] = await Promise.all([
    dailyTRIMP(dateStr),
    prisma.workoutLog.findMany({
      where: { date: { gte: addDays(date, -STRAIN_CALIBRATION_DAYS), lt: date }, avgHeartRate: { not: null } },
      select: { date: true },
    }),
  ])

  let k = DEFAULT_STRAIN_K
  const uniqueDays = new Set(calibrationRows.map(r => r.date.toISOString().slice(0, 10)))
  if (uniqueDays.size >= MIN_STRAIN_CALIBRATION_DAYS) {
    const perDay = await Promise.all(Array.from(uniqueDays).map(d => dailyTRIMP(d)))
    const maxTrimp = Math.max(...perDay, 1)
    // Solve k so that the person's own historical max TRIMP lands at ~20/21.
    k = -Math.log(1 - 20 / 21) / maxTrimp
  }

  const strain = Math.round(21 * (1 - Math.exp(-k * trimp)) * 10) / 10
  const workoutCount = await prisma.workoutLog.count({ where: { date: { gte: date, lt: addDays(date, 1) } } })

  return { status: 'ok', strain, dailyTrimp: Math.round(trimp * 10) / 10, k, workoutCount }
}

// ── ACWR (cardio load trend) ───────────────────────────────────────────────
// 7-day rolling avg daily TRIMP ÷ 28-day rolling avg daily TRIMP.
// 0.8–1.3 sweet spot, 1.3–1.5 caution, ≥1.5 elevated injury-risk band —
// straight from the Acute:Chronic Workload Ratio research.

export interface AcwrResult { status: 'ok'; ratio: number; acute7d: number; chronic28d: number; band: 'undertrained' | 'sweet_spot' | 'caution' | 'elevated_risk' }

function acwrBand(ratio: number): AcwrResult['band'] {
  if (ratio < 0.8) return 'undertrained'
  if (ratio <= 1.3) return 'sweet_spot'
  if (ratio <= 1.5) return 'caution'
  return 'elevated_risk'
}

export async function computeACWR(dateStr: string): Promise<AcwrResult | null> {
  const date = dayUTC(dateStr)
  const days28 = Array.from({ length: 28 }, (_, i) => addDays(date, -i).toISOString().slice(0, 10))
  const trimps = await Promise.all(days28.map(d => dailyTRIMP(d)))
  const nonZeroDays = trimps.filter(t => t > 0).length
  if (nonZeroDays < 3) return null // not enough workout history yet to mean anything

  const acute7d = mean(trimps.slice(0, 7))
  const chronic28d = mean(trimps)
  if (chronic28d === 0) return null

  const ratio = Math.round((acute7d / chronic28d) * 100) / 100
  return { status: 'ok', ratio, acute7d: Math.round(acute7d * 10) / 10, chronic28d: Math.round(chronic28d * 10) / 10, band: acwrBand(ratio) }
}

// ── Simple trend metrics (no scoring, just the number + baseline delta) ────

export interface TrendResult { value: number | null; baselineMean: number | null; deltaPct: number | null }

export async function computeTrend(metric: string, dateStr: string, baselineDays = 90): Promise<TrendResult> {
  const date = dayUTC(dateStr)
  const [value, baseline] = await Promise.all([getLatest(metric, date), getBaseline(metric, date, baselineDays)])
  if (value === null) return { value: null, baselineMean: baseline.n ? baseline.mean : null, deltaPct: null }
  if (baseline.n < 5 || baseline.mean === 0) return { value, baselineMean: null, deltaPct: null }
  const deltaPct = Math.round(((value - baseline.mean) / baseline.mean) * 1000) / 10
  return { value, baselineMean: Math.round(baseline.mean * 100) / 100, deltaPct }
}

// ── Bundle for the /api/fitness/vitals route ────────────────────────────────

export interface VitalsResult {
  date: string
  recovery: RecoveryResult | CollectingBaseline
  sleep: SleepScoreResult | null
  strain: StrainResult
  acwr: AcwrResult | null
  vo2max: TrendResult
  hrRecovery: TrendResult
}

export async function computeVitals(dateStr: string): Promise<VitalsResult> {
  const [recovery, sleep, strain, acwr, vo2max, hrRecovery] = await Promise.all([
    computeRecovery(dateStr),
    computeSleepScore(dateStr),
    computeStrain(dateStr),
    computeACWR(dateStr),
    computeTrend('vo2Max', dateStr),
    computeTrend('hrRecovery1min', dateStr),
  ])
  return { date: dateStr, recovery, sleep, strain, acwr, vo2max, hrRecovery }
}
