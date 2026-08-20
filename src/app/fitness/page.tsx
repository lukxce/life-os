'use client'
import { useEffect, useState, useCallback } from 'react'
import { ChevronRight, Droplets, Footprints, Moon, Check, Plus, X, Dumbbell, Bike, PersonStanding, BedDouble } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ScoreRing, Delta } from '@/components/ui/synth'
import { Card, Label, SolidBtn } from '@/components/ledger/primitives'
import { MealPhotoButton } from '@/components/ui/MealPhotoButton'
import { cn } from '@/lib/utils'
import { TRAINING_PLAN, type TrainingIconKey } from '@/lib/trainingPlan'

interface MealSlot { id: string; dayOfWeek: number; mealType: string; name: string; calories: number; protein: number }
interface WorkoutLog { id: string; date: string; type: string; duration: number | null }
interface BodyRow   { id: string; date: string; metric: string; value: number }
interface MealLogRow { id: string; mealType: string; description: string | null; calories: number | null; protein: number | null; createdAt: string }

const KCAL_TARGET = 2100
const PROTEIN_TARGET = 150

const PLAN_ICONS: Record<TrainingIconKey, typeof Dumbbell> = {
  dumbbell: Dumbbell, bike: Bike, walk: PersonStanding, bed: BedDouble,
}

const MEAL_ORDER = ['breakfast', 'snack', 'dinner']
const MEAL_META: Record<string, { emoji: string; time: string }> = {
  breakfast: { emoji: '🍳', time: '12:00' },
  snack:     { emoji: '🥤', time: '15:30' },
  dinner:    { emoji: '🍽️', time: '19:00' },
}

function toLocalDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function FitnessTodayPage() {
  const [meals,    setMeals]    = useState<MealSlot[]>([])
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([])
  const [weights,  setWeights]  = useState<BodyRow[]>([])
  const [mealLogs, setMealLogs] = useState<MealLogRow[]>([])
  const [loading,  setLoading]  = useState(true)
  const [loggingType, setLoggingType] = useState<string | null>(null)
  const [logText, setLogText] = useState('')

  const todayDow = (new Date().getDay() || 7)
  const todayStr = toLocalDate(new Date())
  const plan     = TRAINING_PLAN[todayDow]

  const load = useCallback(async () => {
    const [mRes, wRes, hRes, bRes, lRes] = await Promise.all([
      fetch('/api/fitness/meal-plan'),
      fetch('/api/fitness/workouts?limit=7'),
      fetch('/api/fitness/habit-workouts?days=2'),
      fetch('/api/life/body-metrics?metrics=weight'),
      fetch(`/api/life/meal-log?date=${todayStr}`),
    ])
    const [mData, wData, hData, bData, lData] = await Promise.all([mRes.json(), wRes.json(), hRes.json(), bRes.json(), lRes.json()])
    setMeals(mData)
    setWorkouts([...(wData as WorkoutLog[]), ...(hData as WorkoutLog[])])
    setWeights((bData as BodyRow[]).filter(r => r.metric === 'weight'))
    setMealLogs(lData)
    setLoading(false)
  }, [todayStr])

  useEffect(() => { load() }, [load])

  async function logMeal(mealType: string, description: string | null, precomputed?: { calories: number | null; protein: number | null }) {
    setLoggingType(null)
    setLogText('')
    try {
      const res = await fetch('/api/life/meal-log', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: todayStr, mealType, description, ...(precomputed ?? {}) }),
      })
      if (!res.ok) throw new Error()
      const created = await res.json()
      setMealLogs(prev => [...prev, created])
    } catch {
      toast.error("Couldn't save that — try again")
    }
  }

  async function deleteMealLog(id: string) {
    setMealLogs(prev => prev.filter(l => l.id !== id))
    try {
      const res = await fetch(`/api/life/meal-log?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
    } catch {
      toast.error("Couldn't remove that — refresh and try again")
    }
  }

  const todayMeals = meals.filter(m => m.dayOfWeek === todayDow)
  const plannedCal  = todayMeals.reduce((a, m) => a + m.calories, 0)
  // Real intake — AI-estimated at log time from what was actually typed,
  // not the plan's target. Skipped meals (no description) contribute 0.
  const totalCal   = mealLogs.reduce((a, l) => a + (l.calories ?? 0), 0)
  const totalProt  = mealLogs.reduce((a, l) => a + (l.protein ?? 0), 0)

  // Day is "done" when the planned workout type is logged (rest days have no expected type to match)
  const wanted = plan.type === 'rest' ? null : plan.type
  const todayWorkout = workouts.find(w => w.date.slice(0, 10) === todayStr && (wanted == null || w.type === wanted))

  const lastWeight = weights.at(-1) ?? null
  const prevWeight = weights.at(-2) ?? null
  const weightDelta = lastWeight && prevWeight ? Math.round((lastWeight.value - prevWeight.value) * 10) / 10 : null

  const today = new Date()
  const PlanIcon = PLAN_ICONS[plan.iconKey]

  if (loading) return (
    <div className="max-w-5xl mx-auto space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-28 bg-ldg-ink/[0.05] rounded-2xl animate-pulse" />)}
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-6">
      {/* ── Hero: the day's plan ── */}
      <Card className="p-5">
        <div className="flex items-start justify-between mb-5">
          <div>
            <Label>{today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</Label>
            <h1 className="text-[17px] font-semibold text-ldg-ink mt-0.5 flex items-center gap-1.5">
              <PlanIcon size={16} className="text-ldg-ink/55" /> {plan.activity}
            </h1>
            <p className="font-mono text-[12px] text-ldg-ink/55 mt-0.5">{plan.desc}</p>
          </div>
          {todayWorkout ? (
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded tracking-wide text-ldg-green bg-ldg-green/10 mt-1">Done</span>
          ) : (
            <Link href="/fitness/workouts">
              <SolidBtn>Log it</SolidBtn>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-6">
          <ScoreRing value={(totalCal / KCAL_TARGET) * 100} size={128}
            display={totalCal.toLocaleString()} sub={`of ${KCAL_TARGET.toLocaleString()} kcal`}
            color="rgb(var(--l-green))" track="rgba(27,27,30,0.08)" />
          <div className="flex-1 grid grid-cols-1 gap-3.5 min-w-0">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-ldg-ink/55">Protein</p>
              <p className={cn('font-mono text-[15px] font-semibold mt-0.5', totalProt >= 140 ? 'text-ldg-green' : 'text-ldg-ink/55')}>{totalProt}g</p>
              <p className="font-mono text-[11px] text-ldg-ink/55 mt-0.5">target 140–160g</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-ldg-ink/55">Weight</p>
              <p className="font-mono text-[15px] font-semibold mt-0.5 flex items-center gap-2">
                {lastWeight ? `${lastWeight.value} kg` : '—'}
                {weightDelta != null && <Delta value={weightDelta} suffix=" kg" />}
              </p>
              <p className="font-mono text-[11px] text-ldg-ink/55 mt-0.5">{lastWeight ? `logged ${new Date(lastWeight.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · goal 95–96` : 'log your first weigh-in'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-ldg-ink/55">Eating window</p>
              <p className="font-mono text-[15px] font-semibold mt-0.5">12:00 – 20:00</p>
              <p className="font-mono text-[11px] text-ldg-ink/55 mt-0.5">16:8 IF</p>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Today's meals ── */}
      <Card className="overflow-hidden">
        <div className="px-5 py-3.5 border-b border-ldg-ink/[0.07] flex items-center justify-between">
          <Label>Today's meals</Label>
          <div className="flex items-center gap-3">
            <Link href="/fitness/meal-history" className="font-mono text-[12px] text-ldg-ink/55 underline underline-offset-2">
              History
            </Link>
            <Link href="/fitness/meal-plan" className="font-mono text-[12px] text-ldg-ink/55 underline underline-offset-2 flex items-center gap-1">
              Full plan <ChevronRight size={12} />
            </Link>
          </div>
        </div>
        {todayMeals.length === 0 ? (
          <div className="px-5 py-6 text-center font-mono text-[12px] text-ldg-ink/55">no meal plan found</div>
        ) : (
          <div className="px-5 divide-y divide-ldg-ink/[0.07]">
            {MEAL_ORDER.map(mt => {
              const meal = todayMeals.find(m => m.mealType === mt)
              if (!meal) return null
              const meta = MEAL_META[mt]
              const logsForMeal = mealLogs.filter(l => l.mealType === mt)
              const isLogging = loggingType === mt
              return (
                <div key={mt} className="py-3">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 text-center w-8">
                      <span className="text-lg">{meta.emoji}</span>
                      <p className="font-mono text-[9px] text-ldg-ink/55 leading-none mt-0.5">{meta.time}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] text-ldg-ink leading-snug">{meal.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="font-mono text-[11px] font-semibold text-ldg-ink">{meal.calories} kcal</span>
                        <span className="font-mono text-[11px] font-semibold text-ldg-ink/55">{meal.protein}g protein</span>
                      </div>

                      {logsForMeal.map(log => (
                        <div key={log.id} className="flex items-start gap-2.5 mt-2 bg-ldg-green/[0.07] border border-ldg-green/20 rounded-xl px-3 py-2 group">
                          <Check size={14} className="text-ldg-green shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-[10px] font-bold uppercase tracking-wide text-ldg-green">You ate</p>
                              {log.calories != null && (
                                <span className="font-mono text-[10px] text-ldg-green">{log.calories} kcal{log.protein != null ? ` · ${log.protein}g` : ''}</span>
                              )}
                            </div>
                            <p className="text-[14px] text-ldg-ink leading-snug">
                              {log.description ? log.description : <em className="not-italic text-ldg-ink/55">Skipped</em>}
                            </p>
                          </div>
                          <button onClick={() => deleteMealLog(log.id)}
                            className="opacity-0 group-hover:opacity-100 text-ldg-ink/55 hover:text-ldg-ink transition-opacity shrink-0">
                            <X size={13} />
                          </button>
                        </div>
                      ))}

                      {isLogging ? (
                        <div className="mt-2 space-y-1.5">
                          <div className="flex gap-1.5">
                            <input
                              autoFocus
                              value={logText}
                              onChange={e => setLogText(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter' && logText.trim()) logMeal(mt, logText.trim()) }}
                              placeholder="What did you eat?"
                              className="flex-1 min-w-0 rounded-lg px-3 py-2 text-[14px] bg-ldg-paper border border-ldg-ink/10 focus:outline-none text-ldg-ink"
                            />
                            <MealPhotoButton
                              onResult={(description, calories, protein) => logMeal(mt, description, { calories, protein })}
                              onError={msg => toast.error(msg)} />
                          </div>
                          <div className="flex gap-2">
                            <SolidBtn onClick={() => logText.trim() && logMeal(mt, logText.trim())}>Save</SolidBtn>
                            <button onClick={() => { setLoggingType(null); setLogText('') }}
                              className="text-[13px] font-medium text-ldg-ink/55 px-2">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => { setLoggingType(mt); setLogText('') }}
                          className="flex items-center gap-1 font-mono text-[11px] font-semibold text-ldg-green hover:underline mt-2">
                          <Plus size={11} /> {logsForMeal.length > 0 ? 'Log another' : 'Log what you ate'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <div className="px-5 py-2.5 bg-ldg-paper flex items-center justify-between border-t border-ldg-ink/[0.07]">
          <span className="font-mono text-[11px] text-ldg-ink/55">Eaten (AI est.) · plan {plannedCal.toLocaleString()}</span>
          <div className="flex items-center gap-4">
            <span className="font-mono text-[12px] font-bold text-ldg-ink">{totalCal} kcal</span>
            <span className="font-mono text-[12px] font-bold text-ldg-ink/55">{totalProt}g protein</span>
          </div>
        </div>
      </Card>

      {/* ── Daily non-negotiables ── */}
      <Card className="overflow-hidden">
        <div className="px-5 py-3.5 border-b border-ldg-ink/[0.07]">
          <Label>Daily non-negotiables</Label>
        </div>
        <div className="px-5 divide-y divide-ldg-ink/[0.07]">
          {[
            { icon: <Footprints size={16} />, label: '10,000 steps', target: 'min daily' },
            { icon: <Droplets size={16} />,   label: '3L water',     target: 'stay hydrated' },
            { icon: <Moon size={16} />,       label: '7.5h sleep',   target: 'lights out 23:30' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3 py-3">
              <span className="text-ldg-ink/55">{item.icon}</span>
              <div className="flex-1">
                <p className="text-[14px] font-medium text-ldg-ink">{item.label}</p>
                <p className="font-mono text-[11px] text-ldg-ink/55">{item.target}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
