'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  LayoutGrid, Command, X, Plus, LayoutDashboard, Wallet, Sparkles,
  Dumbbell, CalendarDays, BookOpen, MapPin, FolderLock, Clapperboard, ChevronLeft,
} from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import { GlobalSearch } from './GlobalSearch'
import { ModuleDock } from './ModuleDock'
import { FloatingMascot } from '@/components/ui/FloatingMascot'
import { cn } from '@/lib/utils'

// ── Life OS navigation, v3 ────────────────────────────────────────────────────
// Desktop: dock (module switching) + sidebar (module pages) + slim header.
// Mobile:  header + bottom bar [⊞ Apps · tab · (+) · tab · ⌘ Go]
//          ⊞ Apps  = full module switcher sheet
//          (+)     = raised center button → the module's quick actions
//          ⌘ Go    = every page in the module

export interface NavItem      { href: string; label: string; icon: LucideIcon }
export interface NavGroup     { title?: string; items: NavItem[] }
export interface ModuleAction { label: string; icon: LucideIcon; color?: string; href?: string; onClick?: () => void }

export interface ModuleConfig {
  name: string
  icon: LucideIcon
  home: string
  /** Tailwind literal classes (JIT-safe) for the module accent */
  accentActive: string
  accentText: string
  accentFab: string
  glow?: string
  groups: NavGroup[]        // full page list — desktop sidebar + mobile Go sheet
  tabs: NavItem[]           // mobile bottom-bar tabs (2 when actions exist, else up to 3)
  actions?: ModuleAction[]  // quick actions → center (+) on mobile, sidebar footer on desktop
  headerExtra?: React.ReactNode
  contentClassName?: string
  fullBleed?: boolean
}

const APPS = [
  { href: '/',          icon: LayoutDashboard, title: 'Dashboard', gradient: 'from-gray-500 to-gray-700' },
  { href: '/finance',   icon: Wallet,          title: 'Finance',   gradient: 'from-[rgb(232,120,90)] to-[rgb(220,161,84)]' },
  { href: '/life',      icon: Sparkles,        title: 'Habits',    gradient: 'from-[rgb(167,120,160)] to-[rgb(217,138,148)]' },
  { href: '/fitness',   icon: Dumbbell,        title: 'Fitness',   gradient: 'from-[rgb(220,161,84)] to-[rgb(232,120,90)]' },
  { href: '/schedule',  icon: CalendarDays,    title: 'Schedule',  gradient: 'from-[rgb(217,138,148)] to-[rgb(167,120,160)]' },
  { href: '/journal',   icon: BookOpen,        title: 'Journal',   gradient: 'from-[rgb(220,161,84)] to-[rgb(217,138,148)]' },
  { href: '/food',      icon: MapPin,          title: 'Food Map',  gradient: 'from-[rgb(232,120,90)] to-[rgb(217,138,148)]' },
  { href: '/personal',  icon: FolderLock,      title: 'Personal',  gradient: 'from-[rgb(167,120,160)] to-[rgb(220,161,84)]' },
  { href: '/watchlist', icon: Clapperboard,    title: 'Watchlist', gradient: 'from-[rgb(217,138,148)] to-[rgb(232,120,90)]' },
]

/** Module-tinted aurora canvas */
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

// ── Desktop sidebar ───────────────────────────────────────────────────────────
function Sidebar({ config }: { config: ModuleConfig }) {
  const isActive = useIsActive(config.home)
  const primary = config.actions?.[0]
  return (
    <aside className="relative z-10 hidden md:flex flex-col w-56 shrink-0 h-screen border-r border-black/5 dark:border-white/5 bg-surface/60 dark:bg-white/[0.03] backdrop-blur-2xl">
      <div className="px-3 pt-4 pb-3">
        <Link href="/"
          className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-sm font-semibold text-ink/70 hover:text-ink hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
          <ChevronLeft size={16} /> Dashboard
        </Link>
        <div className="flex items-center gap-2 mt-3 px-2.5">
          <config.icon size={18} className="text-ink/70" />
          <span className="font-bold text-ink">{config.name}</span>
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
      {primary && (
        <div className="px-3 pb-4 pt-3 border-t border-black/5 dark:border-white/5">
          {primary.href ? (
            <Link href={primary.href}
              className={cn('flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-colors', config.accentFab)}>
              <primary.icon size={16} /> {primary.label}
            </Link>
          ) : (
            <button onClick={primary.onClick}
              className={cn('flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-colors', config.accentFab)}>
              <primary.icon size={16} /> {primary.label}
            </button>
          )}
        </div>
      )}
    </aside>
  )
}

// ── Mobile sheets ─────────────────────────────────────────────────────────────
function Sheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface/90 dark:bg-surface/85 backdrop-blur-2xl rounded-t-3xl px-4 pt-3 pb-28 max-h-[75vh] overflow-y-auto page-in">
        <div className="w-9 h-1 rounded-full bg-gray-300 dark:bg-gray-600 mx-auto mb-3" />
        {children}
      </div>
    </>
  )
}

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
                'flex items-center justify-center w-[58px] h-[58px] rounded-[17px] bg-gradient-to-br shadow-md shadow-black/10 active:scale-95 transition-transform',
                m.gradient, active && 'ring-2 ring-white dark:ring-white/60 ring-offset-2 ring-offset-transparent')}>
                <m.icon size={26} className="text-white" strokeWidth={1.8} />
              </span>
              <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300">{m.title}</span>
            </Link>
          )
        })}
      </div>
    </Sheet>
  )
}

