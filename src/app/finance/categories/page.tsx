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

  const renderList = (list: any[], type: 'personal' | 'business') => (
    <div className="space-y-3">
      {list.map(cat => (
        <div key={cat.id} className="bg-ldg-card rounded-2xl border border-ldg-ink/10 shadow-sm overflow-hidden">
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
                  className="flex-1 border border-ldg-ink/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                />
                <button onClick={() => saveRename(cat)} className="p-1.5 text-ldg-green hover:bg-ldg-green/10 rounded">
                  <Check size={16} />
                </button>
                <button onClick={() => setEditingCatId(null)} className="p-1.5 text-ldg-ink/40 hover:bg-ldg-ink/[0.06] rounded">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <>
                <button onClick={() => setExpanded(expanded === cat.id ? null : cat.id)}
                  className="flex items-center gap-2 text-left flex-1 min-w-0">
                  <span className="font-medium text-ldg-ink truncate">{cat.name}</span>
                  <span className="text-xs text-ldg-ink/55 bg-ldg-ink/[0.06] px-2 py-0.5 rounded-full whitespace-nowrap">{cat.subcategories.length} subcategories</span>
                  {expanded === cat.id ? <ChevronUp size={14} className="text-ldg-ink/40 shrink-0" /> : <ChevronDown size={14} className="text-ldg-ink/40 shrink-0" />}
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setShowSubForm(cat.id)}
                    className="text-xs text-ldg-green hover:underline font-medium px-2">+ Sub</button>
                  <button onClick={() => startRename(cat)}
                    className="p-1.5 text-ldg-ink/40 hover:text-ldg-ink/70 hover:bg-ldg-ink/[0.06] rounded">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => deleteCategory(cat.id)}
                    className="p-1.5 text-ldg-ink/40 hover:text-ldg-urgent hover:bg-ldg-urgent/[0.08] rounded">
                    <Trash2 size={14} />
                  </button>
                </div>
              </>
            )}
          </div>

          {expanded === cat.id && (
            <div className="px-4 pb-4 border-t border-ldg-ink/[0.07] pt-3">
              <div className="flex flex-wrap gap-2">
                {cat.subcategories.map((sub: string) => (
                  <span key={sub} className="group inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-ldg-ink/[0.06] text-ldg-ink/70">
                    {sub}
                    <button
                      onClick={() => deleteSubcategory(cat, sub)}
                      className="text-ldg-ink/40 hover:text-ldg-urgent -mr-1"
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
            <div className="px-4 pb-4 border-t border-ldg-ink/[0.07] pt-3">
              <div className="flex gap-2">
                <input value={subForm} onChange={e => setSubForm(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addSubcategory(cat) }}
                  placeholder="New subcategory name"
                  className="flex-1 border border-ldg-ink/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none" />
                <button onClick={() => addSubcategory(cat)}
                  className="bg-ldg-green text-white px-3 py-1.5 rounded-lg text-sm font-medium">Add</button>
                <button onClick={() => { setShowSubForm(null); setSubForm('') }}
                  className="border border-ldg-ink/10 px-3 py-1.5 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          )}
        </div>
      ))}

      <button onClick={() => setShowForm(type)}
        className="flex items-center gap-2 w-full border-2 border-dashed border-ldg-ink/10 text-ldg-ink/55 px-4 py-3 rounded-xl text-sm font-medium hover:border-ldg-green/40 hover:bg-ldg-green/10 hover:text-ldg-green transition-colors">
        <Plus size={16} /> Add {type} category
      </button>

      {showForm === type && (
        <div className="bg-ldg-card rounded-2xl border border-ldg-ink/10 shadow-sm p-4">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-ldg-ink/55">Category Name</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="mt-1 w-full border border-ldg-ink/10 rounded-lg px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-ldg-ink/55">Subcategories (comma separated)</label>
              <input value={form.subcategories} onChange={e => setForm(p => ({ ...p, subcategories: e.target.value }))}
                placeholder="e.g. Online, In-store, Other"
                className="mt-1 w-full border border-ldg-ink/10 rounded-lg px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => addCategory(type)}
                className="bg-ldg-green text-white px-4 py-2 rounded-lg text-sm font-medium">Save</button>
              <button onClick={() => setShowForm(null)}
                className="border border-ldg-ink/10 px-4 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h2 className="text-2xl font-bold text-ldg-ink">Categories</h2>
      <div>
        <h3 className="text-lg font-semibold text-ldg-ink/70 mb-3">Personal Categories</h3>
        {renderList(personal, 'personal')}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-ldg-ink/70 mb-3">Business Categories</h3>
        {renderList(business, 'business')}
      </div>
    </div>
  )
}