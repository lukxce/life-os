'use client'
import { useEffect, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Plus, Pencil, Trash2, X, Phone, Search, Linkedin } from 'lucide-react'

interface Contact {
  id: string; name: string; emoji?: string | null; color?: string | null
  birthday?: string | null; reachOutFrequency: string; lastContactDate?: string | null
  note?: string | null; linkedinUrl?: string | null; order: number
}

const FREQ_LABELS: Record<string, { label: string; days: number }> = {
  weekly:    { label: 'Weekly',    days: 7   },
  monthly:   { label: 'Monthly',   days: 30  },
  quarterly: { label: 'Quarterly', days: 90  },
  yearly:    { label: 'Yearly',    days: 365 },
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#3b82f6', '#ef4444', '#f59e0b']
const EMOJIS = ['👤', '👨‍👩‍👧', '👫', '🤝', '💼', '🎓', '❤️', '⭐', '🌟', '🏆']

function daysSince(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

function nextBirthday(birthday: string | null | undefined): { days: number; dateStr: string } | null {
  if (!birthday) return null
  const [m, d] = birthday.split('-').map(Number)
  const now = new Date()
  let next = new Date(now.getFullYear(), m - 1, d)
  if (next < now) next = new Date(now.getFullYear() + 1, m - 1, d)
  const days = Math.ceil((next.getTime() - now.getTime()) / 86400000)
  return { days, dateStr: next.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }
}

function statusInfo(contact: Contact): { label: string; color: string; urgent: boolean } {
  const since = daysSince(contact.lastContactDate)
  const { days } = FREQ_LABELS[contact.reachOutFrequency] ?? FREQ_LABELS.monthly
  if (since === null) return { label: 'Never contacted', color: '#ef4444', urgent: true }
  const overdue = since - days
  if (overdue > 14) return { label: `${since}d ago — overdue`, color: '#ef4444', urgent: true }
  if (overdue > 0)  return { label: `${since}d ago — due soon`, color: '#f59e0b', urgent: false }
  return { label: `${since}d ago`, color: '#10b981', urgent: false }
}

function ContactCard({ contact, onMarkContacted, onEdit, onDelete }: {
  contact: Contact
  onMarkContacted: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const color = contact.color ?? '#6366f1'
  const status = statusInfo(contact)
  const birthday = nextBirthday(contact.birthday)

  return (
    <div className={cn('bg-white dark:bg-gray-900 rounded-2xl border overflow-hidden transition-all', status.urgent ? 'border-red-200 dark:border-red-900/40' : 'border-black/5 dark:border-white/5')}>
      <div className="px-4 py-3.5 flex items-center gap-3">
        <span className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0" style={{ backgroundColor: color + '22' }}>
          {contact.emoji ?? '👤'}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{contact.name}</p>
            {birthday && birthday.days <= 14 && (
              <span className="text-xs bg-pink-50 dark:bg-pink-900/30 text-pink-500 rounded-full px-2 py-0.5 shrink-0">
                🎂 {birthday.days === 0 ? 'Today!' : `${birthday.days}d`}
              </span>
            )}
            {contact.linkedinUrl && (
              <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="text-blue-500 hover:text-blue-700 shrink-0" title="LinkedIn">
                <Linkedin size={13} />
              </a>
            )}
          </div>
          <p className="text-xs mt-0.5" style={{ color: status.color }}>{status.label}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {FREQ_LABELS[contact.reachOutFrequency]?.label ?? 'Monthly'}
            {birthday && <span className="ml-2">· 🎂 {birthday.dateStr}</span>}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={onMarkContacted}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-semibold"
            title="Mark as contacted today">
            <Phone size={12} /> Done
          </button>
          <button onClick={onEdit} className="p-1.5 rounded-xl text-gray-400 hover:text-indigo-500 transition-colors">
            <Pencil size={14} />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-xl text-gray-400 hover:text-red-400 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {contact.note && (
        <div className="px-4 pb-3 -mt-1">
          <p className="text-xs text-gray-400 italic">{contact.note}</p>
        </div>
      )}
    </div>
  )
}

function ContactModal({ contact, onClose, onSave }: {
  contact?: Contact; onClose: () => void; onSave: (data: Partial<Contact>) => void
}) {
  const [name, setName]           = useState(contact?.name ?? '')
  const [emoji, setEmoji]         = useState(contact?.emoji ?? '👤')
  const [color, setColor]         = useState(contact?.color ?? '#6366f1')
  const [birthday, setBirthday]   = useState(contact?.birthday ?? '')
  const [freq, setFreq]           = useState(contact?.reachOutFrequency ?? 'monthly')
  const [note, setNote]           = useState(contact?.note ?? '')
  const [linkedin, setLinkedin]   = useState(contact?.linkedinUrl ?? '')

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold dark:text-white">{contact ? 'Edit contact' : 'Add contact'}</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>

        <input autoFocus type="text" placeholder="Name"
          className="w-full text-sm bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 outline-none border border-black/10 dark:border-white/10 dark:text-white"
          value={name} onChange={e => setName(e.target.value)} />

        <div>
          <label className="text-xs text-gray-400 font-medium mb-1.5 block">Avatar</label>
          <div className="flex flex-wrap gap-2">
            {EMOJIS.map(e => (
              <button key={e} onClick={() => setEmoji(e)}
                className={cn('w-9 h-9 rounded-xl text-lg flex items-center justify-center', emoji === e ? 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'bg-gray-100 dark:bg-gray-800')}>
                {e}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-400 font-medium mb-1.5 block">Color</label>
          <div className="flex gap-2">
            {COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)}
                className={cn('w-7 h-7 rounded-full', color === c && 'ring-2 ring-offset-2 ring-gray-400')}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1.5 block">Birthday (MM-DD)</label>
            <input type="text" placeholder="e.g. 03-15" maxLength={5}
              className="w-full text-sm bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5 outline-none border border-black/10 dark:border-white/10 dark:text-white"
              value={birthday} onChange={e => setBirthday(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1.5 block">Reach out</label>
            <select className="w-full text-sm bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5 outline-none border border-black/10 dark:border-white/10 dark:text-white"
              value={freq} onChange={e => setFreq(e.target.value)}>
              {Object.entries(FREQ_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-400 font-medium mb-1.5 flex items-center gap-1.5 block">
            <Linkedin size={12} /> LinkedIn URL
          </label>
          <input type="url" placeholder="https://linkedin.com/in/username"
            className="w-full text-sm bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-2.5 outline-none border border-black/10 dark:border-white/10 dark:text-white"
            value={linkedin} onChange={e => setLinkedin(e.target.value)} />
        </div>

        <textarea placeholder="Note (optional)" rows={2}
          className="w-full text-sm bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 outline-none border border-black/10 dark:border-white/10 resize-none dark:text-white"
          value={note} onChange={e => setNote(e.target.value)} />

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-600 dark:text-gray-400">Cancel</button>
          <button
            onClick={() => { if (name.trim()) { onSave({ name: name.trim(), emoji, color, birthday: birthday || null, reachOutFrequency: freq, note: note || null, linkedinUrl: linkedin || null }); onClose() } }}
            className="flex-1 py-3 rounded-xl bg-indigo-600 text-sm font-semibold text-white">
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ mode: 'add' } | { mode: 'edit'; contact: Contact } | null>(null)
  const [searchText, setSearchText] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/life/contacts')
    setContacts(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function saveContact(data: Partial<Contact>) {
    if (modal?.mode === 'edit') {
      await fetch(`/api/life/contacts/${modal.contact.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    } else {
      await fetch('/api/life/contacts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    }
    load()
  }

  async function markContacted(id: string) {
    await fetch(`/api/life/contacts/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lastContactDate: new Date().toISOString() }) })
    load()
  }

  async function deleteContact(id: string) {
    await fetch(`/api/life/contacts/${id}`, { method: 'DELETE' })
    setContacts(prev => prev.filter(c => c.id !== id))
  }

  const sorted = [...contacts].sort((a, b) => {
    const sa = statusInfo(a), sb = statusInfo(b)
    if (sa.urgent && !sb.urgent) return -1
    if (!sa.urgent && sb.urgent) return 1
    return 0
  })

  const q = searchText.toLowerCase()
  const displayed = q ? sorted.filter(c => c.name.toLowerCase().includes(q) || c.note?.toLowerCase().includes(q)) : sorted
  const overdue = displayed.filter(c => statusInfo(c).urgent)
  const ok = displayed.filter(c => !statusInfo(c).urgent)

  if (loading) return (
    <div className="max-w-lg mx-auto space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
    </div>
  )

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Contacts</h1>
          <p className="text-sm text-gray-400 mt-0.5">VIP people · {overdue.length} need attention</p>
        </div>
        <button onClick={() => setModal({ mode: 'add' })}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold">
          <Plus size={16} /> Add
        </button>
      </div>

      {contacts.length > 3 && (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input type="text" placeholder="Search…" value={searchText} onChange={e => setSearchText(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-black/10 dark:border-white/10 rounded-2xl pl-8 pr-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:text-white" />
          {searchText && (
            <button onClick={() => setSearchText('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X size={13} /></button>
          )}
        </div>
      )}

      {contacts.length === 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-black/5 dark:border-white/5 p-10 text-center">
          <div className="text-4xl mb-3">👥</div>
          <p className="text-sm font-medium text-gray-500">No contacts yet</p>
          <p className="text-xs mt-1 text-gray-400">Add the people who matter — get nudged when it's time to reach out.</p>
          <button onClick={() => setModal({ mode: 'add' })} className="mt-4 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold">Add first contact</button>
        </div>
      )}

      {overdue.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-red-400 mb-2">Needs attention</h2>
          <div className="space-y-2">
            {overdue.map(c => <ContactCard key={c.id} contact={c} onMarkContacted={() => markContacted(c.id)} onEdit={() => setModal({ mode: 'edit', contact: c })} onDelete={() => deleteContact(c.id)} />)}
          </div>
        </section>
      )}

      {ok.length > 0 && (
        <section>
          {overdue.length > 0 && <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">On track</h2>}
          <div className="space-y-2">
            {ok.map(c => <ContactCard key={c.id} contact={c} onMarkContacted={() => markContacted(c.id)} onEdit={() => setModal({ mode: 'edit', contact: c })} onDelete={() => deleteContact(c.id)} />)}
          </div>
        </section>
      )}

      {modal && (
        <ContactModal contact={modal.mode === 'edit' ? modal.contact : undefined} onClose={() => setModal(null)} onSave={saveContact} />
      )}
    </div>
  )
}
