'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { StreakBadge } from './StreakBadge'
import { QuantityInput } from './QuantityInput'
import { Check, ChevronDown } from 'lucide-react'

interface SubTask { id: string; name: string; order: number }

interface Habit {
  id: string; name: string; category: string; type: string
  icon?: string | null; color?: string | null; unit?: string | null; target?: number | null
  subTasks?: SubTask[]
}

interface Log {
  id?: string; completed: boolean; value?: number | null; completedSubTaskIds?: string[]
}

interface Props {
  habit: Habit
  log: Log | null
  streak: number
  onToggle: (completed: boolean) => void
  onQuantityUpdate: (value: number) => void
  onSubTask?: (subTaskId: string, checked: boolean) => void
}

export function HabitCard({ habit, log, streak, onToggle, onQuantityUpdate, onSubTask }: Props) {
  const [animating, setAnimating] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const completed = log?.completed ?? false
  const value = log?.value ?? 0
  const accentColor = habit.color ?? 'rgb(var(--l-green))'
  const subTasks = habit.subTasks ?? []
  const completedSubTaskIds = log?.completedSubTaskIds ?? []
  const subDone = completedSubTaskIds.length
  const hasSubTasks = subTasks.length > 0

  function handleToggle() {
    setAnimating(true)
    setTimeout(() => setAnimating(false), 350)
    onToggle(!completed)
  }

  if (habit.type === 'boolean') {
    return (
      <div className={cn(animating && 'habit-check-animate', completed && 'opacity-80')}>
        <button
          onClick={handleToggle}
          className={cn(
            'w-full flex items-center gap-4 px-4 py-3.5 transition-colors duration-150',
            completed
              ? 'bg-ldg-ink/[0.03]'
              : 'active:bg-ldg-ink/[0.03]'
          )}
        >
          {/* Tinted icon circle */}
          <span
            className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0"
            style={{ backgroundColor: accentColor + '22' }}
          >
            {habit.icon ?? '📋'}
          </span>

          {/* Text */}
          <div className="flex-1 text-left min-w-0">
            <p className={cn(
              'text-sm font-medium leading-snug',
              completed ? 'line-through text-ldg-ink/35' : 'text-ldg-ink'
            )}>
              {habit.name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <p className="text-xs text-ldg-ink/55">{habit.category}</p>
              {hasSubTasks && (
                <span className="text-xs text-ldg-ink/55">· {subDone}/{subTasks.length} tasks</span>
              )}
            </div>
          </div>

          {/* Right: streak + expand + checkbox */}
          <div className="flex items-center gap-2 shrink-0">
            <StreakBadge streak={streak} />
            {hasSubTasks && (
              <span
                onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
                className="p-1 rounded-lg hover:bg-ldg-ink/[0.04] text-ldg-ink/55"
              >
                <ChevronDown size={14} className={cn('transition-transform', expanded && 'rotate-180')} />
              </span>
            )}
            <span
              className={cn(
                'w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-all duration-200 shrink-0',
                !completed && 'border-ldg-ink/25'
              )}
              style={completed
                ? { backgroundColor: accentColor, borderColor: accentColor }
                : undefined
              }
            >
              {completed && <Check size={11} strokeWidth={3.5} className="text-white" />}
            </span>
          </div>
        </button>

        {/* Sub-tasks expandable */}
        {hasSubTasks && expanded && (
          <div className="px-4 pb-3 space-y-0.5" onClick={(e) => e.stopPropagation()}>
            {subTasks.map((st) => {
              const stDone = completedSubTaskIds.includes(st.id)
              return (
                <button
                  key={st.id}
                  onClick={() => onSubTask?.(st.id, !stDone)}
                  className="w-full flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-ldg-ink/[0.03] transition-colors"
                >
                  <span
                    className={cn(
                      'w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-150',
                      !stDone && 'border-ldg-ink/25'
                    )}
                    style={stDone
                      ? { backgroundColor: accentColor, borderColor: accentColor }
                      : undefined
                    }
                  >
                    {stDone && <Check size={10} strokeWidth={3.5} className="text-white" />}
                  </span>
                  <span className={cn('text-sm text-left text-ldg-ink', stDone && 'line-through text-ldg-ink/35')}>
                    {st.name}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Quantity habit
  return (
    <div className={cn(
      'px-4 py-3.5 transition-colors duration-150',
      completed && 'opacity-80 bg-ldg-ink/[0.03]'
    )}>
      <div className="flex items-center gap-4">
        <span
          className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0"
          style={{ backgroundColor: accentColor + '22' }}
        >
          {habit.icon ?? '📋'}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <p className="text-sm font-medium text-ldg-ink">{habit.name}</p>
            <p className="text-xs text-ldg-ink/55">{habit.category}</p>
            <StreakBadge streak={streak} />
            {completed && <span className="text-xs font-semibold text-ldg-green">✓</span>}
          </div>
          {habit.target != null && (
            <QuantityInput
              value={value}
              target={habit.target}
              unit={habit.unit ?? ''}
              color={habit.color}
              onUpdate={onQuantityUpdate}
            />
          )}
        </div>
      </div>
    </div>
  )
}
