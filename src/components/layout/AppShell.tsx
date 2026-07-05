'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Home, MoreHorizontal, X } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import { GlobalSearch } from './GlobalSearch'
import { ModuleDock } from './ModuleDock'
import { cn } from '@/lib/utils'

// ── One navigation system for every module ───────────────────────────────────
// Desktop: ModuleDock (module switching) + uniform sidebar (module pages)
// Mobile:  uniform header + 5-slot bottom nav [OS · tabs… · More] + optional FAB
// Each module supplies only a config — no bespoke navigation components.

export interface NavItem  { href: string; label: string; icon: LucideIcon }
export interface NavGroup { title?: string; items: NavItem[] }
export interface ModuleFab { label: string; icon: LucideIcon; href?: string; onClick?: () => void }

export interface ModuleConfig {
  name: string
  emoji: string
  home: string
  /** Tailwind literal classes (JIT-safe) for the module accent */
  accentActive: string   // active nav pill, e.g. 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
  accentText: string     // active tab tint, e.g. 'text-blue-600 dark:text-blue-400'
  accentFab: string      // FAB / primary button, e.g. 'bg-blue-600 hover:bg-blue-700'
  glow?: string          // accent as CSS rgb triplet, e.g. '59 130 246' — drives the ambient background
  groups: NavGroup[]     // full page list — desktop sidebar + mobile "More" sheet
  tabs: NavItem[]        // mobile bottom-nav tabs (2–3, first = module home)
  fab?: ModuleFab
  headerExtra?: React.ReactNode
  contentClassName?: string  // main width override, default max-w-3xl
  fullBleed?: boolean        // e.g. Food map: no scroll container, no padding
}

/** Module-tinted aurora canvas — soft accent glow top-left, faint echo bottom-right */
export function Ambient({ glow = '99 102 241' }: { glow?: string }) {
  return (
    <>
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 dark:hidden"
        style={{ background: `radial-gradient(900px 620px at 8% -12%, rgb(${glow} / 0.10), transparent 62%), radial-gradient(760px 540px at 108% 112%, rgb(${glow} / 0.07), transparent 60%)` }} />
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 hidden dark:block"
        style={{ background: `radial-gradient(900px 620px at 8% -12%, rgb(${glow} / 0.16), transparent 62%), radial-gradient(760px 540px at 108% 112%, rgb(${glow} / 0.10), transparent 60%)` }} />
    </>
  )
}

function useIsActive(home: string) {
  const path = usePathname()
  return (href: string) =>
    href === home ? path === href : path === href || path.startsWith(href + '/')
}

