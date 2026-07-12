'use client'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { QuickMenu, QuickAction } from './QuickMenu'

/** Floating "+" — only for pages that have no bottom bar (Home). Module
 *  pages get their quick actions from the bottom bar's own center (+)
 *  instead; having both on screen at once would be a redundant "+". */
export function QuickFab({ actions }: { actions: QuickAction[] }) {
  const [open, setOpen] = useState(false)
  if (actions.length === 0) return null
  return (
    <div className="md:hidden fixed bottom-6 right-5 z-50">
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full right-0 mb-3 z-50">
            <QuickMenu actions={actions} onClose={() => setOpen(false)} />
          </div>
        </>
      )}
      <button onClick={() => setOpen(o => !o)} aria-label="Quick actions"
        className={cn('relative z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all',
          open ? 'bg-ldg-ink text-ldg-paper' : 'bg-ldg-green text-white')}
        style={{ boxShadow: '0 6px 20px rgba(0,0,0,0.25)' }}>
        <Plus size={24} strokeWidth={2.5} className={cn('transition-transform duration-200', open && 'rotate-45')} />
      </button>
    </div>
  )
}
