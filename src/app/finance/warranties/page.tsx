'use client'
import { useEffect, useState } from 'react'
import { Shield, FileText } from 'lucide-react'

export default function Page() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [pers, biz] = await Promise.all([
        fetch('/api/finance/expenses?type=personal').then(r => r.json()),
        fetch('/api/finance/expenses?type=business').then(r => r.json()),
      ])
      const all = [...pers, ...biz].filter((e: any) => e.hasWarranty && e.warrantyMonths)

      const enriched = all.map((e: any) => {
        const start = new Date(e.date)
        const end = new Date(start)
        end.setMonth(end.getMonth() + e.warrantyMonths)
        const today = new Date()
        const daysRemaining = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return { ...e, expiresAt: end, daysRemaining }
      }).sort((a, b) => a.daysRemaining - b.daysRemaining)

      setItems(enriched)
      setLoading(false)
    }
    load()
  }, [])

  const fmtDate = (d: Date | string) => new Date(d).toLocaleDateString('sr-RS')

  const statusLabel = (days: number) => {
    if (days < 0) return { text: 'Expired ' + Math.abs(days) + 'd ago', color: 'text-ldg-ink/40 bg-ldg-ink/[0.06]' }
    if (days === 0) return { text: 'Expires today', color: 'text-ldg-urgent bg-ldg-urgent/[0.08]' }
    if (days <= 30) return { text: days + 'd left', color: 'text-ldg-urgent bg-ldg-urgent/[0.08]' }
    if (days <= 90) return { text: days + 'd left', color: 'text-ldg-ink/55 bg-ldg-ink/[0.06]' }
    return { text: days + 'd left', color: 'text-ldg-green bg-ldg-green/10' }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Shield className="text-[rgb(var(--l-green))]" size={24} />
        <h2 className="text-2xl font-bold text-gray-900">Warranties</h2>
        <span className="text-sm text-gray-500">({items.length})</span>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-12">Loading...</p>
      ) : items.length === 0 ? (
        <div className="bg-surface/90 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm p-12 text-center">
          <Shield size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No warranties yet.</p>
          <p className="text-sm text-gray-400 mt-1">Mark expenses with "Has warranty" when you add them.</p>
        </div>
      ) : (
        <div className="bg-surface/90 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm overflow-hidden">
          <ul className="divide-y divide-gray-100">
            {items.map(item => {
              const status = statusLabel(item.daysRemaining)
              return (
                <li key={item.id} className="px-4 py-3 hover:bg-gray-50 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium text-gray-900 truncate">{item.warrantyNotes || item.description || item.merchantName || 'Untitled'}</span>
                      <span className={'text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ' + status.color}>{status.text}</span>
                    </div>
                    <div className="text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
                      <span>{item.merchantName || '-'}</span>
                      <span>Purchased {fmtDate(item.date)}</span>
                      <span>Expires {fmtDate(item.expiresAt)}</span>
                      <span>{item.warrantyMonths} months</span>
                    </div>
                  </div>
                  {item.sufUrl ? <a href={item.sufUrl} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[rgb(var(--l-green))] p-2 rounded hover:bg-ldg-green/10 shrink-0" title="View receipt"><FileText size={16} /></a> : null}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}