function Sidebar({ config }: { config: ModuleConfig }) {
  const isActive = useIsActive(config.home)
  const Fab = config.fab
  return (
    <aside className="relative z-10 hidden md:flex flex-col w-56 shrink-0 h-screen border-r border-black/5 dark:border-white/5 bg-white/60 dark:bg-white/[0.03] backdrop-blur-2xl">
      <div className="px-5 pt-5 pb-3">
        <Link href="/" className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
          <Home size={11} /> Life OS
        </Link>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xl">{config.emoji}</span>
          <span className="font-bold text-gray-900 dark:text-white">{config.name}</span>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {config.groups.map((group, gi) => (
          <div key={group.title ?? gi}>
            {group.title && (
              <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600">
                {group.title}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = isActive(href)
                return (
                  <Link key={href} href={href}
                    className={cn('flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                      active ? config.accentActive
                             : 'text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5')}>
                    <Icon size={17} strokeWidth={active ? 2.5 : 2} />
                    {label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
      {Fab && (
        <div className="px-3 pb-4 pt-3 border-t border-black/5 dark:border-white/5">
          {Fab.href ? (
            <Link href={Fab.href}
              className={cn('flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-colors', config.accentFab)}>
              <Fab.icon size={16} /> {Fab.label}
            </Link>
          ) : (
            <button onClick={Fab.onClick}
              className={cn('flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-colors', config.accentFab)}>
              <Fab.icon size={16} /> {Fab.label}
            </button>
          )}
        </div>
      )}
    </aside>
  )
}

function MoreSheet({ config, onClose }: { config: ModuleConfig; onClose: () => void }) {
  const isActive = useIsActive(config.home)
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-t-3xl px-4 pt-3 pb-24 max-h-[70vh] overflow-y-auto">
        <div className="w-9 h-1 rounded-full bg-gray-300 dark:bg-gray-600 mx-auto mb-3" />
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{config.emoji} {config.name}</span>
          <button onClick={onClose} className="p-1.5 rounded-full bg-black/5 dark:bg-white/10">
            <X size={15} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <div className="space-y-4">
          {config.groups.map((group, gi) => (
            <div key={group.title ?? gi}>
              {group.title && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5 px-1">
                  {group.title}
                </p>
              )}
              <div className="grid grid-cols-3 gap-2">
                {group.items.map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href} onClick={onClose}
                    className={cn('flex flex-col items-center gap-1.5 p-3 rounded-2xl text-xs font-medium transition-colors text-center leading-tight',
                      isActive(href) ? config.accentActive : 'bg-black/5 dark:bg-white/5 text-gray-600 dark:text-gray-300')}>
                    <Icon size={20} />
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function BottomNav({ config }: { config: ModuleConfig }) {
  const isActive = useIsActive(config.home)
  const [more, setMore] = useState(false)
  const tabHrefs = new Set(config.tabs.map(t => t.href))
  const hasMore = config.groups.some(g => g.items.some(i => !tabHrefs.has(i.href)))

  return (
    <>
      {more && <MoreSheet config={config} onClose={() => setMore(false)} />}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 pb-4 pt-1.5 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-t border-black/5 dark:border-white/5">
        <div className="flex items-center">
          {/* OS slot — back to the home screen from any module */}
          <Link href="/" className="flex-1 flex flex-col items-center gap-0.5 py-1.5 text-gray-400 dark:text-gray-500">
            <Home size={22} strokeWidth={1.8} />
            <span className="text-[10px] font-medium">OS</span>
          </Link>

          {config.tabs.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link key={href} href={href}
                className={cn('flex-1 flex flex-col items-center gap-0.5 py-1.5 transition-colors',
                  active ? config.accentText : 'text-gray-400 dark:text-gray-500')}>
                <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            )
          })}

          {hasMore && (
            <button onClick={() => setMore(m => !m)}
              className={cn('flex-1 flex flex-col items-center gap-0.5 py-1.5 transition-colors',
                more ? config.accentText : 'text-gray-400 dark:text-gray-500')}>
              <MoreHorizontal size={22} strokeWidth={1.8} />
              <span className="text-[10px] font-medium">More</span>
            </button>
          )}
        </div>
      </nav>
    </>
  )
}

export function AppShell({ config, children }: { config: ModuleConfig; children: React.ReactNode }) {
  const Fab = config.fab
  const path = usePathname()
  return (
    <div className="relative flex h-screen overflow-hidden bg-[#f5f5f7] dark:bg-[#0a0a0f]">
      <Ambient glow={config.glow} />
      <ModuleDock />
      <Sidebar config={config} />

      <div className="relative z-10 flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-black/5 dark:border-white/5 px-4 py-3 flex items-center justify-between shrink-0 z-30">
          <span className="font-bold text-gray-900 dark:text-white text-lg">{config.emoji} {config.name}</span>
          <div className="flex items-center gap-1">
            <GlobalSearch mobileIconOnly />
            <ThemeToggle />
            {config.headerExtra}
          </div>
        </header>

        {/* Desktop header */}
        <header className="hidden md:flex items-center justify-end px-6 py-3 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-black/5 dark:border-white/5 gap-2 shrink-0 z-30">
          <GlobalSearch />
          <ThemeToggle />
          {config.headerExtra}
        </header>

        {config.fullBleed ? (
          <main className="flex-1 overflow-hidden relative">{children}</main>
        ) : (
          <main className="flex-1 overflow-auto">
            <div key={path} className={cn('page-in mx-auto w-full px-4 md:px-6 py-6 md:py-8 pb-32 md:pb-10', config.contentClassName ?? 'max-w-3xl')}>
              {children}
            </div>
          </main>
        )}
      </div>

      {/* Mobile floating action button */}
      {Fab && (
        Fab.href ? (
          <Link href={Fab.href}
            className={cn('md:hidden fixed right-4 bottom-24 z-30 flex items-center justify-center w-14 h-14 rounded-full text-white shadow-lg shadow-black/20 active:scale-95 transition-all', config.accentFab)}
            title={Fab.label}>
            <Fab.icon size={24} />
          </Link>
        ) : (
          <button onClick={Fab.onClick}
            className={cn('md:hidden fixed right-4 bottom-24 z-30 flex items-center justify-center w-14 h-14 rounded-full text-white shadow-lg shadow-black/20 active:scale-95 transition-all', config.accentFab)}
            title={Fab.label}>
            <Fab.icon size={24} />
          </button>
        )
      )}

      <BottomNav config={config} />
      <GlobalSearch keyboardOnly />
    </div>
  )
}
