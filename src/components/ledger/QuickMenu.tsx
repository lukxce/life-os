'use client'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

export interface QuickAction {
  label: string
  icon: LucideIcon
  href?: string
  onClick?: () => void
}

/** One quick-action popover — mounted from the header "+ New" (desktop) or
 *  the floating FAB (mobile / pages with no bottom bar). Contextual: the
 *  caller passes whichever actions are relevant (a module's own ModuleAction
 *  list, or Home's own set) — nothing here is hardcoded to one module. */
export function QuickMenu({ actions, onClose }: { actions: QuickAction[]; onClose: () => void }) {
  const item = 'flex items-center gap-2.5 px-4 py-3 text-[14px] text-ldg-ink hover:bg-ldg-ink/[0.03] w-full text-left border-b border-ldg-ink/[0.07] last:border-0'
  return (
    <div className="w-52 rounded-xl overflow-hidden bg-ldg-card border border-ldg-ink/10 shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
      {actions.map(a => a.href ? (
        <Link key={a.label} href={a.href} onClick={onClose} className={item}>
          <a.icon size={15} className="text-ldg-green" /> {a.label}
        </Link>
      ) : (
        <button key={a.label} onClick={() => { a.onClick?.(); onClose() }} className={item}>
          <a.icon size={15} className="text-ldg-green" /> {a.label}
        </button>
      ))}
    </div>
  )
}
