'use client'
import { useEffect, useMemo, useRef, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { Plus, Trash2, FileText, Filter, X, Pencil, Camera, Tag } from 'lucide-react'
import { toast } from 'sonner'
import { NumberInput } from '@/components/ui/NumberInput'
import { PullToRefresh } from '@/components/ui/PullToRefresh'

// Suspense wrapper required: useSearchParams() in a page without a Suspense
// boundary causes Next.js 14 production builds to 404 (CSR bailout).
export default function ExpensesPage({ params }: { params: { type: string } }) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400 animate-pulse">Loading…</div>}>
      <ExpensesContent params={params} />
    </Suspense>
  )
}

function ExpensesContent({ params }: { params: { type: string } }) {
  const type = params.type
  const searchParams = useSearchParams()
  const router = useRouter()

  const [entries, setEntries] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [hasHandledScan, setHasHandledScan] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({ category: '', subcategory: '', merchant: '' })

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    category: '', subcategory: '', description: '',
    amount: '', currency: 'RSD', accountId: '',
    vatReclaimable: false, notes: '',
    merchantName: '', merchantPib: '', sufUrl: '',
    hasWarranty: false, warrantyMonths: '', warrantyNotes: '',
    photoUrl: '', tags: [] as string[],
  })
  const [tagInput, setTagInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    try {
      const exp = await fetch(`/api/finance/expenses?type=${type}`).then(r => r.json())
      setEntries(Array.isArray(exp) ? exp : [])
    } catch (e) { console.error('expenses fetch failed', e) }

    try {
      const acc = await fetch('/api/finance/accounts').then(r => r.json())
      setAccounts(Array.isArray(acc) ? acc.filter((a: any) => type === 'personal' ? a.type === 'personal' : a.type === 'company') : [])
    } catch (e) { console.error('accounts fetch failed', e) }

    try {
      const cats = await fetch(`/api/finance/categories?type=${type}`).then(r => r.json())
      setCategories(Array.isArray(cats) ? cats : [])
      setForm(p => p.category ? p : { ...p, category: cats[0]?.name || '' })
    } catch (e) { console.error('categories fetch failed', e) }
  }

  useEffect(() => { load() }, [type])

  useEffect(() => {
    if (hasHandledScan) return
    const merchantName = searchParams.get('merchantName')
    const merchantPib = searchParams.get('merchantPib')
    const sufUrl = searchParams.get('sufUrl')
    const amount = searchParams.get('amount')
    const date = searchParams.get('date')

    if (!merchantName && !merchantPib && !amount) return

    setHasHandledScan(true)
    setForm(p => ({
      ...p,
      merchantName: merchantName || '',
      merchantPib: merchantPib || '',
      sufUrl: sufUrl || '',
      amount: amount || '',
      date: date || p.date,
      description: merchantName || p.description,
    }))
    setShowForm(true)

    if (merchantPib) {
      fetch(`/api/finance/suggest-category?pib=${merchantPib}`)
        .then(r => r.json())
        .then(data => {
          if (data.category) {
            setForm(p => ({ ...p, category: data.category, subcategory: data.subcategory || '' }))
          }
        })
    }

    setTimeout(() => router.replace(`/finance/expenses/${type}`), 100)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, hasHandledScan])

  const selectedCat = categories.find(c => c.name === form.category)
  const subcats = selectedCat?.subcategories ?? []

  const filterCat = categories.find(c => c.name === filters.category)
  const filterSubcats = filterCat?.subcategories ?? []

  // Apply filters
  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      if (filters.category && e.category !== filters.category) return false
      if (filters.subcategory && e.subcategory !== filters.subcategory) return false
      if (filters.merchant) {
        const q = filters.merchant.toLowerCase().trim()
        const name = (e.merchantName || '').toLowerCase()
        const pib = (e.merchantPib || '').toLowerCase()
        const desc = (e.description || '').toLowerCase()
        if (!name.includes(q) && !pib.includes(q) && !desc.includes(q)) return false
      }
      return true
    })
  }, [entries, filters])

  const activeFilterCount = [filters.category, filters.subcategory, filters.merchant].filter(Boolean).length
  const clearFilters = () => setFilters({ category: '', subcategory: '', merchant: '' })

  const defaultForm = {
    date: new Date().toISOString().split('T')[0],
    category: '', subcategory: '', description: '',
    amount: '', currency: 'RSD', accountId: '',
    vatReclaimable: false, notes: '',
    merchantName: '', merchantPib: '', sufUrl: '',
    hasWarranty: false, warrantyMonths: '', warrantyNotes: '',
    photoUrl: '', tags: [] as string[],
  }

  const uploadPhoto = async (file: File) => {
    setUploading(true)
    try {
      const res = await fetch('/api/finance/upload', {
        method: 'POST',
        headers: { 'x-filename': file.name, 'Content-Type': file.type },
        body: file,
      })
      const { url } = await res.json()
      setForm(p => ({ ...p, photoUrl: url }))
      toast.success('Photo uploaded')
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const addTag = () => {
    const t = tagInput.trim()
    if (!t || form.tags.includes(t)) { setTagInput(''); return }
    setForm(p => ({ ...p, tags: [...p.tags, t] }))
    setTagInput('')
  }

  const removeTag = (t: string) => setForm(p => ({ ...p, tags: p.tags.filter(x => x !== t) }))

  const startEdit = (entry: any) => {
    setEditingId(entry.id)
    setForm({
      date: new Date(entry.date).toISOString().split('T')[0],
      category: entry.category || '',
      subcategory: entry.subcategory || '',
      description: entry.description || '',
      amount: String(entry.amount),
      currency: entry.currency,
      accountId: entry.accountId || '',
      vatReclaimable: entry.vatReclaimable ?? false,
      notes: entry.notes || '',
      merchantName: entry.merchantName || '',
      merchantPib: entry.merchantPib || '',
      sufUrl: entry.sufUrl || '',
      hasWarranty: entry.hasWarranty ?? false,
      warrantyMonths: entry.warrantyMonths ? String(entry.warrantyMonths) : '',
      warrantyNotes: entry.warrantyNotes || '',
      photoUrl: entry.photoUrl || '',
      tags: entry.tags || [],
    })
    setShowForm(true)
  }

  const cancel = () => {
    setShowForm(false)
    setEditingId(null)
    setForm({ ...defaultForm, category: categories[0]?.name || '' })
  }

  const submit = async () => {
    const payload = {
      ...form,
      type,
      amount: +form.amount,
      warrantyMonths: form.warrantyMonths ? +form.warrantyMonths : null,
    }
    if (editingId) {
      await fetch('/api/finance/expenses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, ...payload })
      })
    } else {
      await fetch('/api/finance/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
    }
    setShowForm(false)
    setEditingId(null)
    setForm({ ...defaultForm, category: categories[0]?.name || '' })
    toast.success(editingId ? 'Expense updated' : 'Expense saved')
    load()
  }

  const del = async (id: string) => {
    if (!confirm('Delete?')) return
    await fetch('/api/finance/expenses', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    toast.success('Expense deleted')
    load()
  }

  const color = type === 'personal' ? 'red' : 'purple'
  const title = type === 'personal' ? 'Personal Expenses' : 'Business Expenses'

  // Totals from filtered set
  const filteredTotalRSD = filteredEntries.reduce((s, e) => s + (e.amountRSD || 0), 0)

  return (
    <PullToRefresh onRefresh={load}>
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 dark:text-gray-100">{title}</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors ${activeFilterCount > 0 || showFilters ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 dark:border-gray-600 dark:border-gray-600 text-gray-700 dark:text-gray-300 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-800 dark:bg-gray-800'}`}>
            <Filter size={14} />
            <span className="hidden sm:inline">Filter</span>
            {activeFilterCount > 0 && <span className="bg-white text-gray-900 dark:text-gray-100 dark:text-gray-100 text-xs font-bold rounded-full px-1.5 py-0.5 leading-none">{activeFilterCount}</span>}
          </button>
          <button onClick={() => { setEditingId(null); setForm({ ...defaultForm, category: categories[0]?.name || '' }); setShowForm(s => !s) }}
            className={`flex items-center justify-center gap-2 bg-${color}-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-${color}-700`}>
            <Plus size={16} /> Add Expense
          </button>
        </div>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 dark:border-gray-700 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 dark:text-gray-300">Filters</h3>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-red-600 flex items-center gap-1">
                <X size={12} /> Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Category</label>
              <select value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value, subcategory: '' }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All categories</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Subcategory</label>
              <select value={filters.subcategory} onChange={e => setFilters(f => ({ ...f, subcategory: e.target.value }))}
                disabled={!filters.category}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 dark:bg-gray-800 dark:bg-gray-800 disabled:text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">
                <option value="">All subcategories</option>
                {filterSubcats.map((s: string) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Merchant (name, PIB, or description)</label>
              <input type="text" value={filters.merchant} onChange={e => setFilters(f => ({ ...f, merchant: e.target.value }))}
                placeholder="e.g. MAXI, 100000139, milk"
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          {activeFilterCount > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 dark:text-gray-300">
              Showing <strong className="text-gray-900 dark:text-gray-100 dark:text-gray-100">{filteredEntries.length}</strong> of {entries.length} expenses
              · Total <strong className={color === 'red' ? 'text-red-600' : 'text-purple-600'}>{filteredTotalRSD.toLocaleString()} RSD</strong>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 dark:border-gray-700 dark:border-gray-700 p-4 md:p-6">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 dark:text-gray-100 mb-4">{editingId ? 'Edit Expense' : 'New Expense'}</h3>

          {form.merchantName && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm">
              <div className="font-medium text-blue-900">📱 From scanned receipt</div>
              <div className="text-blue-700 mt-1">{form.merchantName} {form.merchantPib && `(PIB: ${form.merchantPib})`}</div>
              {form.sufUrl ? <a href={form.sufUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline mt-1 inline-flex items-center gap-1"><FileText size={12} /> View original receipt</a> : null}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Date</label>
              <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Category</label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value, subcategory: '' }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Subcategory</label>
              <select value={form.subcategory} onChange={e => setForm(p => ({ ...p, subcategory: e.target.value }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select...</option>
                {subcats.map((s: string) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Description</label>
              <input type="text" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Amount</label>
              <NumberInput value={form.amount} onChange={v => setForm(p => ({ ...p, amount: v }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Currency</label>
              <select value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>RSD</option><option>EUR</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Account</label>
              <select value={form.accountId} onChange={e => setForm(p => ({ ...p, accountId: e.target.value }))}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select account</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            {type === 'business' && (
              <div className="flex items-center gap-2 mt-6">
                <input type="checkbox" id="vat" checked={form.vatReclaimable} onChange={e => setForm(p => ({ ...p, vatReclaimable: e.target.checked }))} />
                <label htmlFor="vat" className="text-sm text-gray-600 dark:text-gray-300 dark:text-gray-300">VAT Reclaimable</label>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <input type="checkbox" id="warranty" checked={form.hasWarranty} onChange={e => setForm(p => ({ ...p, hasWarranty: e.target.checked }))} />
              <label htmlFor="warranty" className="text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300">🛡️ Has warranty</label>
            </div>
            {form.hasWarranty && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 block mb-2">Warranty length</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {[6, 12, 24, 36, 60].map(m => (
                      <button key={m} type="button" onClick={() => setForm(p => ({ ...p, warrantyMonths: String(m) }))}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${form.warrantyMonths === String(m) ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 dark:border-gray-600 dark:border-gray-600 text-gray-700 dark:text-gray-300 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-800 dark:bg-gray-800'}`}>
                        {m === 12 ? '1 year' : m === 24 ? '2 years' : m === 36 ? '3 years' : m === 60 ? '5 years' : `${m} months`}
                      </button>
                    ))}
                  </div>
                  <input type="number" value={form.warrantyMonths} onChange={e => setForm(p => ({ ...p, warrantyMonths: e.target.value }))} placeholder="Or type custom months (e.g. 18)"
                    className="w-full border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Warranty notes (item, model, etc.)</label>
                  <input type="text" value={form.warrantyNotes} onChange={e => setForm(p => ({ ...p, warrantyNotes: e.target.value }))} placeholder="e.g. Laptop Lenovo X1"
                    className="mt-1 w-full border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            )}
          </div>

          {/* Photo & Tags */}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1"><Camera size={12} /> Photo / Receipt</label>
              <div className="mt-1 flex items-center gap-2">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(f) }} />
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60">
                  {uploading ? 'Uploading...' : 'Choose photo'}
                </button>
                {form.photoUrl && (
                  <a href={form.photoUrl} target="_blank" rel="noopener noreferrer">
                    <img src={form.photoUrl} alt="receipt" className="h-10 w-10 object-cover rounded border border-gray-200 dark:border-gray-700" />
                  </a>
                )}
                {form.photoUrl && (
                  <button type="button" onClick={() => setForm(p => ({ ...p, photoUrl: '' }))} className="text-gray-400 hover:text-red-500">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1"><Tag size={12} /> Tags</label>
              <div className="mt-1 flex gap-2">
                <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                  placeholder="Add tag, press Enter"
                  className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button type="button" onClick={addTag} className="px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-700">+</button>
              </div>
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.tags.map(t => (
                    <span key={t} className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs px-2 py-0.5 rounded-full">
                      {t}
                      <button type="button" onClick={() => removeTag(t)} className="text-blue-500 hover:text-blue-800 dark:hover:text-blue-100"><X size={10} /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button onClick={submit} className={`flex-1 sm:flex-initial bg-${color}-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-${color}-700`}>{editingId ? 'Update' : 'Save'}</button>
            <button onClick={cancel} className="flex-1 sm:flex-initial border border-gray-300 dark:border-gray-600 dark:border-gray-600 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-800 dark:bg-gray-800">Cancel</button>
          </div>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden md:block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 dark:border-gray-700 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 dark:bg-gray-800 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700 dark:border-gray-700">
            <tr>
              {['Date','Category','Subcategory','Description','Amount','Currency','RSD','Account',''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700 dark:divide-gray-700">
            {filteredEntries.map(e => (
              <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-800 dark:bg-gray-800">
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 dark:text-gray-300">{formatDate(e.date)}</td>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100 dark:text-gray-100">
                  {e.category}
                  {e.hasWarranty && <span title={`${e.warrantyMonths}mo warranty${e.warrantyNotes ? `: ${e.warrantyNotes}` : ''}`} className="ml-1">🛡️</span>}
                  {e.sufUrl ? <a href={e.sufUrl} target="_blank" rel="noopener noreferrer" title="View receipt" className="ml-1">📄</a> : null}
                  {e.photoUrl ? <a href={e.photoUrl} target="_blank" rel="noopener noreferrer" title="View photo" className="ml-1">📷</a> : null}
                  {e.tags?.length > 0 && e.tags.map((t: string) => <span key={t} className="ml-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded-full">{t}</span>)}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">{e.subcategory || '-'}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 dark:text-gray-300">{e.description || e.merchantName || '-'}</td>
                <td className="px-4 py-3 font-medium">{e.amount.toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">{e.currency}</td>
                <td className="px-4 py-3 font-semibold text-red-600">{e.amountRSD.toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 text-xs">{e.account?.name}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => startEdit(e)} className="text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-blue-500"><Pencil size={14} /></button>
                    <button onClick={() => del(e.id)} className="text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredEntries.length === 0 && (
          <p className="text-center text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 py-12">
            {entries.length === 0 ? 'No expenses yet' : 'No expenses match your filters'}
          </p>
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filteredEntries.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 dark:border-gray-700 dark:border-gray-700 p-8 text-center text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">
            {entries.length === 0 ? 'No expenses yet' : 'No expenses match your filters'}
          </div>
        ) : filteredEntries.map(e => (
          <div key={e.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 dark:border-gray-700 dark:border-gray-700 p-4">
            <div className="flex items-start justify-between mb-2 gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                  <span className="font-medium text-gray-900 dark:text-gray-100 dark:text-gray-100">{e.category}</span>
                  {e.subcategory && <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">· {e.subcategory}</span>}
                  {e.hasWarranty && <span title={`${e.warrantyMonths}mo warranty${e.warrantyNotes ? `: ${e.warrantyNotes}` : ''}`}>🛡️</span>}
                  {e.sufUrl ? <a href={e.sufUrl} target="_blank" rel="noopener noreferrer" title="View receipt">📄</a> : null}
                  {e.photoUrl ? <a href={e.photoUrl} target="_blank" rel="noopener noreferrer" title="View photo">📷</a> : null}
                </div>
                {e.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1">
                    {e.tags.map((t: string) => <span key={t} className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded-full">{t}</span>)}
                  </div>
                )}
                <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">{formatDate(e.date)}</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => startEdit(e)} className="text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-blue-500 p-1"><Pencil size={15} /></button>
                <button onClick={() => del(e.id)} className="text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-red-500 -mr-1 -mt-1 p-1"><Trash2 size={16} /></button>
              </div>
            </div>
            <div className="flex items-baseline justify-between mb-2">
              <span className={`text-lg font-bold ${color === 'red' ? 'text-red-600' : 'text-purple-600'}`}>{e.amount.toLocaleString()} {e.currency}</span>
              {e.currency === 'EUR' && <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">{e.amountRSD.toLocaleString()} RSD</span>}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 space-y-0.5">
              {(e.description || e.merchantName) && <div>{e.description || e.merchantName}</div>}
              {e.account?.name && <div>→ <span className="text-gray-700 dark:text-gray-300 dark:text-gray-300">{e.account.name}</span></div>}
            </div>
          </div>
        ))}
      </div>
    </div>
    </PullToRefresh>
  )
}