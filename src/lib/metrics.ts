// Canonical registry for every "one value per day" BodyMetric key, shared by:
// - api/fitness/health-import (Apple Health → Shortcuts sync, accepts the payload keys below)
// - fitness/body/page.tsx (trend charts)
// - lib/vitals.ts (reads the vitals-group keys to compute Recovery/Sleep/Strain)
//
// BodyMetric.metric stays a free-form string (no schema migration per new
// metric) — this is the one place the full set of recognized keys, labels,
// units, and grouping lives, so it doesn't have to be re-declared per file
// as the list grows.

export type MetricGroup = 'body' | 'vitals'

export interface MetricDef {
  key: string        // BodyMetric.metric value, and the JSON payload key health-import accepts
  label: string
  unit: string
  icon: string
  color: string
  cadence: 'weekly' | 'monthly' | 'daily'
  group: MetricGroup
}

export const METRICS: MetricDef[] = [
  // ── Body measurements ─────────────────────────────────────────────────
  { key: 'weight',    label: 'Weight',     unit: 'kg', icon: '⚖️',  color: '#2e7d4f', cadence: 'weekly',  group: 'body' },
  { key: 'waist',     label: 'Waist',      unit: 'cm', icon: '📏',  color: '#54555c', cadence: 'weekly',  group: 'body' },
  { key: 'chest',     label: 'Chest',      unit: 'cm', icon: '💪',  color: '#8fb8a0', cadence: 'monthly', group: 'body' },
  { key: 'bicep',     label: 'Bicep',      unit: 'cm', icon: '💪',  color: '#3d6650', cadence: 'monthly', group: 'body' },
  { key: 'shoulders', label: 'Shoulders',  unit: 'cm', icon: '🏋️', color: '#84858c', cadence: 'monthly', group: 'body' },
  { key: 'thigh',     label: 'Thigh',      unit: 'cm', icon: '🦵',  color: '#6f9080', cadence: 'monthly', group: 'body' },

  // ── Activity ───────────────────────────────────────────────────────────
  { key: 'steps',            label: 'Steps',         unit: 'steps', icon: '👣', color: '#3d6650', cadence: 'daily', group: 'body' },
  { key: 'activeEnergyKcal', label: 'Active Energy', unit: 'kcal',  icon: '🔥', color: '#c96f3f', cadence: 'daily', group: 'body' },
  { key: 'sleepHours',       label: 'Sleep (total)', unit: 'h',     icon: '😴', color: '#5b6bb0', cadence: 'daily', group: 'body' },

  // ── Vitals — feed lib/vitals.ts's Recovery/Strain scoring ───────────────
  { key: 'respiratoryRate', label: 'Respiratory Rate', unit: 'br/min', icon: '🫁', color: '#4a7d99', cadence: 'daily', group: 'vitals' },
  { key: 'hrvSDNN',         label: 'HRV (SDNN)',       unit: 'ms',     icon: '💓', color: '#b0475b', cadence: 'daily', group: 'vitals' },
  { key: 'restingHeartRate',label: 'Resting HR',       unit: 'bpm',    icon: '❤️', color: '#c94f4f', cadence: 'daily', group: 'vitals' },
  { key: 'spo2',            label: 'Blood Oxygen',     unit: '%',      icon: '🩸', color: '#4f8fc9', cadence: 'daily', group: 'vitals' },
  { key: 'wristTemp',       label: 'Wrist Temp',       unit: '°C',     icon: '🌡️', color: '#c98f4f', cadence: 'daily', group: 'vitals' },
  { key: 'vo2Max',          label: 'VO2 Max',          unit: 'ml/kg/min', icon: '🫀', color: '#4f9c8f', cadence: 'weekly', group: 'vitals' },
  { key: 'hrRecovery1min',  label: 'HR Recovery',      unit: 'bpm',    icon: '↩️', color: '#7a4fc9', cadence: 'daily', group: 'vitals' },
]

export const METRIC_BY_KEY: Record<string, MetricDef> = Object.fromEntries(METRICS.map(m => [m.key, m]))

export const BODY_METRICS   = METRICS.filter(m => m.group === 'body' && m.cadence !== 'daily')
export const VITALS_METRICS = METRICS.filter(m => m.group === 'vitals')

// The subset health-import/route.ts upserts straight into BodyMetric — every
// metric here EXCEPT the manual-only body-measurement keys (weight/waist/etc
// stay manual-entry via /api/life/body-metrics, or the existing weight sync).
export const IMPORT_SCALAR_FIELDS = METRICS.filter(m =>
  ['steps', 'activeEnergyKcal', 'sleepHours', 'weight', ...VITALS_METRICS.map(v => v.key)].includes(m.key)
)
