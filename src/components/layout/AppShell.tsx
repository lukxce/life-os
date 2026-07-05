'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import type { LucideIcon } from 'lucide-react'
import { LayoutGrid, Command, X } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import { GlobalSearch } from './GlobalSearch'
import { ModuleDock } from './ModuleDock'
import { cn } from '@/lib/utils'

// ── Life OS navigation, v2 ────────────────────────────────────────────────────
// Desktop: dock (modules) + one top bar (identity · page pills · action · search).
//          No sidebars — content gets the full width.
// Mobile:  header + bottom bar [⊞ Apps · context tabs · ⌘ Go]
//          Apps = full module switcher sheet, Go = quick actions + all pages.

export interface NavItem      { href: string; label: string; icon: LucideIcon }
export interface NavGroup     { title?: string; items: NavItem[] }
export interface ModuleAction { label: string; icon: LucideIcon; href?: string; onClick?: () => void }

export interface ModuleConfig {
  name: string
  emoji: string
  home: string
  /** Tailwind literal classes (JIT-safe) for the module accent */
  accentActive: string   // active pill tint (mobile tabs / Go sheet)
  accentText: string
  accentFab: string      // solid accent, e.g. 'bg-blue-600 hover:bg-blue-700'
  glow?: string          // accent as CSS rgb triplet — drives the aurora
  groups: NavGroup[]     // full page list
  tabs: NavItem[]        // mobile bottom-bar tabs (max 3, first = module home)
  actions?: ModuleAction[]  // quick actions — first one surfaces in the top bar
  headerExtra?: React.ReactNode
  contentClassName?: string
  fullBleed?: boolean
}

const APPS = [
  { href: '/',          emoji: '🏠', title: 'Home',      gradient: 'from-gray-500 to-gray-700' },
  { href: '/finance',   emoji: '💰', title: 'Finance',   gradient: 'from-blue-500 to-blue-600' },
  { href: '/life',      emoji: '🧘', title: 'Habits',    gradient: 'from-indigo-500 to-violet-600' },
  { href: '/fitness',   emoji: '💪', title: 'Fitness',   gradient: 'from-green-500 to-emerald-600' },
  { href: '/schedule',  emoji: '📅', title: 'Schedule',  gradient: 'from-sky-400 to-blue-500' },
  { href: '/journal',   emoji: '📓', title: 'Journal',   gradient: 'from-amber-400 to-orange-500' },
  { href: '/food',      emoji: '🗺️', title: 'Food Map',  gradient: 'from-orange-400 to-red-500' },
  { href: '/personal',  emoji: '🗂️', title: 'Personal',  gradient: 'from-teal-400 to-cyan-600' },
  { href: '/watchlist', emoji: '🎬', title: 'Watchlist', gradient: 'from-violet-500 to-purple-600' },
]

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

/** Shared bottom-sheet chrome */
function Sheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl rounded-t-3xl px-4 pt-3 pb-24 max-h-[75vh] overflow-y-auto page-in">
        <div className="w-9 h-1 rounded-full bg-gray-300 dark:bg-gray-600 mx-auto mb-3" />
        {children}
      </div>
    </>
  )
}

/** ⊞ Apps — full module switcher, available from anywhere */
function AppsSheet({ onClose }: { onClose: () => void }) {
  const path = usePathname()
  return (
    <Sheet onClose={onClose}>
      <div className="flex items-center justify-between mb-4 px-1">
        <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Life OS</span>
        <button onClick={onClose} className="p-1.5 rounded-full bg-black/5 dark:bg-white/10">
          <X size={15} className="text-gray-500 dark:text-gray-400" />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-x-2 gap-y-5 pb-2">
        {APPS.map(m => {
          const active = m.href === '/' ? path === '/' : path.startsWith(m.href)
          return (
            <Link key={m.href} href={m.href} onClick={onClose} className="flex flex-col items-center gap-1.5">
              <span className={cn(
                'flex items-center justify-center w-[58px] h-[58px] rounded-[17px] bg-gradient-to-br text-[26px] shadow-md shadow-black/10 active:scale-95 transition-transform',
                m.gradient, active && 'ring-2 ring-white dark:ring-white/60 ring-offset-2 ring-offset-transparent')}>
                {m.emoji}
              </span>
              <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300">{m.title}</span>
            </Link>
          )
        })}
      </div>
    </Sheet>
  )
}

