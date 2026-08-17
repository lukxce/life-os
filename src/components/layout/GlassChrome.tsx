'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import {
  Bell, Moon, Sun, Plus, X, Home as HomeIcon,
  Wallet, Sparkles, Dumbbell, CalendarDays, BookOpen, MapPin, FolderLock, Clapperboard,
} from 'lucide-react'
import type { ModuleConfig, NavGroup } from './AppShell'
import { GlobalSearch } from './GlobalSearch'
import { QuickMenu, QuickAction } from '@/components/ledger/QuickMenu'

// ── Glass chrome — header + rail for every module, plus a mobile menu ───────
// This is the finance-live beta's chrome (floating pill top bar, floating
// icon rail with grouped click flyouts), generalized to run off any module's
// existing ModuleConfig instead of being hand-written per page. Desktop gets
// the vertical rail; mobile gets a single "Menu" button in the header that
// opens a full glass bottom sheet — a horizontal icon row (tried first) kept
// either wrapping into a messy second line or feeling crammed depending on
// how many groups a module had, so mobile gets its own real real estate
// instead of a shrunk-down copy of the desktop rail.

// Icons match each module's own Shell config (Wallet=Finance, Sparkles=Habits, …)
// — hardcoded here since the global nav list is independent of any one
// module's own ModuleConfig (there's no single config with all 8 icons).
const GLOBAL_NAV = [
  { href: '/finance',  label: 'Finance',  icon: Wallet },
  { href: '/life',     label: 'Habits',   icon: Sparkles },
  { href: '/fitness',  label: 'Fitness',  icon: Dumbbell },
  { href: '/schedule', label: 'Schedule', icon: CalendarDays },
]
const GLOBAL_NAV_MORE = [
  { href: '/journal',   label: 'Journal',   icon: BookOpen },
  { href: '/food',      label: 'Food',      icon: MapPin },
  { href: '/personal',  label: 'Personal',  icon: FolderLock },
  { href: '/watchlist', label: 'Watchlist', icon: Clapperboard },
]

// Built from --l-card/--l-ink (the same tokens the plain Card component
// uses: 255 255 255 light / 31 31 35 dark) instead of hardcoded white — a
// fixed white tint on a dark page renders as a flat, muddy gray plate with
// low-contrast text, not glass. This way it's a proper light frosted panel
// in light mode and a proper dark frosted panel in dark mode.
const navGlass: React.CSSProperties = {
  background: 'rgb(var(--l-card) / 0.6)',
  backdropFilter: 'blur(26px) saturate(180%)', WebkitBackdropFilter: 'blur(26px) saturate(180%)',
  border: '1px solid rgb(var(--l-ink) / 0.08)',
  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
}
const flyoutGlass: React.CSSProperties = {
  background: 'rgb(var(--l-card) / 0.94)',
  backdropFilter: 'blur(20px) saturate(160%)', WebkitBackdropFilter: 'blur(20px) saturate(160%)',
  border: '1px solid rgb(var(--l-ink) / 0.1)',
  boxShadow: '0 16px 36px rgba(0,0,0,0.2)',
}

function isPathActive(path: string, href: string) {
  return path === href || path.startsWith(href + '/')
}

// Real root cause of the "stays open a bit then disappears, links
// unclickable" bug: the pill has `backdropFilter` set, and per the CSS
// spec, backdrop-filter (like transform/filter/perspective) creates a new
// containing block for any `position: fixed` descendant. The old
// "full-viewport backdrop div, close on click" pattern rendered that
// backdrop INSIDE the pill — so `inset: 0` resolved to the pill's own small
// box, not the real viewport. On mobile, a delayed/ghost click landing back
// inside that shrunk box (still within the pill, where the trigger button
// lives) closed the menu almost immediately, often before a tap on a link
// below it could register. This sidesteps the whole class of bug: no
// backdrop element, no positioning to get wrong — just a direct check of
// what was actually clicked, straight off the DOM.
function useClickOutside(onClose: () => void, active: boolean) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!active) return
    const handler = (e: Event) => {
      if (ref.current && e.target instanceof Node && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [active, onClose])
  return ref
}

