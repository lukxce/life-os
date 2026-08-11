'use client'
import { useState } from 'react'
import { toast } from 'sonner'

// ── Shared "tell me anything" logic — used by both the Home hero card and
// the floating mascot popup, so there's exactly one parse+save flow to keep
// in sync with what POST /api/blob/command returns.

export type CommandAction =
  | { type: 'expense'; expenseType: 'personal' | 'business'; amount: number; currency: string; merchant: string | null; category: string | null; description: string | null; accountId: string | null; accountName: string | null }
  | { type: 'meal'; mealType: string; description: string; calories: number | null; protein: number | null }
  | { type: 'mealCorrection'; calories: number | null; protein: number | null; description: string | null }
  | { type: 'water'; volumeMl: number }
  | { type: 'habit'; habitId: string; habitName: string }
  | { type: 'task'; text: string }
  | { type: 'weight'; value: number }
  | { type: 'mood'; mood: string; notes: string | null }
  | { type: 'unclear'; originalText: string; reason: string }

type LastLoggedMeal = { id: string; mealType: string; description: string; calories: number | null; protein: number | null }

export function describeCommandAction(a: CommandAction): string {
  switch (a.type) {
    case 'expense': return `${a.amount.toLocaleString()} ${a.currency} · ${a.merchant || a.category || 'expense'}${a.category ? ` (${a.category})` : ''}`
    case 'meal': return `${a.mealType} — ${a.description}${a.calories ? ` (${a.calories} cal)` : ''}`
    case 'mealCorrection': return `Corrected${a.calories != null ? ` — ${a.calories} cal` : ''}${a.protein != null ? ` · ${a.protein}g protein` : ''}${a.description ? ` — ${a.description}` : ''}`
    case 'water': return `${a.volumeMl}ml water`
    case 'habit': return `✓ ${a.habitName}`
    case 'task': return `Task: ${a.text}`
    case 'weight': return `Weight: ${a.value}`
    case 'mood': return `Mood ${a.mood}${a.notes ? ` — ${a.notes}` : ''}`
    case 'unclear': return `Not sure: "${a.originalText}"`
  }
}

function todayStr() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

export function useCommandBox(onSaved?: () => void) {
  const [commandText, setCommandText] = useState('')
  const [commandLoading, setCommandLoading] = useState(false)
  const [commandActions, setCommandActions] = useState<CommandAction[] | null>(null)
  const [commandSaved, setCommandSaved] = useState<Set<number>>(new Set())
  // Remembers the meal just logged through this box (id + values), so a
  // follow-up like "you miscounted, it's 200 calories" can be recognized as
  // a correction to that entry instead of a brand-new, unrelated log.
  const [lastLoggedMeal, setLastLoggedMeal] = useState<LastLoggedMeal | null>(null)

  async function submitCommand() {
    if (!commandText.trim() || commandLoading) return
    setCommandLoading(true)
    setCommandActions(null)
    setCommandSaved(new Set())
    try {
      const n = new Date()
      const res = await fetch('/api/blob/command', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: commandText.trim(), date: todayStr(), hour: n.getHours(), lastLoggedMeal }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const actions: CommandAction[] = data.actions ?? []
      setCommandActions(actions)

      if (actions.length > 0 && actions.every(a => a.type === 'unclear')) {
        toast.error("Didn't catch that — try rephrasing it")
      } else if (actions.length === 1 && actions[0].type !== 'unclear' && !(actions[0].type === 'expense' && !actions[0].accountId)) {
        // A single, unambiguous action doesn't need a manual confirm tap —
        // save it immediately so typing + Enter behaves like a real reply,
        // not a form you have to remember to submit a second time.
        await saveCommandAction(actions[0], 0)
        toast.success(`Logged: ${describeCommandAction(actions[0])}`)
      }
    } catch {
      toast.error("Couldn't parse that — try again")
    } finally {
      setCommandLoading(false)
    }
  }

  async function saveCommandAction(a: CommandAction, idx: number) {
    try {
      let res: Response
      switch (a.type) {
        case 'expense':
          res = await fetch('/api/finance/expenses', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              date: new Date().toISOString(), type: a.expenseType,
              category: a.category || 'Other', description: a.description || a.merchant || null,
              amount: a.amount, currency: a.currency, accountId: a.accountId,
              merchantName: a.merchant || null,
            }),
          })
          break
        case 'meal': {
          res = await fetch('/api/life/meal-log', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              date: todayStr(), mealType: a.mealType, description: a.description,
              ...(a.calories != null && { calories: a.calories }),
              ...(a.protein != null && { protein: a.protein }),
            }),
          })
          if (res.ok) {
            const created = await res.json().catch(() => null)
            if (created?.id) setLastLoggedMeal({ id: created.id, mealType: a.mealType, description: a.description, calories: created.calories ?? a.calories ?? null, protein: created.protein ?? a.protein ?? null })
          }
          break
        }
        case 'mealCorrection': {
          if (!lastLoggedMeal) { toast.error("Nothing to correct — log a meal first"); return }
          res = await fetch('/api/life/meal-log', {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: lastLoggedMeal.id,
              ...(a.calories != null && { calories: a.calories }),
              ...(a.protein != null && { protein: a.protein }),
              ...(a.description != null && { description: a.description }),
            }),
          })
          if (res.ok) {
            setLastLoggedMeal({
              ...lastLoggedMeal,
              calories: a.calories ?? lastLoggedMeal.calories,
              protein: a.protein ?? lastLoggedMeal.protein,
              description: a.description ?? lastLoggedMeal.description,
            })
          }
          break
        }
        case 'water':
          res = await fetch('/api/life/water', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: todayStr(), volumeMl: a.volumeMl }),
          })
          break
        case 'habit':
          res = await fetch('/api/life/logs', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ habitId: a.habitId, date: todayStr() + 'T12:00:00.000Z', completed: true }),
          })
          break
        case 'task':
          res = await fetch('/api/life/tasks', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: todayStr(), text: a.text }),
          })
          break
        case 'weight':
          res = await fetch('/api/life/body-metrics', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ metric: 'weight', value: a.value, date: todayStr() }),
          })
          break
        case 'mood':
          res = await fetch('/api/life/day-log', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: todayStr(), mood: a.mood, notes: a.notes }),
          })
          break
        default:
          return
      }
      if (!res.ok) throw new Error()
      setCommandSaved(prev => new Set(prev).add(idx))
      onSaved?.()
    } catch {
      toast.error("Couldn't save that — try again")
    }
  }

  return {
    commandText, setCommandText, commandLoading, commandActions, commandSaved,
    submitCommand, saveCommandAction,
  }
}
