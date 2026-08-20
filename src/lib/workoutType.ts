// Canonical workout-type bucket + display config, shared by:
// - api/fitness/workouts (manual CRUD)
// - api/fitness/health-import (Apple Health → Shortcuts sync)
// - fitness/workouts/page.tsx (display)
//
// Workouts used to also be synthesized from ticked habits (a "PT Session"
// habit checkbox turned into a fake WorkoutLog-shaped row) — removed: once
// Apple Health import gives real type/duration/HR data, a habit tick is a
// weaker, easier-to-fake signal than the real thing, and having three
// sources of truth for "did I work out" was more confusing than useful.
// classifyFromHealthKitType() reads HealthKit's own controlled activity-type
// vocabulary ("Functional Strength Training", "Walking", "HIIT") — a
// HealthKit "Walking" workout is genuine cardio, so it maps differently than
// a casual habit name like "Morning Walk" used to.

export const WORKOUT_TYPES = [
  { value: 'pt',           label: 'PT Session',     icon: '🏋️', color: 'bg-ldg-ink/[0.06] text-ldg-ink/70' },
  { value: 'cardio_bike',  label: 'Bike Ride',      icon: '🚴', color: 'bg-ldg-ink/[0.06] text-ldg-ink/70' },
  { value: 'cardio_other', label: 'Cardio (other)', icon: '🏃', color: 'bg-ldg-ink/[0.06] text-ldg-ink/70' },
  { value: 'rest',         label: 'Active Rest',    icon: '🧘', color: 'bg-ldg-green/10 text-ldg-green' },
  { value: 'other',        label: 'Other',          icon: '⚡', color: 'bg-ldg-ink/[0.06] text-ldg-ink/55' },
] as const

export type WorkoutType = typeof WORKOUT_TYPES[number]['value']

export function workoutTypeConfig(value: string) {
  return WORKOUT_TYPES.find(t => t.value === value) ?? WORKOUT_TYPES[4]
}

// From HealthKit's own workout activity-type string (Apple's controlled
// vocabulary — a recorded session, not a self-typed habit name), or from
// whatever free text a Shortcut sends for `workoutType`.
export function classifyFromHealthKitType(raw: string): WorkoutType {
  const s = raw.toLowerCase()
  if (s.includes('strength') || s.includes('functional') || s.includes('core') || s.includes('weight training')) return 'pt'
  if (s.includes('cycl') || s.includes('bike') || s.includes('spin')) return 'cardio_bike'
  if (s.includes('run') || s.includes('walk') || s.includes('swim') || s.includes('elliptical') || s.includes('row') || s.includes('hiit') || s.includes('cardio') || s.includes('dance') || s.includes('hik')) return 'cardio_other'
  return 'other'
}
