// Canonical workout-type bucket + display config, shared by:
// - api/fitness/workouts (manual CRUD)
// - api/fitness/habit-workouts (read-time projection over ticked habits)
// - api/fitness/health-import (Apple Health → Shortcuts sync)
// - fitness/workouts/page.tsx (display)
//
// Two separate classifiers on purpose, not one merged regex set: they read
// different vocabularies for different reasons. HealthKit's own activity-type
// strings ("Functional Strength Training", "Walking", "HIIT") are Apple's
// controlled vocabulary from a real recorded session — a HealthKit "Walking"
// workout is genuine cardio. A user's own habit name ("Morning Walk") is
// casual self-naming where "walk" more often means a leisurely/rest-type
// activity for this person, not a workout to log training load against.
// Forcing these through one ruleset would misclassify one domain using the
// other's assumptions, so they stay distinct — they just share the same
// output buckets and the same display config below.

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

// From a habit's own name (user-typed, casual vocabulary). Returns null for
// habits that are tracked but shouldn't show up as a "workout" at all
// (mobility/stretch routines, plain step-count habits).
const HABIT_EXCLUDE = ['bend', 'circuit', 'bodyweight', 'stretch', 'mobility', 'steps']

export function classifyFromHabitName(name: string): WorkoutType | null {
  const n = name.toLowerCase()
  if (HABIT_EXCLUDE.some(k => n.includes(k))) return null
  if (/(bike|cycl|ride)/.test(n)) return 'cardio_bike'
  if (/(run|jog|swim|cardio|row)/.test(n)) return 'cardio_other'
  if (/(pt|gym|train|lift|strength)/.test(n)) return 'pt'
  if (/(walk|rest|yoga)/.test(n)) return 'rest'
  return 'other'
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
