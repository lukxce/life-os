'use client'
import { useEffect, useState } from 'react'

export default function SettingsPage() {
  const [liveRate, setLiveRate] = useState<number | null>(null)
  const [manualRate, setManualRate] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(s => setManualRate(String(s.manualRate ?? 117.5)))
    fetch('/api/finance/rate').then(r => r.json()).then(d => setLiveRate(d.rate ?? null)).catch(() => {})
  }, [])

  const save = async () => {
    setSaving(true)
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manualRate: +manualRate }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h2>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 dark:border-gray-700 p-6 space-y-5">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Currency</h3>

        <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Live EUR/RSD rate</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">From Frankfurter API — display only</p>
          </div>
          <span className="text-lg font-bold text-orange-600">
            {liveRate ? liveRate.toFixed(2) : '—'}
          </span>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Manual rate (RSD per EUR)</label>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 mb-2">Used for all balance calculations and conversions</p>
          <div className="flex gap-3">
            <input
              type="number"
              step="0.01"
              value={manualRate}
              onChange={e => setManualRate(e.target.value)}
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. 117.50"
            />
            <button
              onClick={save}
              disabled={saving}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
            >
              {saved ? 'Saved!' : saving ? 'Saving…' : 'Save'}
            </button>
          </div>
          {liveRate && manualRate && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              Difference from live rate: {((+manualRate / liveRate - 1) * 100).toFixed(2)}%
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
