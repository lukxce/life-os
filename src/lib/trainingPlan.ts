// Fixed weekly training plan — previously duplicated three times (DAY_PLAN
// in fitness/page.tsx, TRAINING_PLAN in api/right-now/route.ts, and a third
// expectedType day->type map also in fitness/page.tsx). One source of truth
// now; `iconKey` is a string rather than a React component reference so this
// stays importable from server routes (api/right-now) as well as the client
// page — the page maps iconKey -> its own lucide-react icon.
//
// Still hardcoded, not DB-backed — making this recovery-adaptive (e.g.
// swapping a PT day for Active Rest on a low-recovery morning) is enabled by
// the vitals layer but intentionally out of scope for this dedup pass.

export type TrainingType = 'pt' | 'cardio_bike' | 'rest'
export type TrainingIconKey = 'dumbbell' | 'bike' | 'walk' | 'bed'

export interface DayPlan {
  activity: string
  type: TrainingType
  desc: string
  iconKey: TrainingIconKey
}

export const TRAINING_PLAN: Record<number, DayPlan> = {
  1: { activity: 'PT Session',  type: 'pt',          desc: 'Mon · 60 min gym',         iconKey: 'dumbbell' },
  2: { activity: 'Bike Ride',   type: 'cardio_bike', desc: 'Tue · 45–60 min Zone 2',    iconKey: 'bike' },
  3: { activity: 'PT Session',  type: 'pt',          desc: 'Wed · 60 min gym',          iconKey: 'dumbbell' },
  4: { activity: 'Active Rest', type: 'rest',        desc: 'Thu · long walk 40–50 min', iconKey: 'walk' },
  5: { activity: 'PT Session',  type: 'pt',          desc: 'Fri · 60 min gym',          iconKey: 'dumbbell' },
  6: { activity: 'Long Ride',   type: 'cardio_bike', desc: 'Sat · 60–75 min Zone 2',    iconKey: 'bike' },
  7: { activity: 'Full Rest',   type: 'rest',        desc: 'Sun · casual walk only',    iconKey: 'bed' },
}
