'use client'
import { useEffect, useState } from 'react'
import { formatRSD, formatEUR } from '@/lib/utils'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function SummariesPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [income, setIncome] = useState<any[]>([])
  const [personalExp, setPersonalExp] = useState<any[]>([])
  const [businessExp, setBusinessExp] = useState<any[]>([])
  const [categories, setCategories] = useState<any>({ personal: [], business: [] })
  const [rate, setRate] = useState(117.5)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const [inc, pexp, bexp, pcat, bcat, settings] = await Promise.all([
      fetch(`/api/finance/income`).then(r => r.json()),
      fetch(`/api/finance/expenses?type=personal`).then(r => r.json()),
      fetch(`/api/finance/expenses?type=business`).then(r => r.json()),
      fetch(`/api/finance/categories?type=personal`).then(r => r.json()),
      fetch(`/api/finance/categories?type=business`).then(r => r.json()),
      fetch(`/api/settings`).then(r => r.json()),
    ])
    setIncome(inc)
    setPersonalExp(pexp)
    setBusinessExp(bexp)
    setCategories({ personal: pcat, business: bcat })
    setRate(settings?.manualRate ?? 117.5)
    setLoading(false)
  }

  useEffect(() => { load() }, [year])

  const filterYear = (entries: any[]) =>
    entries.filter(e => new Date(e.date).getFullYear() === year)

  const sumByMonth = (entries: any[], key = 'netAmount') =>
    MONTHS.map((_, m) =>
      entries.filter(e => new Date(e.date).getMonth() === m).reduce((s, e) => s + (e[key] ?? 0), 0)
    )

  const sumByCatMonth = (entries: any[], cat: string, key = 'amountRSD') =>
    MONTHS.map((_, m) =>
      entries.filter(e => new Date(e.date).getMonth() === m && e.category === cat).reduce((s, e) => s + (e[key] ?? 0), 0)
    )

  const yearIncome = filterYear(income)
  const yearPersonal = filterYear(personalExp)
  const yearBusiness = filterYear(businessExp)

  const incomeTypes = [
    { label: 'Salary (RSD)', data: sumByMonth(yearIncome.filter(e => e.type === 'Salary' && e.currency === 'RSD')) },
    { label: 'Invoice (RSD)', data: sumByMonth(yearIncome.filter(e => e.type === 'Invoice' && e.currency === 'RSD')) },
    { label: 'Invoice (EUR→RSD)', data: sumByMonth(yearIncome.filter(e => e.type === 'Invoice' && e.currency === 'EUR')).map(v => v * rate) },
    { label: 'Other (RSD)', data: sumByMonth(yearIncome.filter(e => e.type === 'Other' && e.currency === 'RSD')) },
  ]

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-gray-500 animate-pulse">Loading...</div></div>

  // Helper to render a section as table on desktop, cards on mobile
  const renderSection = (title: string, color: string, rows: { label: string; data: number[]; ytdRSD: number; ytdEUR?: number }[], totalRSD: number, totalEUR?: number) => (
    <div className="bg-surface/90 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm overflow-hidden">
      <div className="px-4 md:px-6 py-4 border-b border-gray-200">
        <h3 className={`text-lg font-semibold ${color === 'blue' ? 'text-ldg-ink/55' : color === 'red' ? 'text-red-700' : 'text-ldg-ink/55'}`}>{title}</h3>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className={color === 'blue' ? 'bg-ldg-ink/[0.06]' : color === 'red' ? 'bg-red-50' : 'bg-ldg-ink/[0.06]'}>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-40">Source</th>
              {MONTHS.map(m => <th key={m} className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase">{m}</th>)}
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">YTD (RSD)</th>
              {totalEUR !== undefined && <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">YTD (EUR)</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(row => (
              <tr key={row.label} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-700">{row.label}</td>
                {row.data.map((v, i) => (
                  <td key={i} className="px-2 py-3 text-right text-gray-600">
                    {v > 0 ? (v / 1000).toFixed(1) + 'k' : '-'}
                  </td>
                ))}
                <td className={`px-4 py-3 text-right font-semibold ${color === 'blue' ? 'text-[rgb(var(--l-green))]' : color === 'red' ? 'text-red-600' : 'text-ldg-ink/55'}`}>{formatRSD(row.ytdRSD)}</td>
                {row.ytdEUR !== undefined && <td className="px-4 py-3 text-right text-gray-500">{formatEUR(row.ytdEUR)}</td>}
              </tr>
            ))}
            <tr className={`font-bold ${color === 'blue' ? 'bg-ldg-ink/[0.06]' : color === 'red' ? 'bg-red-50' : 'bg-ldg-ink/[0.06]'}`}>
              <td className={`px-4 py-3 ${color === 'blue' ? 'text-ldg-ink/55' : color === 'red' ? 'text-red-700' : 'text-ldg-ink/55'}`}>TOTAL</td>
              {MONTHS.map((_, i) => {
                const total = rows.reduce((s, r) => s + r.data[i], 0)
                return <td key={i} className={`px-2 py-3 text-right ${color === 'blue' ? 'text-ldg-ink/55' : color === 'red' ? 'text-red-700' : 'text-ldg-ink/55'}`}>{total > 0 ? (total / 1000).toFixed(1) + 'k' : '-'}</td>
              })}
              <td className={`px-4 py-3 text-right ${color === 'blue' ? 'text-ldg-ink/55' : color === 'red' ? 'text-red-700' : 'text-ldg-ink/55'}`}>{formatRSD(totalRSD)}</td>
              {totalEUR !== undefined && <td className={`px-4 py-3 text-right ${color === 'blue' ? 'text-ldg-ink/55' : color === 'red' ? 'text-red-700' : 'text-ldg-ink/55'}`}>{formatEUR(totalEUR)}</td>}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden p-4 space-y-3">
        {rows.map(row => (
          <div key={row.label} className="border border-gray-100 rounded-lg p-3">
            <div className="flex items-baseline justify-between mb-2">
              <span className="font-medium text-gray-700">{row.label}</span>
              <span className={`font-semibold ${color === 'blue' ? 'text-[rgb(var(--l-green))]' : color === 'red' ? 'text-red-600' : 'text-ldg-ink/55'}`}>{formatRSD(row.ytdRSD)}</span>
            </div>
            {row.ytdEUR !== undefined && (
              <div className="text-xs text-gray-500 mb-2">{formatEUR(row.ytdEUR)}</div>
            )}
            <div className="grid grid-cols-6 gap-1 text-xs">
              {row.data.map((v, i) => (
                <div key={i} className="text-center">
                  <div className="text-gray-400 text-[10px]">{MONTHS[i]}</div>
                  <div className={v > 0 ? 'text-gray-700' : 'text-gray-300'}>
                    {v > 0 ? (v / 1000).toFixed(1) + 'k' : '-'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className={`rounded-lg p-3 font-bold ${color === 'blue' ? 'bg-ldg-ink/[0.06] text-ldg-ink/55' : color === 'red' ? 'bg-red-50 text-red-700' : 'bg-ldg-ink/[0.06] text-ldg-ink/55'}`}>
          <div className="flex items-baseline justify-between">
            <span>TOTAL</span>
            <span>{formatRSD(totalRSD)}</span>
          </div>
          {totalEUR !== undefined && <div className="text-xs font-normal text-right opacity-75">{formatEUR(totalEUR)}</div>}
        </div>
      </div>
    </div>
  )

  // Income rows
  const incomeRows = incomeTypes.map(r => ({
    label: r.label,
    data: r.data,
    ytdRSD: r.data.reduce((s, v) => s + v, 0),
  }))
  const incomeTotalRSD = incomeRows.reduce((s, r) => s + r.ytdRSD, 0)

  // Personal expense rows
  const personalRows = categories.personal.map((cat: any) => {
    const data = sumByCatMonth(yearPersonal, cat.name)
    const ytdRSD = data.reduce((s, v) => s + v, 0)
    return { label: cat.name, data, ytdRSD, ytdEUR: ytdRSD / rate }
  }).filter((r: any) => r.ytdRSD > 0)
  const personalTotalRSD = yearPersonal.reduce((s, e) => s + e.amountRSD, 0)

  // Business expense rows
  const businessRows = categories.business.map((cat: any) => {
    const data = sumByCatMonth(yearBusiness, cat.name)
    const ytdRSD = data.reduce((s, v) => s + v, 0)
    return { label: cat.name, data, ytdRSD, ytdEUR: ytdRSD / rate }
  }).filter((r: any) => r.ytdRSD > 0)
  const businessTotalRSD = yearBusiness.reduce((s, e) => s + e.amountRSD, 0)

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-900">Summaries</h2>
        <select value={year} onChange={e => setYear(+e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm self-start">
          {[2024, 2025, 2026, 2027].map(y => <option key={y}>{y}</option>)}
        </select>
      </div>

      {renderSection(`Income ${year}`, 'blue', incomeRows, incomeTotalRSD)}
      {renderSection(`Personal Expenses ${year}`, 'red', personalRows, personalTotalRSD, personalTotalRSD / rate)}
      {renderSection(`Business Expenses ${year}`, 'purple', businessRows, businessTotalRSD, businessTotalRSD / rate)}
    </div>
  )
}