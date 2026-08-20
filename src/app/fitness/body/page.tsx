'use client'
import { useEffect, useState, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { cn } from '@/lib/utils'
import { Scale, Plus, X } from 'lucide-react'
import { BODY_METRICS as METRICS } from '@/lib/metrics'

interface BodyRow { id: string; date: string; metric: string; value: number }

type MetricKey = string

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
    <div className="bg-surface/90 dark:bg-surface/70 rounded-2xl border border-black/5 dark:border-white/5 overflow-hidden">
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
      {chartData.length >= 2 ? (
        <div className="px-2 pb-4">
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-100 dark:text-gray-800" />
              <XAxis dataKey="label" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis domain={domainPad as [number, number]} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 10, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
                formatter={(v: number) => [`${v} ${cfg.unit}`, cfg.label]} />
              {stats && <ReferenceLine y={stats.latest} stroke={cfg.color} strokeDasharray="4 4" strokeWidth={1} strokeOpacity={0.5} />}
              <Line type="monotone" dataKey="value" stroke={cfg.color} strokeWidth={2.5}
                dot={{ r: 3.5, fill: cfg.color, strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : chartData.length === 1 ? (
        <div className="px-5 pb-4 text-xs text-gray-400">First entry logged — log again next week to see a trend.</div>
      ) : (
        <div className="px-5 pb-5 text-center">
          <p className="text-3xl mb-1.5">{cfg.icon}</p>
          <p className="text-sm text-gray-400">No data yet</p>
        </div>
      )}
      {stats && stats.count >= 2 && (
        <div className="grid grid-cols-3 divide-x divide-black/5 dark:divide-white/5 border-t border-black/5 dark:border-white/5">
          {[{ label: 'Entries', value: String(stats.count) }, { label: 'Min', value: `${stats.min} ${cfg.unit}` }, { label: 'Max', value: `${stats.max} ${cfg.unit}` }].map(s => (
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

interface LogForm { metric: MetricKey; value: string; date: string }

export default function FitnessBodyPage() {
  const [history, setHistory] = useState<BodyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showLog, setShowLog] = useState(false)
  const [form, setForm]       = useState<LogForm>({
    metric: 'weight',
    value: '',
    date: new Date().toISOString().slice(0, 10),
  })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const keys = METRICS.map(m => m.key).join(',')
    const res = await fetch(`/api/life/body-metrics?metrics=${keys}`)
    setHistory(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleLog(e: React.FormEvent) {
    e.preventDefault()
    if (!form.value) return
    setSaving(true)
    await fetch('/api/life/body-metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metric: form.metric, value: +form.value, date: form.date }),
    })
    setSaving(false)
    setShowLog(false)
    setForm(f => ({ ...f, value: '' }))
    load()
  }

  if (loading) return (
    <div className="space-y-4">
      {[1,2,3,4].map(i => <div key={i} className="h-56 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
    </div>
  )

  const weekly  = METRICS.filter(m => m.cadence === 'weekly')
  const monthly = METRICS.filter(m => m.cadence === 'monthly')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Body Metrics</h1>
          <p className="text-sm text-gray-400 mt-0.5">Track weight and measurements</p>
        </div>
        <button onClick={() => setShowLog(true)}
          className="flex items-center gap-1.5 bg-[rgb(var(--l-green))] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[rgb(var(--l-green))] transition-colors">
          <Plus size={15} /> Log
        </button>
      </div>

      {showLog && (
        <div className="bg-surface/90 dark:bg-surface/70 rounded-2xl border border-black/5 dark:border-white/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Scale size={16} className="text-[rgb(var(--l-green))]" /> Log measurement
            </h2>
            <button onClick={() => setShowLog(false)}><X size={16} className="text-gray-400" /></button>
          </div>
          <form onSubmit={handleLog} className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Metric</label>
              <select value={form.metric} onChange={e => setForm(f => ({ ...f, metric: e.target.value as MetricKey }))}
                className="w-full border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm bg-surface dark:bg-surface">
                {METRICS.map(m => <option key={m.key} value={m.key}>{m.label} ({m.unit})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Value</label>
              <input type="number" step="0.1" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                placeholder="0.0" className="w-full border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm bg-surface dark:bg-surface" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm bg-surface dark:bg-surface" />
            </div>
            <div className="col-span-3">
              <button type="submit" disabled={saving}
                className="w-full bg-[rgb(var(--l-green))] text-white rounded-xl py-2 text-sm font-semibold hover:bg-[rgb(var(--l-green))] disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Weekly</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {weekly.map(cfg => <MetricCard key={cfg.key} cfg={cfg} rows={history.filter(r => r.metric === cfg.key)} />)}
        </div>
      </section>
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Monthly</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {monthly.map(cfg => <MetricCard key={cfg.key} cfg={cfg} rows={history.filter(r => r.metric === cfg.key)} />)}
        </div>
      </section>
    </div>
  )
}