// ── Top bar ───────────────────────────────────────────────────────────────
// `actions` is taken directly (not read off config) — same shape AppHeader
// used — so Home (which has quick actions but no module rail/groups) can
// use this too. `config` is optional for the same reason: when present, the
// mobile sheet also lists that module's own pages, not just the 8 modules.
export function GlassHeader({ actions }: { actions: QuickAction[] }) {
  const path = usePathname()
  const [notifOpen, setNotifOpen] = useState(false)
  const [newOpen, setNewOpen] = useState(false)
  const [moreDesktopOpen, setMoreDesktopOpen] = useState(false)
  const [signals, setSignals] = useState<any>(null)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  useEffect(() => { fetch('/api/finance/signals').then(r => r.json()).then(setSignals).catch(() => {}) }, [])

  const notifItems: { key: string; text: string; href: string; urgent?: boolean }[] = signals ? [
    ...signals.billsDueSoon.map((b: any) => ({
      key: `bill-${b.id}`, href: '/finance/bills', urgent: true,
      text: `${b.name} — ${b.daysUntil < 0 ? `${Math.abs(b.daysUntil)}d overdue` : b.daysUntil === 0 ? 'due today' : `due in ${b.daysUntil}d`}`,
    })),
    ...signals.budgetsNearLimit.map((b: any) => ({
      key: `budget-${b.category}`, href: '/finance/budgets', urgent: b.pct >= 100,
      text: `${b.category} — ${b.pct}% of budget used`,
    })),
    ...signals.renewalsSoon.map((r: any) => ({
      key: `renew-${r.id}`, href: '/finance/subscriptions',
      text: `${r.name} renews ${r.daysUntil === 0 ? 'today' : `in ${r.daysUntil}d`}`,
    })),
    ...signals.warrantiesExpiringSoon.map((w: any) => ({
      key: `warr-${w.id}`, href: '/finance/warranties',
      text: `${w.name} warranty expires in ${w.daysLeft}d`,
    })),
  ] : []

  const moreActive = GLOBAL_NAV_MORE.some(n => isPathActive(path, n.href))
  const moreDesktopRef = useClickOutside(() => setMoreDesktopOpen(false), moreDesktopOpen)
  const notifRef = useClickOutside(() => setNotifOpen(false), notifOpen)
  const newRef = useClickOutside(() => setNewOpen(false), newOpen)

  return (
    <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40, height: 78, display: 'flex', alignItems: 'center', padding: '0 16px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>
        <div style={{ ...navGlass, borderRadius: 999, padding: '9px 12px 9px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, width: '100%' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, textDecoration: 'none', color: 'inherit' }}>
            <div style={{ width: 24, height: 24, borderRadius: 8, background: 'rgb(var(--l-green))' }} />
            <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.08em' }}>LIFE OS</span>
          </Link>

          {/* md+ only — on a real phone width there simply isn't room for
              logo + 4 tabs + 5-6 icon buttons in one pill; trying to keep
              this "always visible, just scroll" squeezed it down to an
              invisible sliver. Mobile instead gets every module inside the
              "Menu" button's bottom sheet — see below. */}
          <div className="hidden md:flex no-scrollbar" style={{ gap: 2, flex: 1, justifyContent: 'center', alignItems: 'center', overflowX: 'auto', minWidth: 0 }}>
            {GLOBAL_NAV.map(n => {
              const active = isPathActive(path, n.href)
              return (
                <Link key={n.href} href={n.href} style={{
                  fontSize: 12.5, fontWeight: 600, padding: '7px 14px', borderRadius: 999, whiteSpace: 'nowrap', textDecoration: 'none', flexShrink: 0,
                  background: active ? 'rgb(var(--l-green) / 0.12)' : 'transparent',
                  color: active ? 'rgb(var(--l-green))' : 'rgb(var(--l-ink) / 0.55)',
                }}>{n.label}</Link>
              )
            })}
            {/* Real "More" menu item in the nav row itself, not just an icon
                tucked away on the right — click-based, same mechanism as
                everything else here now. */}
            <span ref={moreDesktopRef as any} style={{ position: 'relative', flexShrink: 0 }}>
              <button onClick={() => setMoreDesktopOpen(o => !o)} style={{
                fontSize: 12.5, fontWeight: 600, padding: '7px 14px', borderRadius: 999, whiteSpace: 'nowrap', border: 'none', cursor: 'pointer',
                background: moreActive ? 'rgb(var(--l-green) / 0.12)' : 'transparent',
                color: moreActive ? 'rgb(var(--l-green))' : 'rgb(var(--l-ink) / 0.55)',
              }}>More</button>
              {moreDesktopOpen && (
                <div style={{
                  ...flyoutGlass, position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: '100%', marginTop: 10, zIndex: 56,
                  borderRadius: 14, padding: 8, minWidth: 150, display: 'flex', flexDirection: 'column', gap: 1,
                }}>
                  {GLOBAL_NAV_MORE.map(n => (
                    <Link key={n.href} href={n.href} onClick={() => setMoreDesktopOpen(false)} className="glass-flyout-link" style={{
                      fontSize: 13, fontWeight: 600, color: 'rgb(var(--l-ink) / 0.8)', textDecoration: 'none',
                      padding: '7px 10px', borderRadius: 8, whiteSpace: 'nowrap', textAlign: 'center',
                    }}>{n.label}</Link>
                  ))}
                </div>
              )}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <GlobalSearch mobileIconOnly />

            <span ref={notifRef as any} style={{ position: 'relative' }}>
              <button onClick={() => setNotifOpen(o => !o)} style={{
                width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.6)', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
              }}>
                <Bell size={14} color="rgb(var(--l-ink) / 0.55)" />
                {notifItems.length > 0 && (
                  <span style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: '50%', background: 'rgb(var(--l-green))', border: '1.5px solid #fff' }} />
                )}
              </button>
              {notifOpen && (
                <div style={{
                  ...flyoutGlass, position: 'absolute', right: 0, top: '100%', marginTop: 10, zIndex: 56,
                  borderRadius: 14, padding: 8, minWidth: 260, maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 1,
                }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgb(var(--l-ink) / 0.4)', padding: '4px 10px 6px' }}>Notifications</span>
                  {notifItems.length === 0 ? (
                    <span style={{ fontSize: 13, color: 'rgb(var(--l-ink) / 0.5)', padding: '8px 10px' }}>You&apos;re all caught up.</span>
                  ) : notifItems.map(n => (
                    <Link key={n.key} href={n.href} onClick={() => setNotifOpen(false)} style={{
                      fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'block',
                      color: n.urgent ? 'rgb(var(--l-urgent))' : 'rgb(var(--l-ink) / 0.8)',
                      padding: '8px 10px', borderRadius: 8,
                    }}>{n.text}</Link>
                  ))}
                </div>
              )}
            </span>

            {mounted && (
              <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Toggle theme" style={{
                width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.6)', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {theme === 'dark' ? <Sun size={14} color="rgb(var(--l-ink) / 0.55)" /> : <Moon size={14} color="rgb(var(--l-ink) / 0.55)" />}
              </button>
            )}

            {actions.length > 0 && (
              <span ref={newRef as any} className="hidden sm:block" style={{ position: 'relative' }}>
                <button onClick={() => setNewOpen(o => !o)} style={{
                  fontSize: 12.5, fontWeight: 700, color: '#fff', background: newOpen ? 'rgb(var(--l-ink) / 0.85)' : 'rgb(var(--l-ink))',
                  borderRadius: 999, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 5, border: 'none', cursor: 'pointer',
                }}>
                  {newOpen ? <X size={13} /> : <Plus size={13} />} New
                </button>
                {newOpen && (
                  <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 10, zIndex: 56 }}>
                    <QuickMenu actions={actions} onClose={() => setNewOpen(false)} />
                  </div>
                )}
              </span>
            )}

            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgb(var(--l-green))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>LJ</div>
          </div>
        </div>
      </div>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .glass-rail-flyout a:hover, .glass-flyout-link:hover, .glass-tile:hover { background: rgb(var(--l-green) / 0.1); color: rgb(var(--l-green)); }
      `}</style>
    </header>
  )
}

export function GlassHeaderSpacer() {
  return <div style={{ height: 78 }} />
}

// ── Left rail ─────────────────────────────────────────────────────────────
// position:fixed, not sticky — matches the finance-live beta this was
// generalized from, and sidesteps position:sticky's known hit-testing
// quirks for content that overflows the sticky box via position:absolute
// (which is exactly what a flyout does). No longer an in-flow flex sibling,
// so AppShell reserves the same 80px visually via padding on <main> instead.
export function GlassSidebar({ config }: { config: ModuleConfig }) {
  const path = usePathname()
  const isActive = (href: string) => href === config.home ? path === href : isPathActive(path, href)

  return (
    <aside className="hidden md:flex flex-col items-center pt-1 gap-3" style={{ position: 'fixed', left: 18, top: 96, zIndex: 30 }}>
      {config.groups.map((group: NavGroup, gi: number) =>
        group.title
          ? <RailGroup key={group.title} title={group.title} items={group.items} isActive={isActive} />
          : group.items.map(it => (
              <RailLeaf key={it.href} href={it.href} icon={it.icon} label={it.label} active={isActive(it.href)} />
            ))
      )}
    </aside>
  )
}

// href-based tiles are real links (navigate + close); onClick-only tiles
// (an action with no href, e.g. an in-page modal trigger) render as a plain
// button instead of a Link with a fake "#" href. Shared by the full menu
// sheet and the per-group sheets the mobile row opens.
function Tile({ href, label, icon: Icon, active, onClick, onClose }: { href?: string; label: string; icon: any; active?: boolean; onClick?: () => void; onClose: () => void }) {
  const inner = (
    <>
      <span style={{
        width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        ...(active ? { background: 'rgb(var(--l-green))' } : { ...navGlass }),
      }}>
        <Icon size={17} color={active ? '#fff' : 'rgb(var(--l-ink) / 0.6)'} />
      </span>
      <span style={{ fontSize: 11.5, fontWeight: 600, lineHeight: 1.2 }}>{label}</span>
    </>
  )
  const tileStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center',
    padding: '14px 8px', borderRadius: 16, textDecoration: 'none', border: 'none', background: 'transparent', cursor: 'pointer',
    color: active ? 'rgb(var(--l-green))' : 'rgb(var(--l-ink) / 0.75)',
    ...(active ? { background: 'rgb(var(--l-green) / 0.1)' } : {}),
  }
  return href
    ? <Link href={href} onClick={onClick ?? onClose} className="glass-tile" style={tileStyle}>{inner}</Link>
    : <button onClick={() => { onClick?.(); onClose() }} className="glass-tile" style={tileStyle}>{inner}</button>
}

// Bare bottom-sheet shell — backdrop + rounded glass panel + a title, used
// by both the full menu sheet and the per-group sheet the mobile row opens.
function BottomSheet({ title, onClose, children }: { title?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="md:hidden">
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(0,0,0,0.35)' }} />
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 71, maxHeight: '80vh', overflowY: 'auto',
        ...flyoutGlass, borderRadius: '28px 28px 0 0', padding: '10px 16px calc(env(safe-area-inset-bottom, 0px) + 20px)',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgb(var(--l-ink) / 0.15)', margin: '4px auto 14px' }} />
        {title && <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgb(var(--l-ink) / 0.4)', padding: '0 4px 8px' }}>{title}</p>}
        {children}
      </div>
    </div>
  )
}

// ── Mobile dock ───────────────────────────────────────────────────────────
// One floating pill, bottom of the screen, inset from all three edges (not
// a full-width bar) — content is context-dependent, not two separate rows
// stacked on top of each other: on a module page it's THAT module's own
// groups (matching the desktop rail), because you're already there and
// don't need the global switcher cluttering the view; on Home (no config)
// it's the global module switcher instead. Home is always the first icon
// either way, as the one consistent escape hatch back out. Horizontally
// scrollable so it never wraps or crowds regardless of how many icons.
// Tapping a grouped icon opens a small bottom sheet for just that group
// instead of a small anchored dropdown — deliberate: a dropdown positioned
// off an icon inside a horizontally scrolling row is exactly the kind of
// overflow/positioning problem that caused real bugs earlier in this rework
// (overflow-x:auto silently forces overflow-y:auto too, clipping anything
// that opens outside the row's own box) — a sheet rendered as a sibling of
// the row sidesteps that outright.
export function GlassMobileDock({ config, actions = [] }: { config?: ModuleConfig; actions?: QuickAction[] }) {
  const path = usePathname()
  const isHome = path === '/'
  const isActive = (href: string) => config && href === config.home ? path === href : isPathActive(path, href)
  const [openGroup, setOpenGroup] = useState<NavGroup | null>(null)
  const [actionsOpen, setActionsOpen] = useState(false)

  return (
    <>
      <div className="md:hidden" style={{
        position: 'fixed', left: 16, right: 16, bottom: 16, zIndex: 50,
        display: 'flex', justifyContent: 'center',
      }}>
        <div className="no-scrollbar" style={{
          ...navGlass, borderRadius: 999, padding: '8px 10px', maxWidth: '100%',
          display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto',
        }}>
          <Link href="/" title="Home" style={{
            width: 42, height: 42, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, textDecoration: 'none',
            ...(isHome ? { background: 'rgb(var(--l-green))', boxShadow: '0 4px 14px rgba(46,125,79,0.35)' } : {}),
          }}>
            <HomeIcon size={16} color={isHome ? '#fff' : 'rgb(var(--l-ink) / 0.6)'} />
          </Link>
          <div style={{ width: 1, height: 24, background: 'rgb(var(--l-ink) / 0.1)', flexShrink: 0 }} />

          {config ? config.groups.map((group: NavGroup, gi: number) =>
            group.title ? (
              <button key={group.title} onClick={() => setOpenGroup(group)} title={group.title} style={{
                width: 42, height: 42, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                border: 'none', cursor: 'pointer',
                ...(group.items.some(it => isActive(it.href)) ? { background: 'rgb(var(--l-green) / 0.16)', border: '1px solid rgb(var(--l-green) / 0.3)' } : {}),
              }}>
                {(() => { const Icon = group.items[0].icon; return <Icon size={16} color={group.items.some(it => isActive(it.href)) ? 'rgb(var(--l-green))' : 'rgb(var(--l-ink) / 0.6)'} /> })()}
              </button>
            ) : group.items.map(it => (
              <RailLeaf key={it.href} href={it.href} icon={it.icon} label={it.label} active={isActive(it.href)} />
            ))
          ) : [...GLOBAL_NAV, ...GLOBAL_NAV_MORE].map(n => {
            const active = isPathActive(path, n.href)
            const Icon = n.icon
            return (
              <Link key={n.href} href={n.href} title={n.label} style={{
                width: 42, height: 42, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, textDecoration: 'none',
                ...(active ? { background: 'rgb(var(--l-green))', boxShadow: '0 4px 14px rgba(46,125,79,0.35)' } : {}),
              }}>
                <Icon size={16} color={active ? '#fff' : 'rgb(var(--l-ink) / 0.6)'} />
              </Link>
            )
          })}

          {actions.length > 0 && (
            <button onClick={() => setActionsOpen(true)} title="New" style={{
              width: 42, height: 42, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              border: 'none', cursor: 'pointer', background: 'rgb(var(--l-ink))', color: '#fff',
            }}>
              <Plus size={16} />
            </button>
          )}
        </div>
      </div>

      {openGroup && (
        <BottomSheet title={openGroup.title} onClose={() => setOpenGroup(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
            {openGroup.items.map(it => (
              <Tile key={it.href} href={it.href} label={it.label} icon={it.icon} active={isActive(it.href)} onClose={() => setOpenGroup(null)} />
            ))}
          </div>
        </BottomSheet>
      )}

      {actionsOpen && (
        <BottomSheet title="Quick actions" onClose={() => setActionsOpen(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
            {actions.map(a => (
              <Tile key={a.label} href={a.href} label={a.label} icon={a.icon} onClick={a.onClick} onClose={() => setActionsOpen(false)} />
            ))}
          </div>
        </BottomSheet>
      )}
    </>
  )
}

function RailLeaf({ href, icon: Icon, label, active }: { href: string; icon: any; label: string; active: boolean }) {
  return (
    <Link href={href} title={label} className="group" style={{
      width: 42, height: 42, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', textDecoration: 'none', flexShrink: 0,
      ...(active ? { background: 'rgb(var(--l-green))', boxShadow: '0 4px 14px rgba(46,125,79,0.35)' } : { ...navGlass }),
    }}>
      <Icon size={16} color={active ? '#fff' : 'rgb(var(--l-ink) / 0.6)'} />
      <span className="rail-label" style={{
        position: 'absolute', left: 52, top: '50%', transform: 'translateY(-50%)',
        background: 'rgb(var(--l-ink))', color: 'rgb(var(--l-paper))', fontSize: 11, fontWeight: 600,
        padding: '5px 10px', borderRadius: 8, whiteSpace: 'nowrap', opacity: 0, pointerEvents: 'none', transition: 'opacity .15s',
      }}>{label}</span>
      <style>{`.group:hover .rail-label { opacity: 1 !important; }`}</style>
    </Link>
  )
}

// direction 'right' = vertical desktop rail (flyout opens to the icon's
// right); 'down' = horizontal mobile bar (flyout opens below, centered).
function RailGroup({ title, items, isActive, direction = 'right' }: { title: string; items: NavGroup['items']; isActive: (href: string) => boolean; direction?: 'right' | 'down' }) {
  const Icon = items[0].icon
  const groupActive = items.some(it => isActive(it.href))

  // Hover-based opening (with a grace timer, then with the flyout always
  // mounted to rule out a mount-race) still wasn't reliable, reportedly
  // identically across browsers — which points away from a browser hover
  // quirk and toward the fact that hover just isn't a robust interaction
  // here at all: it depends on the cursor continuously tracking through a
  // specific path with zero interruption. Click doesn't have that problem —
  // it's two discrete points (click the icon, click a link), nothing to
  // "lose" in between. Matches how the header dropdowns (More/Bell/New)
  // already work.
  const [open, setOpen] = useState(false)
  const ref = useClickOutside(() => setOpen(false), open)

  const flyoutPos: React.CSSProperties = direction === 'right'
    // Anchored to the icon's TOP, not vertically centered — a flyout taller
    // than the ~50px gap between icons only grows downward, so it can't
    // climb up over the icon above it.
    ? { left: 42, top: -6 }
    : { left: '50%', transform: 'translateX(-50%)', top: '100%', marginTop: 10 }

  return (
    <span ref={ref as any} style={{ position: 'relative', display: 'inline-block', width: 42, height: 42, flexShrink: 0 }}>
      <span title={title} onClick={() => setOpen(o => !o)} style={{
        width: 42, height: 42, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', cursor: 'pointer',
        ...(groupActive ? { background: 'rgb(var(--l-green) / 0.16)', border: '1px solid rgb(var(--l-green) / 0.3)' } : { ...navGlass }),
      }}>
        <Icon size={16} color={groupActive ? 'rgb(var(--l-green))' : 'rgb(var(--l-ink) / 0.6)'} />
      </span>
      {open && (
        // zIndex matters: every rail-group is a sibling in the same
        // stacking context, painted in DOM order, so without it a flyout
        // can get drawn under whatever's next in the list.
        <div className="glass-rail-flyout" style={{
          ...flyoutGlass, position: 'absolute', ...flyoutPos, zIndex: 60,
          borderRadius: 14, padding: direction === 'right' ? '8px 8px 8px 18px' : 8, minWidth: 186,
          display: 'flex', flexDirection: 'column', gap: 1,
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgb(var(--l-ink) / 0.4)', padding: '4px 10px 6px', textAlign: direction === 'down' ? 'center' : 'left' }}>{title}</span>
          {items.map(it => (
            <Link key={it.href} href={it.href} onClick={() => setOpen(false)} className="glass-flyout-link" style={{
              fontSize: 13, fontWeight: 600, color: 'rgb(var(--l-ink) / 0.8)', textDecoration: 'none',
              padding: '7px 10px', borderRadius: 8, whiteSpace: 'nowrap', textAlign: direction === 'down' ? 'center' : 'left',
            }}>{it.label}</Link>
          ))}
        </div>
      )}
    </span>
  )
}
