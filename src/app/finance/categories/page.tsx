'use client'
import { useEffect, useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp, Pencil, Check, X } from 'lucide-react'

export default function CategoriesPage() {
  const [personal, setPersonal] = useState<any[]>([])
  const [business, setBusiness] = useState<any[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showForm, setShowForm] = useState<'personal' | 'business' | null>(null)
  const [showSubForm, setShowSubForm] = useState<string | null>(null)
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [editingCatName, setEditingCatName] = useState('')
  const [form, setForm] = useState({ name: '', subcategories: '' })
  const [subForm, setSubForm] = useState('')

  const load = async () => {
    const [p, b] = await Promise.all([
      fetch('/api/finance/categories?type=personal').then(r => r.json()),
      fetch('/api/finance/categories?type=business').then(r => r.json()),
    ])
    setPersonal(p)
    setBusiness(b)
  }

  useEffect(() => { load() }, [])

  const addCategory = async (type: string) => {
    const subs = form.subcategories.split(',').map(s => s.trim()).filter(s => s)
    if (!subs.includes('Other')) subs.push('Other')
    await fetch('/api/finance/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, type, subcategories: subs })
    })
    setShowForm(null)
    setForm({ name: '', subcategories: '' })
    load()
  }

  const addSubcategory = async (cat: any) => {
    if (!subForm.trim()) return
    const updated = [...cat.subcategories]
    if (!updated.includes(subForm)) {
      const otherIdx = updated.indexOf('Other')
      otherIdx > -1 ? updated.splice(otherIdx, 0, subForm) : updated.push(subForm)
    }
    await fetch('/api/finance/categories', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: cat.id, subcategories: updated })
    })
    setShowSubForm(null)
    setSubForm('')
    load()
  }

  const deleteSubcategory = async (cat: any, sub: string) => {
    if (!confirm(`Remove "${sub}" from ${cat.name}? Existing expenses are not affected.`)) return
    const updated = cat.subcategories.filter((s: string) => s !== sub)
    await fetch('/api/finance/categories', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: cat.id, subcategories: updated })
    })
    load()
  }

  const startRename = (cat: any) => {
    setEditingCatId(cat.id)
    setEditingCatName(cat.name)
  }

  const saveRename = async (cat: any) => {
    const newName = editingCatName.trim()
    if (!newName || newName === cat.name) {
      setEditingCatId(null)
      return
    }
    await fetch('/api/finance/categories', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: cat.id, name: newName })
    })
    setEditingCatId(null)
    setEditingCatName('')
    load()
  }

  const deleteCategory = async (id: string) => {
    if (!confirm('Remove this category? Existing expenses are NOT deleted.')) return
    await fetch('/api/finance/categories', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    load()
  }

  const renderList = (list: any[], type: 'personal' | 'business', color: string) => (
    <div className="space-y-3">
      {list.map(cat => (
        <div key={cat.id} className="bg-surface/90 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 gap-2">
            {editingCatId === cat.id ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  autoFocus
                  value={editingCatName}
                  onChange={e => setEditingCatName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') saveRename(cat)
                    if (e.key === 'Escape') setEditingCatId(null)
                  }}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(232,120,90)]"
                />
                <button onClick={() => saveRename(cat)} className="p-1.5 text-green-600 hover:bg-green-50 rounded">
                  <Check size={16} />
                </button>
                <button onClick={() => setEditingCatId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <>
                <button onClick={() => setExpanded(expanded === cat.id ? null : cat.id)}
                  className="flex items-center gap-2 text-left flex-1 min-w-0">
                  <span className="font-medium text-gray-900 truncate">{cat.name}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full whitespace-nowrap">{cat.subcategories.length} subcategories</span>
                  {expanded === cat.id ? <ChevronUp size={14} className="text-gray-400 shrink-0" /> : <ChevronDown size={14} className="text-gray-400 shrink-0" />}
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setShowSubForm(cat.id)}
                    className="text-xs text-[rgb(232,120,90)] hover:text-blue-700 font-medium px-2">+ Sub</button>
                  <button onClick={() => startRename(cat)}
                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => deleteCategory(cat.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">
                    <Trash2 size={14} />
                  </button>
                </div>
              </>
            )}
          </div>

          {expanded === cat.id && (
            <div className="px-4 pb-4 border-t border-gray-100 pt-3">
              <div className="flex flex-wrap gap-2">
                {cat.subcategories.map((sub: string) => (
                  <span key={sub} className={`group inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-${color}-50 text-${color}-700`}>
                    {sub}
                    <button
                      onClick={() => deleteSubcategory(cat, sub)}
                      className="text-gray-400 hover:text-red-600 -mr-1"
                      title={`Remove ${sub}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {showSubForm === cat.id && (
            <div className="px-4 pb-4 border-t border-gray-100 pt-3">
              <div className="flex gap-2">
                <input value={subForm} onChange={e => setSubForm(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addSubcategory(cat) }}
                  placeholder="New subcategory name"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(232,120,90)]" />
                <button onClick={() => addSubcategory(cat)}
                  className="bg-[rgb(232,120,90)] text-white px-3 py-1.5 rounded-lg text-sm font-medium">Add</button>
                <button onClick={() => { setShowSubForm(null); setSubForm('') }}
                  className="border border-gray-300 px-3 py-1.5 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          )}
        </div>
      ))}

      <button onClick={() => setShowForm(type)}
        className={`flex items-center gap-2 w-full border-2 border-dashed border-${color}-200 text-${color}-600 px-4 py-3 rounded-xl text-sm font-medium hover:border-${color}-400 hover:bg-${color}-50 transition-colors`}>
        <Plus size={16} /> Add {type} category
      </button>

      {showForm === type && (
        <div className="bg-surface/90 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm p-4">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500">Category Name</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(232,120,90)]" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Subcategories (comma separated)</label>
              <input value={form.subcategories} onChange={e => setForm(p => ({ ...p, subcategories: e.target.value }))}
                placeholder="e.g. Online, In-store, Other"
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(232,120,90)]" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => addCategory(type)}
                className="bg-[rgb(232,120,90)] text-white px-4 py-2 rounded-lg text-sm font-medium">Save</button>
              <button onClick={() => setShowForm(null)}
                className="border border-gray-300 px-4 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h2 className="text-2xl font-bold text-gray-900">Categories</h2>
      <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Personal Categories</h3>
        {renderList(personal, 'personal', 'red')}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Business Categories</h3>
        {renderList(business, 'business', 'purple')}
      </div>
    </div>
  )
}