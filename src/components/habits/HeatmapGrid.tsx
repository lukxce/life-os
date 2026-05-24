'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface DayData {
  date: string
  completionRate: number
  completed: number
  total: number
}

interface Props {
  data: Map<string, DayData>
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', '']

// Cell size + gap in px — change here to resize everything
const CELL = 16
const GAP = 3

function getColor(rate: number, hasData: boolean): string {
  if (!hasData) return 'bg-gray-200 dark:bg-gray-800'
  if (rate === 0) return 'bg-gray-300 dark:bg-gray-700'
  if (rate < 33) return 'bg-green-200 dark:bg-green-900/80'
  if (rate < 66) return 'bg-green-400 dark:bg-green-700'
  if (rate < 100) return 'bg-green-500 dark:bg-green-600'
  return 'bg-green-600 dark:bg-green-500'
}

export function HeatmapGrid({ data }: Props) {
  const [tooltip, setTooltip] = useState<{ date: string; d: DayData } | null>(null)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(today)
  start.setFullYear(start.getFullYear() - 1)
  start.setDate(start.getDate() - start.getDay()) // align to Sunday

  const weeks: Date[][] = []
  const cursor = new Date(start)
  while (cursor <= today) {
    const week: Date[] = []
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  }

  // Month labels: find first week of each month
  const monthLabels: { label: string; col: number }[] = []
  let lastMonth = -1
  weeks.forEach((week, i) => {
    const m = week[0].getMonth()
    if (m !== lastMonth) {
      monthLabels.push({ label: MONTH_NAMES[m], col: i })
      lastMonth = m
    }
  })

  const stride = CELL + GAP
  const dayLabelWidth = 28

  return (
    <div className="overflow-x-auto pb-2">
      <div className="inline-block" style={{ minWidth: `${dayLabelWidth + weeks.length * stride}px` }}>

        {/* Month labels row */}
        <div className="relative h-5 mb-1" style={{ marginLeft: `${dayLabelWidth}px` }}>
          {monthLabels.map((ml, i) => (
            <span
              key={i}
              className="absolute text-xs text-gray-400 font-medium"
              style={{ left: `${ml.col * stride}px` }}
            >
              {ml.label}
            </span>
          ))}
        </div>

        {/* Grid + day labels */}
        <div className="flex" style={{ gap: `${GAP}px` }}>
          {/* Day labels */}
          <div className="flex flex-col shrink-0" style={{ gap: `${GAP}px`, width: `${dayLabelWidth}px` }}>
            {DAY_LABELS.map((l, i) => (
              <div
                key={i}
                className="text-xs text-gray-400 flex items-center justify-end pr-1.5"
                style={{ height: `${CELL}px` }}
              >
                {l}
              </div>
            ))}
          </div>

          {/* Weeks */}
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col" style={{ gap: `${GAP}px` }}>
              {week.map((day, di) => {
                const dateStr = day.toISOString().split('T')[0]
                const d = data.get(dateStr)
                const isFuture = day > today
                return (
                  <div
                    key={di}
                    className={cn(
                      'rounded cursor-pointer transition-opacity',
                      isFuture
                        ? 'bg-gray-100 dark:bg-gray-900 opacity-20'
                        : getColor(d?.completionRate ?? 0, !!d)
                    )}
                    style={{ width: `${CELL}px`, height: `${CELL}px` }}
                    onMouseEnter={() => d && !isFuture && setTooltip({ date: dateStr, d })}
                    onMouseLeave={() => setTooltip(null)}
                  />
                )
              })}
            </div>
          ))}
        </div>

        {/* Tooltip */}
        <div className="h-7 mt-2" style={{ marginLeft: `${dayLabelWidth}px` }}>
          {tooltip ? (
            <span className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-lg">
              {new Date(tooltip.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              {' · '}
              {tooltip.d.completed}/{tooltip.d.total} habits ({tooltip.d.completionRate}%)
            </span>
          ) : null}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 mt-1" style={{ marginLeft: `${dayLabelWidth}px` }}>
          <span className="text-xs text-gray-400">Less</span>
          {[false, 10, 40, 70, 100].map((r, i) => (
            <div
              key={i}
              className={cn('rounded', getColor(typeof r === 'number' ? r : 0, r !== false))}
              style={{ width: `${CELL}px`, height: `${CELL}px` }}
            />
          ))}
          <span className="text-xs text-gray-400">More</span>
        </div>
      </div>
    </div>
  )
}