/** ⌘ Go — module quick actions + every page, one sheet */
function GoSheet({ config, onClose }: { config: ModuleConfig; onClose: () => void }) {
  const isActive = useIsActive(config.home)
  return (
    <Sheet onClose={onClose}>
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{config.emoji} {config.name}</span>
        <button onClick={onClose} className="p-1.5 rounded-full bg-black/5 dark:bg-white/10">
          <X size={15} className="text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      {config.actions && config.actions.length > 0 && (
        <div className="mb-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5 px-1">Quick actions</p>
          <div className="grid grid-cols-2 gap-2">
            {config.actions.map(a => {
              const inner = (
                <span className={cn('flex items-center gap-2.5 px-4 py-3.5 rounded-2xl text-sm font-semibold text-white w-full', config.accentFab)}>
                  <a.icon size={18} /> {a.label}
                </span>
              )
              return a.href ? (
                <Link key={a.label} href={a.href} onClick={onClose}>{inner}</Link>
              ) : (
                <button key={a.label} onClick={() => { onClose(); a.onClick?.() }} className="text-left">{inner}</button>
              )
            })}
          </div>
        </div>
      )}

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
    </Sheet>
  )
}

function BottomBar({ config }: { config: ModuleConfig }) {
  const isActive = useIsActive(config.home)
  const [sheet, setSheet] = useState<'apps' | 'go' | null>(null)
  const path = usePathname()

  // Close sheets on navigation
  useEffect(() => { setSheet(null) }, [path])

  return (
    <>
      {sheet === 'apps' && <AppsSheet onClose={() => setSheet(null)} />}
      {sheet === 'go'   && <GoSheet config={config} onClose={() => setSheet(null)} />}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 pb-4 pt-1.5 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-t border-black/5 dark:border-white/5">
        <div className="flex items-center">
          <button onClick={() => setSheet(s => s === 'apps' ? null : 'apps')}
            className={cn('flex-1 flex flex-col items-center gap-0.5 py-1.5 transition-colors',
              sheet === 'apps' ? config.accentText : 'text-gray-400 dark:text-gray-500')}>
            <LayoutGrid size={22} strokeWidth={1.8} />
            <span className="text-[10px] font-medium">Apps</span>
          </button>

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

          <button onClick={() => setSheet(s => s === 'go' ? null : 'go')}
            className={cn('flex-1 flex flex-col items-center gap-0.5 py-1.5 transition-colors',
              sheet === 'go' ? config.accentText : 'text-gray-400 dark:text-gray-500')}>
            <Command size={22} strokeWidth={1.8} />
            <span className="text-[10px] font-medium">Go</span>
          </button>
        </div>
      </nav>
    </>
  )
}

/** Desktop top bar: identity · page pills · primary action · search · theme */
function TopBar({ config }: { config: ModuleConfig }) {
  const isActive = useIsActive(config.home)
  const pages = config.groups.flatMap(g => g.items)
  const primary = config.actions?.[0]

  return (
    <header className="hidden md:flex items-center gap-4 px-5 py-2.5 bg-white/60 dark:bg-white/[0.03] backdrop-blur-2xl border-b border-black/5 dark:border-white/5 shrink-0 z-30">
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-lg">{config.emoji}</span>
        <span className="font-bold text-gray-900 dark:text-white text-sm">{config.name}</span>
      </div>

      <nav className="flex-1 flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {pages.map(({ href, label }) => {
          const active = isActive(href)
          return (
            <Link key={href} href={href}
              className={cn('shrink-0 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all whitespace-nowrap',
                active ? cn('text-white shadow-sm', config.accentFab)
                       : 'text-gray-500 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/10 hover:text-gray-800 dark:hover:text-gray-200')}>
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="flex items-center gap-2 shrink-0">
        {primary && (
          primary.href ? (
            <Link href={primary.href}
              className={cn('flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-semibold text-white transition-colors', config.accentFab)}>
              <primary.icon size={14} /> {primary.label}
            </Link>
          ) : (
            <button onClick={primary.onClick}
              className={cn('flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-semibold text-white transition-colors', config.accentFab)}>
              <primary.icon size={14} /> {primary.label}
            </button>
          )
        )}
        <GlobalSearch />
        <ThemeToggle />
        {config.headerExtra}
      </div>
    </header>
  )
}

export function AppShell({ config, children }: { config: ModuleConfig; children: React.ReactNode }) {
  const path = usePathname()
  return (
    <div className="relative flex h-screen overflow-hidden bg-[#f5f5f7] dark:bg-[#0a0a0f]">
      <Ambient glow={config.glow} />
      <ModuleDock />

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

        <TopBar config={config} />

        {config.fullBleed ? (
          <main className="flex-1 overflow-hidden relative">{children}</main>
        ) : (
          <main className="flex-1 overflow-auto">
            <div key={path} className={cn('page-in mx-auto w-full px-4 md:px-8 py-6 md:py-8 pb-32 md:pb-12', config.contentClassName ?? 'max-w-4xl')}>
              {children}
            </div>
          </main>
        )}
      </div>

      <BottomBar config={config} />
      <GlobalSearch keyboardOnly />
    </div>
  )
}
