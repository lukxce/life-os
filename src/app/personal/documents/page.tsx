'use client'
import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { toast } from 'sonner'

interface AdminDocument {
  id: string
  name: string
  category: string
  expiryDate: string | null
  reminderDays: number
  notes: string | null
}

const CATEGORIES = [
  'ID & Travel',
  'Vehicle',
  'Health',
  'Home',
  'Business',
  'Finance',
  'Tech',
  'Other',
]

const CATEGORY_ICONS: Record<string, string> = {
  'ID & Travel': '🛂',
  'Vehicle':     '🚗',
  'Health':      '🏥',
  'Home':        '🏠',
  'Business':    '💼',
  'Finance':     '💳',
  'Tech':        '💻',
  'Other':       '📄',
}

const defaultForm = { name: '', category: 'ID & Travel', expiryDate: '', reminderDays: '30', notes: '' }

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

function statusFor(doc: AdminDocument): { label: string; color: string; bg: string; icon: React.ReactNode } {
  const days = daysUntil(doc.expiryDate)
  if (days === null) return { label: 'No expiry', color: 'text-gray-400', bg: 'bg-gray-50 dark:bg-gray-800', icon: <Clock size={14} className="text-gray-400" /> }
  if (days < 0)    return { label: `Expired ${Math.abs(days)}d ago`, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', icon: <AlertTriangle size={14} className="text-red-500" /> }
  if (days <= doc.reminderDays) return { label: `Expires in ${days}d`, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: <AlertTriangle size={14} className="text-amber-500" /> }
  return { label: `Expires in ${days}d`, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', icon: <CheckCircle size={14} className="text-green-500" /> }
}

function DocModal({ doc, onClose, onSave }: { doc?: AdminDocument; onClose: () => void; onSave: (data: any) => void }) {
  const [form, setForm] = useState(doc ? {
    name: doc.name,
    category: doc.category,
    expiryDate: doc.expiryDate ? new Date(doc.expiryDate).toISOString().split('T')[0] : '',
    reminderDays: String(doc.reminderDays),
    notes: doc.notes ?? '',
  } : defaultForm)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold dark:text-white">{doc ? 'Edit document' : 'Add document'}</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>

        <div>
          <label className="text-xs text-gray-400 font-medium mb-1.5 block">Name</label>
          <input autoFocus type="text" placeholder="e.g. Passport, Car insurance…"
            className="w-full text-sm bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 outline-none border border-black/10 dark:border-white/10 dark:text-white"
            value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
        </div>

        <div>
          <label className="text-xs text-gray-400 font-medium mb-1.5 block">Category</label>
          <select className="w-full text-sm bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 outline-none border border-black/10 dark:border-white/10 dark:text-white"
            value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
            {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1.5 block">Expiry date</label>
            <input type="date"
              className="w-full text-sm bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5 outline-none border border-black/10 dark:border-white/10 dark:text-white"
              value={form.expiryDate} onChange={e => setForm(p => ({ ...p, expiryDate: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1.5 block">Remind me (days before)</label>
            <input type="number" min="1" max="365"
              className="w-full text-sm bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5 outline-none border border-black/10 dark:border-white/10 dark:text-white"
              value={form.reminderDays} onChange={e => setForm(p => ({ ...p, reminderDays: e.target.value }))} />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-400 font-medium mb-1.5 block">Notes (optional)</label>
          <textarea placeholder="Document number, issuing office, renewal link…" rows={2}
            className="w-full text-sm bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 outline-none border border-black/10 dark:border-white/10 resize-none dark:text-white"
            value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-600 dark:text-gray-300">Cancel</button>
          <button
            disabled={!form.name.trim()}
            onClick={() => { if (form.name.trim()) { onSave({ ...form, reminderDays: parseInt(form.reminderDays) || 30, expiryDate: form.expiryDate || null, notes: form.notes || null }); onClose() } }}
            className="flex-1 py-3 rounded-xl bg-indigo-600 text-sm font-semibold text-white disabled:opacity-40">
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<AdminDocument[]>([])
  const [modal, setModal] = useState<{ mode: 'add' } | { mode: 'edit'; doc: AdminDocument } | null>(null)

  const load = () => fetch('/api/personal/documents').then(r => r.json()).then(d => setDocs(Array.isArray(d) ? d : []))
  useEffect(() => { load() }, [])

  const save = async (data: any) => {
    if (modal?.mode === 'edit') {
      await fetch('/api/personal/documents', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: modal.doc.id, ...data }) })
      toast.success('Updated')
    } else {
      await fetch('/api/personal/documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      toast.success('Document added')
    }
    load()
  }

  const del = async (id: string) => {
    if (!confirm('Delete this document?')) return
    await fetch('/api/personal/documents', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    toast.success('Deleted')
    load()
  }

  // Sort: expired first, then soonest expiry, then no expiry at end
  const sorted = [...docs].sort((a, b) => {
    const da = daysUntil(a.expiryDate)
    const db = daysUntil(b.expiryDate)
    if (da === null && db === null) return 0
    if (da === null) return 1
    if (db === null) return -1
    return da - db
  })

  const urgent = sorted.filter(d => { const days = daysUntil(d.expiryDate); return days !== null && days <= d.reminderDays })
  const ok     = sorted.filter(d => { const days = daysUntil(d.expiryDate); return days === null || days > d.reminderDays })

  // Group ok by category
  const grouped = ok.reduce<Record<string, AdminDocument[]>>((acc, d) => {
    if (!acc[d.category]) acc[d.category] = []
    acc[d.category].push(d)
    return acc
  }, {})

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Documents</h1>
          <p className="text-sm text-gray-400 mt-0.5">Expiry dates & renewals · {urgent.length} need attention</p>
        </div>
        <button onClick={() => setModal({ mode: 'add' })}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold">
          <Plus size={16} /> Add
        </button>
      </div>

      {docs.length === 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-black/5 dark:border-white/5 p-12 text-center">
          <div className="text-5xl mb-3">🗂️</div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No documents yet</p>
          <p className="text-xs text-gray-400 mt-1">Track passport, insurance, car registration — anything with an expiry date.</p>
          <button onClick={() => setModal({ mode: 'add' })} className="mt-4 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold">Add first document</button>
        </div>
      )}

      {urgent.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-amber-500 mb-3">Needs attention</h2>
          <div className="space-y-2">
            {urgent.map(doc => {
              const status = statusFor(doc)
              return (
                <div key={doc.id} className={`${status.bg} rounded-2xl border border-amber-200 dark:border-amber-800/40 px-4 py-3.5 flex items-center gap-3`}>
                  <span className="text-2xl shrink-0">{CATEGORY_ICONS[doc.category] ?? '📄'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{doc.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {status.icon}
                      <p className={`text-xs font-medium ${status.color}`}>{status.label}</p>
                    </div>
                    {doc.notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{doc.notes}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setModal({ mode: 'edit', doc })} className="p-1.5 text-gray-400 hover:text-indigo-500"><Pencil size={14} /></button>
                    <button onClick={() => del(doc.id)} className="p-1.5 text-gray-400 hover:text-red-400"><Trash2 size={14} /></button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {Object.entries(grouped).map(([cat, catDocs]) => (
        <section key={cat}>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
            {CATEGORY_ICONS[cat]} {cat}
          </h2>
          <div className="space-y-2">
            {catDocs.map(doc => {
              const status = statusFor(doc)
              return (
                <div key={doc.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-black/5 dark:border-white/5 px-4 py-3.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{doc.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {status.icon}
                      <p className={`text-xs ${status.color}`}>{status.label}</p>
                    </div>
                    {doc.notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{doc.notes}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setModal({ mode: 'edit', doc })} className="p-1.5 text-gray-400 hover:text-indigo-500"><Pencil size={14} /></button>
                    <button onClick={() => del(doc.id)} className="p-1.5 text-gray-400 hover:text-red-400"><Trash2 size={14} /></button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}

      {modal && (
        <DocModal doc={modal.mode === 'edit' ? modal.doc : undefined} onClose={() => setModal(null)} onSave={save} />
      )}
    </div>
  )
}
