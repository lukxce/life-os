'use client'
import { useEffect, useState } from 'react'
import { Plus, Trash2, Pencil, TrendingUp, TrendingDown } from 'lucide-react'
import { toast } from 'sonner'

const SUPPORTED_SYMBOLS = ['BTC','ETH','BNB','SOL','XRP','ADA','DOGE','TRX','DOT','MATIC','AVAX','LINK','UNI','LTC','ATOM','USDT','USDC']

const defaultForm = { symbol: 'SOL', quantity: '' }

export default function CryptoPage() {
  const [holdings, setHoldings] = useState<any[]>([])
  const [prices, setPrices] = useState<Record<string, { eur: number; eur_24h_change: number }>>({})
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(defaultForm)

  const load = async () => {
    const h = await fetch('/api/finance/crypto/holdings').then(r => r.json())
    setHoldings(Array.isArray(h) ? h : [])
  }

  const loadPrices = async () => {
    const p = await fetch('/api/finance/crypto/prices').then(r => r.json())
    setPrices(p)
  }

  useEffect(() => { load().then(loadPrices) }, [])

  const submit = async () => {
    const payload = { ...form, quantity: +form.quantity }
    if (editingId) {
      await fetch('/api/finance/crypto/holdings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingId, ...payload }) })
      toast.success('Updated')
    } else {
      await fetch('/api/finance/crypto/holdings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      toast.success('Holding added')
    }
    setShowForm(false); setEditingId(null); setForm(defaultForm); load().then(loadPrices)
  }

  const del = async (id: string) => {
    if (!confirm('Delete?')) return
    await fetch('/api/finance/crypto/holdings', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    toast.success('Deleted'); load().then(loadPrices)
  }

  const startEdit = (h: any) => {
    setEditingId(h.id); setForm({ symbol: h.symbol, quantity: String(h.quantity) }); setShowForm(true)
  }

  const totalEUR = holdings.reduce((s, h) => s + h.quantity * (prices[h.symbol]?.eur ?? 0), 0)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Crypto Holdings</h2>
        <div className="flex gap-2">
          <button onClick={() => { setEditingId(null); setForm(defaultForm); setShowForm(s => !s) }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700">
            <Plus size={16} /> Add Holding
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-5 text-white">
        <p className="text-purple-200 text-sm">Total Portfolio Value</p>
        <p className="text-3xl font-bold mt-1">€{totalEUR.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        <p className="text-purple-200 text-xs mt-1">Prices cached 6h · CoinGecko · auto-synced to wallet</p>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">{editingId ? 'Edit Holding' : 'Add Holding'}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Coin</label>
              <select value={form.symbol} onChange={e => setForm(p => ({ ...p, symbol: e.target.value }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {SUPPORTED_SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Quantity</label>
              <input type="number" step="any" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={submit} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">{editingId ? 'Update' : 'Save'}</button>
            <button onClick={() => { setShowForm(false); setEditingId(null); setForm(defaultForm) }} className="border border-gray-300 dark:border-gray-600 px-5 py-2 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {holdings.length === 0 ? (
          <p className="text-center text-gray-400 dark:text-gray-500 py-12">No holdings yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                {['Coin','Quantity','Price','24h','Value (EUR)',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {holdings.map(h => {
                const price = prices[h.symbol]
                const value = h.quantity * (price?.eur ?? 0)
                const change = price?.eur_24h_change
                return (
                  <tr key={h.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-3 font-bold text-gray-900 dark:text-gray-100">{h.symbol}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{h.quantity.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{price ? `€${price.eur.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` : '—'}</td>
                    <td className="px-4 py-3">
                      {change != null && (
                        <span className={`flex items-center gap-0.5 text-xs font-medium ${change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {Math.abs(change).toFixed(2)}%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-purple-600">€{value.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => startEdit(h)} className="text-gray-400 hover:text-blue-500"><Pencil size={14} /></button>
                        <button onClick={() => del(h.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
