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
  const accentColor = habit.color ?? '#6366f1'
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
              ? 'bg-gray-50 dark:bg-gray-800/30'
              : 'active:bg-gray-50 dark:active:bg-gray-800/20'
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
              completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'
            )}>
              {habit.name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <p className="text-xs text-gray-400">{habit.category}</p>
              {hasSubTasks && (
                <span className="text-xs text-gray-400">· {subDone}/{subTasks.length} tasks</span>
              )}
            </div>
          </div>

          {/* Right: streak + expand + checkbox */}
          <div className="flex items-center gap-2 shrink-0">
            <StreakBadge streak={streak} />
            {hasSubTasks && (
              <span
                onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
              >
                <ChevronDown size={14} className={cn('transition-transform', expanded && 'rotate-180')} />
              </span>
            )}
            <span
              className={cn(
                'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 shrink-0'
              )}
              style={completed
                ? { backgroundColor: accentColor, borderColor: accentColor }
                : { borderColor: '#d1d5db' }
              }
            >
              {completed && <Check size={12} strokeWidth={3} className="text-white" />}
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
                  className="w-full flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <span
                    className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-150'
                    )}
                    style={stDone
                      ? { backgroundColor: accentColor, borderColor: accentColor }
                      : { borderColor: '#d1d5db' }
                    }
                  >
                    {stDone && <Check size={10} strokeWidth={3} className="text-white" />}
                  </span>
                  <span className={cn('text-sm text-left', stDone && 'line-through text-gray-400')}>
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
      completed && 'opacity-80 bg-gray-50/80 dark:bg-gray-800/30'
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
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{habit.name}</p>
            <p className="text-xs text-gray-400">{habit.category}</p>
            <StreakBadge streak={streak} />
            {completed && <span className="text-xs font-semibold text-green-500">✓</span>}
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
