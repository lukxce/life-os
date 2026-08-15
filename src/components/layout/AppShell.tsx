'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Command, X, Plus, Home as HomeIcon } from 'lucide-react'
import { FloatingMascot } from '@/components/ui/FloatingMascot'
import { GlassHeader, GlassHeaderSpacer, GlassSidebar } from './GlassChrome'
import { QuickMenu, QuickAction } from '@/components/ledger/QuickMenu'
import { cn } from '@/lib/utils'

// ── Life OS navigation, v4 (Ledger) ──────────────────────────────────────────
// Fixed header + module nav row (AppHeader) is shared with Home, present on
// every page. Below that: desktop gets a left sidebar for the current
// module's page list; mobile gets a 4-element bottom bar
// [app Home · module Home · (+) contextual · Go] instead of the old
// 5-slot [Apps · tab · (+) · tab · Go] — "Apps" is gone because the header's
// module row already does cross-module switching now.

export interface NavItem      { href: string; label: string; icon: LucideIcon }
export interface NavGroup     { title?: string; items: NavItem[] }
export interface ModuleAction { label: string; icon: LucideIcon; color?: string; href?: string; onClick?: () => void }

export interface ModuleConfig {
  name: string
  icon: LucideIcon
  home: string
  /** Legacy warm-palette classes — unused by the Ledger chrome, kept so
   *  Shell configs don't need editing until their own page content is
   *  reskinned (module-by-module rollout). */
  accentActive: string
  accentText: string
  accentFab: string
  glow?: string
  groups: NavGroup[]        // full page list — desktop sidebar + mobile Go sheet
  tabs: NavItem[]           // legacy — unused by the new bottom bar, kept for now
  actions?: ModuleAction[]  // quick actions → "+ New" (desktop) / center (+) (mobile)
  headerExtra?: React.ReactNode
  contentClassName?: string
  fullBleed?: boolean
}

function useIsActive(home: string) {
  const path = usePathname()
  return (href: string) =>
    href === home ? path === href : path === href || path.startsWith(href + '/')
}

// ── Mobile bottom sheet shell ─────────────────────────────────────────────────
function Sheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-ldg-card rounded-t-3xl px-4 pt-3 pb-28 max-h-[75vh] overflow-y-auto page-in">
        <div className="w-9 h-1 rounded-full bg-ldg-ink/20 mx-auto mb-3" />
        {children}
      </div>
    </>
  )
}

function GoSheet({ config, onClose }: { config: ModuleConfig; onClose: () => void }) {
  const isActive = useIsActive(config.home)
  return (
    <Sheet onClose={onClose}>
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="flex items-center gap-1.5 font-semibold text-ldg-ink text-sm"><config.icon size={16} /> {config.name}</span>
        <button onClick={onClose} className="p-1.5 rounded-full bg-ldg-ink/[0.06]">
          <X size={15} className="text-ldg-ink/55" />
        </button>
      </div>
      <div className="space-y-4">
        {config.groups.map((group, gi) => (
          <div key={group.title ?? gi}>
            {group.title && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-ldg-ink/35 mb-1.5 px-1">
                {group.title}
              </p>
            )}
            <div className="grid grid-cols-3 gap-2">
              {group.items.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} onClick={onClose}
                  className={cn('flex flex-col items-center gap-1.5 p-3 rounded-2xl text-xs font-medium transition-colors text-center leading-tight',
                    isActive(href) ? 'bg-ldg-green/10 text-ldg-green' : 'bg-ldg-ink/[0.04] text-ldg-ink/65')}>
                  <Icon size={20} />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Sheet>
  )
}

// ── Mobile bottom bar: app Home · module Home · (+) contextual · Go ──────────
function BottomBar({ config }: { config: ModuleConfig }) {
  const path = usePathname()
  const [sheet, setSheet] = useState<'go' | 'actions' | null>(null)
  const hasActions = (config.actions?.length ?? 0) > 0
  const isModuleHome = path === config.home

  useEffect(() => { setSheet(null) }, [path])

  return (
    <>
      {sheet === 'go' && <GoSheet config={config} onClose={() => setSheet(null)} />}
      {sheet === 'actions' && config.actions && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setSheet(null)} />
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50">
            <QuickMenu actions={config.actions as QuickAction[]} onClose={() => setSheet(null)} />
          </div>
        </>
      )}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 pb-4 pt-1.5 bg-ldg-card/95 backdrop-blur-xl border-t border-ldg-ink/10">
        <div className="flex items-center">
          <Link href="/" className={cn('flex-1 flex flex-col items-center gap-0.5 py-1.5 transition-colors',
            path === '/' ? 'text-ldg-green' : 'text-ldg-ink/40')}>
            <HomeIcon size={22} strokeWidth={path === '/' ? 2.5 : 1.8} />
            <span className="text-[10px] font-medium">Home</span>
          </Link>

          <Link href={config.home} className={cn('flex-1 flex flex-col items-center gap-0.5 py-1.5 transition-colors',
            isModuleHome ? 'text-ldg-green' : 'text-ldg-ink/40')}>
            <config.icon size={22} strokeWidth={isModuleHome ? 2.5 : 1.8} />
            <span className="text-[10px] font-medium">{config.name}</span>
          </Link>

          {hasActions && (
            <button onClick={() => setSheet(s => s === 'actions' ? null : 'actions')}
              className="flex-1 flex flex-col items-center py-0.5">
              <span className={cn('w-[52px] h-[52px] -mt-6 rounded-full flex items-center justify-center text-white shadow-lg shadow-black/20 transition-all duration-200',
                sheet === 'actions' ? 'bg-ldg-ink rotate-45' : 'bg-ldg-green')}>
                <Plus size={24} strokeWidth={2.5} />
              </span>
            </button>
          )}

          <button onClick={() => setSheet(s => s === 'go' ? null : 'go')}
            className={cn('flex-1 flex flex-col items-center gap-0.5 py-1.5 transition-colors',
              sheet === 'go' ? 'text-ldg-green' : 'text-ldg-ink/40')}>
            <Command size={22} strokeWidth={1.8} />
            <span className="text-[10px] font-medium">Go</span>
          </button>
        </div>
      </nav>
    </>
  )
}

export function AppShell({ config, children }: { config: ModuleConfig; children: React.ReactNode }) {
  const path = usePathname()
  return (
    <div className="min-h-screen bg-ldg-paper text-ldg-ink">
      <GlassHeader actions={(config.actions ?? []) as QuickAction[]} />
      <GlassHeaderSpacer />

      <div className="flex">
        <GlassSidebar config={config} />

        {config.fullBleed ? (
          <main className="flex-1 min-w-0 relative">{children}</main>
        ) : (
          <main className="flex-1 min-w-0">
            <div key={path} className={cn('page-in mx-auto w-full px-4 md:px-6 py-6 pb-32 md:pb-10', config.contentClassName ?? 'max-w-3xl')}>
              {children}
            </div>
          </main>
        )}
      </div>

      <BottomBar config={config} />
      <FloatingMascot />
    </div>
  )
}