function GoSheet({ config, onClose }: { config: ModuleConfig; onClose: () => void }) {
  const isActive = useIsActive(config.home)
  return (
    <Sheet onClose={onClose}>
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="flex items-center gap-1.5 font-semibold text-ink text-sm"><config.icon size={16} /> {config.name}</span>
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
    </Sheet>
  )
}

// ── Mobile bottom bar with raised center (+) ──────────────────────────────────
function BottomBar({ config }: { config: ModuleConfig }) {
  const isActive = useIsActive(config.home)
  const [sheet, setSheet] = useState<'apps' | 'go' | 'actions' | null>(null)
  const path = usePathname()
  const hasActions = (config.actions?.length ?? 0) > 0

  useEffect(() => { setSheet(null) }, [path])

  const tabs = config.tabs.slice(0, hasActions ? 2 : 3)
  const [leftTab, ...rightTabs] = tabs

  const TabLink = ({ href, label, icon: Icon }: NavItem) => {
    const active = isActive(href)
    return (
      <Link href={href}
        className={cn('flex-1 flex flex-col items-center gap-0.5 py-1.5 transition-colors',
          active ? config.accentText : 'text-gray-400 dark:text-gray-500')}>
        <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
        <span className="text-[10px] font-medium">{label}</span>
      </Link>
    )
  }

  return (
    <>
      {sheet === 'apps' && <AppsSheet onClose={() => setSheet(null)} />}
      {sheet === 'go'   && <GoSheet config={config} onClose={() => setSheet(null)} />}

      {/* Quick-action stack above the (+) */}
      {sheet === 'actions' && config.actions && (
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40" onClick={() => setSheet(null)} />
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3">
            {config.actions.map((a, i) => {
              const inner = (
                <span className="flex items-center gap-3"
                  style={{ animation: 'pageIn 0.18s ease both', animationDelay: `${i * 40}ms` }}>
                  <span className="bg-surface dark:bg-surface text-gray-700 dark:text-gray-200 text-xs font-semibold px-3 py-1.5 rounded-full shadow-md border border-black/5 dark:border-white/10 whitespace-nowrap">
                    {a.label}
                  </span>
                  <span className={cn('w-12 h-12 rounded-full flex items-center justify-center shadow-lg text-white', a.color ?? config.accentFab)}>
                    <a.icon size={20} />
                  </span>
                </span>
              )
              return a.href ? (
                <Link key={a.label} href={a.href} onClick={() => setSheet(null)}>{inner}</Link>
              ) : (
                <button key={a.label} onClick={() => { setSheet(null); a.onClick?.() }}>{inner}</button>
              )
            })}
          </div>
        </>
      )}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 pb-4 pt-1.5 bg-surface/70 dark:bg-surface/60 backdrop-blur-xl border-t border-black/5 dark:border-white/5">
        <div className="flex items-center">
          <button onClick={() => setSheet(s => s === 'apps' ? null : 'apps')}
            className={cn('flex-1 flex flex-col items-center gap-0.5 py-1.5 transition-colors',
              sheet === 'apps' ? config.accentText : 'text-gray-400 dark:text-gray-500')}>
            <LayoutGrid size={22} strokeWidth={1.8} />
            <span className="text-[10px] font-medium">Apps</span>
          </button>

          {leftTab && <TabLink {...leftTab} />}

          {hasActions && (
            <button onClick={() => setSheet(s => s === 'actions' ? null : 'actions')}
              className="flex-1 flex flex-col items-center py-0.5">
              <span className={cn('w-[52px] h-[52px] -mt-6 rounded-full flex items-center justify-center text-white shadow-lg shadow-black/20 transition-all duration-200',
                sheet === 'actions' ? 'bg-gray-800 dark:bg-white dark:text-gray-900 rotate-45' : config.accentFab)}>
                <Plus size={24} strokeWidth={2.5} />
              </span>
            </button>
          )}

          {rightTabs.map(t => <TabLink key={t.href} {...t} />)}

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

export function AppShell({ config, children }: { config: ModuleConfig; children: React.ReactNode }) {
  const path = usePathname()
  return (
    <div className="relative flex h-screen overflow-hidden bg-canvas dark:bg-canvas">
      <Ambient glow={config.glow} />
      <ModuleDock />
      <Sidebar config={config} />

      <div className="relative z-10 flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden bg-surface/70 dark:bg-surface/60 backdrop-blur-xl border-b border-black/5 dark:border-white/5 px-4 py-3 flex items-center justify-between shrink-0 z-30">
          <span className="flex items-center gap-2 font-bold text-ink text-lg"><config.icon size={19} /> {config.name}</span>
          <div className="flex items-center gap-1">
            <GlobalSearch mobileIconOnly />
            <ThemeToggle />
            {config.headerExtra}
          </div>
        </header>

        {/* Desktop header */}
        <header className="hidden md:flex items-center justify-end px-6 py-3 bg-surface/60 dark:bg-white/[0.03] backdrop-blur-2xl border-b border-black/5 dark:border-white/5 gap-2 shrink-0 z-30">
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

      <BottomBar config={config} />
      <FloatingMascot />
      <GlobalSearch keyboardOnly />
    </div>
  )
}
