'use client'
import { useEffect, useState, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { cn } from '@/lib/utils'

interface BodyRow { id: string; date: string; metric: string; value: number }

const METRICS = [
  { key: 'weight',    label: 'Weight',     unit: 'kg', icon: '⚖️',  color: '#8b5cf6', cadence: 'weekly'  },
  { key: 'waist',     label: 'Waist',      unit: 'cm', icon: '📏',  color: '#3b82f6', cadence: 'weekly'  },
  { key: 'chest',     label: 'Chest',      unit: 'cm', icon: '💪',  color: '#10b981', cadence: 'monthly' },
  { key: 'bicep',     label: 'Bicep',      unit: 'cm', icon: '💪',  color: '#f59e0b', cadence: 'monthly' },
  { key: 'shoulders', label: 'Shoulders',  unit: 'cm', icon: '🏋️', color: '#ef4444', cadence: 'monthly' },
  { key: 'thigh',     label: 'Thigh',      unit: 'cm', icon: '🦵',  color: '#ec4899', cadence: 'monthly' },
] as const

type MetricKey = typeof METRICS[number]['key']

function statLine(rows: BodyRow[]) {
  if (rows.length === 0) return null
  const vals = rows.map(r => r.value)
  const latest = vals.at(-1)!
  const prev   = vals.at(-2) ?? null
  const delta  = prev != null ? Math.round((latest - prev) * 10) / 10 : null
  const min    = Math.min(...vals)
  const max    = Math.max(...vals)
  return { latest, delta, min, max, count: vals.length }
}

function MetricCard({ cfg, rows }: { cfg: typeof METRICS[number]; rows: BodyRow[] }) {
  const stats = statLine(rows)

  const chartData = rows.map(r => ({
    label: new Date(r.date).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short',
      ...(cfg.cadence === 'monthly' ? { year: '2-digit' } : {}),
    }),
    value: r.value,
  }))

  const domainPad = chartData.length > 0
    ? [Math.min(...chartData.map(d => d.value)) * 0.97, Math.max(...chartData.map(d => d.value)) * 1.03]
    : ['auto', 'auto']

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{cfg.icon}</span>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{cfg.label}</h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">{cfg.cadence}</p>
          </div>
        </div>
        {stats && (
          <div className="text-right">
            <p className="text-2xl font-bold" style={{ color: cfg.color }}>
              {stats.latest} <span className="text-sm font-normal text-gray-400">{cfg.unit}</span>
            </p>
            {stats.delta != null && (
              <p className={cn('text-xs font-semibold',
                stats.delta === 0 ? 'text-gray-400'
                  : cfg.key === 'weight'
                    ? stats.delta < 0 ? 'text-green-500' : 'text-red-500'
                    : 'text-gray-500')}>
                {stats.delta > 0 ? '+' : ''}{stats.delta} {cfg.unit} vs prev
              </p>
            )}
          </div>
        )}
      </div>

      {/* Chart */}
      {chartData.length >= 2 ? (
        <div className="px-2 pb-4">
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-100 dark:text-gray-800" />
              <XAxis dataKey="label" tick={{ fontSize: 9 }} tickLine={false} axisLine={false}
                interval="preserveStartEnd" />
              <YAxis domain={domainPad as [number, number]} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 10, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
                formatter={(v: number) => [`${v} ${cfg.unit}`, cfg.label]}
              />
              {stats && (
                <ReferenceLine y={stats.latest} stroke={cfg.color} strokeDasharray="4 4" strokeWidth={1} strokeOpacity={0.5} />
              )}
              <Line
                type="monotone" dataKey="value"
                stroke={cfg.color} strokeWidth={2.5}
                dot={{ r: 3.5, fill: cfg.color, strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : chartData.length === 1 ? (
        <div className="px-5 pb-4 text-xs text-gray-400">
          First entry logged — log again next week to see a trend.
        </div>
      ) : (
        <div className="px-5 pb-5 text-center">
          <p className="text-3xl mb-1.5">{cfg.icon}</p>
          <p className="text-sm text-gray-400">No data yet</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Log from the <span className="text-indigo-500 font-medium">Weekly check-in</span>
          </p>
        </div>
      )}

      {/* Stats footer */}
      {stats && stats.count >= 2 && (
        <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-800 border-t border-gray-100 dark:border-gray-800">
          {[
            { label: 'Entries', value: String(stats.count) },
            { label: 'Min',     value: `${stats.min} ${cfg.unit}` },
            { label: 'Max',     value: `${stats.max} ${cfg.unit}` },
          ].map(s => (
            <div key={s.label} className="py-2.5 text-center">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">{s.label}</p>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function BodyPage() {
  const [history, setHistory] = useState<BodyRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const keys = METRICS.map(m => m.key).join(',')
    const res = await fetch(`/api/life/body-metrics?metrics=${keys}`)
    setHistory(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <div className="space-y-4">
      {[1,2,3,4].map(i => <div key={i} className="h-56 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
    </div>
  )

  const weekly  = METRICS.filter(m => m.cadence === 'weekly')
  const monthly = METRICS.filter(m => m.cadence === 'monthly')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Body Metrics</h1>
        <p className="text-sm text-gray-400 mt-0.5">Log from the Weekly check-in every Sunday</p>
      </div>

      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
          Weekly
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {weekly.map(cfg => (
            <MetricCard
              key={cfg.key}
              cfg={cfg}
              rows={history.filter(r => r.metric === cfg.key)}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
          Monthly
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {monthly.map(cfg => (
            <MetricCard
              key={cfg.key}
              cfg={cfg}
              rows={history.filter(r => r.metric === cfg.key)}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
