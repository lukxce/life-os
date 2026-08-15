'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Bell, Moon, Sun, Plus, ChevronDown, X } from 'lucide-react'
import type { ModuleConfig, NavGroup } from './AppShell'
import { GlobalSearch } from './GlobalSearch'
import { QuickMenu, QuickAction } from '@/components/ledger/QuickMenu'
import { cn } from '@/lib/utils'

// ── Glass chrome — desktop header + rail for every module ───────────────────
// This is the finance-live beta's chrome (floating pill top bar, floating
// icon rail with grouped hover flyouts), generalized to run off any
// module's existing ModuleConfig instead of being hand-written per page.
// Desktop only (md+) — mobile keeps AppShell's existing BottomBar/GoSheet,
// which already works well and wasn't part of what anyone asked to change;
// this only replaces the old fixed AppHeader + labeled Sidebar.

const GLOBAL_NAV = [
  { href: '/finance',  label: 'Finance' },
  { href: '/life',     label: 'Habits' },
  { href: '/fitness',  label: 'Fitness' },
  { href: '/schedule', label: 'Schedule' },
]
const GLOBAL_NAV_MORE = [
  { href: '/journal',   label: 'Journal' },
  { href: '/food',      label: 'Food' },
  { href: '/personal',  label: 'Personal' },
  { href: '/watchlist', label: 'Watchlist' },
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

// ── Top bar ───────────────────────────────────────────────────────────────
// Takes actions directly (not a ModuleConfig) — same shape AppHeader used —
// so Home (which has quick actions but no module sidebar/groups) can use
// this too without needing a fake config object.
export function GlassHeader({ actions }: { actions: QuickAction[] }) {
  const path = usePathname()
  const [notifOpen, setNotifOpen] = useState(false)
  const [newOpen, setNewOpen] = useState(false)
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

  return (
    <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40, height: 78, display: 'flex', alignItems: 'center', padding: '0 16px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>
        <div style={{ ...navGlass, borderRadius: 999, padding: '9px 12px 9px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, width: '100%' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, textDecoration: 'none', color: 'inherit' }}>
            <div style={{ width: 24, height: 24, borderRadius: 8, background: 'rgb(var(--l-green))' }} />
            <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.08em' }}>LIFE OS</span>
          </Link>

          <div className="hidden md:flex" style={{ gap: 2, flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            {GLOBAL_NAV.map(n => {
              const active = isPathActive(path, n.href)
              return (
                <Link key={n.href} href={n.href} style={{
                  fontSize: 12.5, fontWeight: 600, padding: '7px 14px', borderRadius: 999, whiteSpace: 'nowrap', textDecoration: 'none',
                  background: active ? 'rgb(var(--l-green) / 0.12)' : 'transparent',
                  color: active ? 'rgb(var(--l-green))' : 'rgb(var(--l-ink) / 0.55)',
                }}>{n.label}</Link>
              )
            })}
            {/* Bridge span (out-of-flow, no layout height) keeps :hover alive
                across the gap to the flyout — without it the mouse loses
                hover in transit and the menu closes before you can click. */}
            <span className="glass-more" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <span style={{
                fontSize: 12.5, fontWeight: 600, padding: '7px 12px', borderRadius: 999, whiteSpace: 'nowrap',
                color: moreActive ? 'rgb(var(--l-green))' : 'rgb(var(--l-ink) / 0.55)', display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer',
              }}>More <ChevronDown size={13} /></span>
              <span aria-hidden style={{ position: 'absolute', left: 0, right: 0, top: '100%', height: 10 }} />
              <div className="glass-more-flyout" style={{
                ...flyoutGlass, position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 10,
                borderRadius: 14, padding: '8px', minWidth: 150, opacity: 0, pointerEvents: 'none', transition: 'opacity .15s',
                display: 'flex', flexDirection: 'column', gap: 1, zIndex: 50,
              }}>
                {GLOBAL_NAV_MORE.map(n => (
                  <Link key={n.href} href={n.href} style={{
                    fontSize: 13, fontWeight: 600, color: 'rgb(var(--l-ink) / 0.8)', textDecoration: 'none',
                    padding: '7px 10px', borderRadius: 8, whiteSpace: 'nowrap', textAlign: 'center',
                  }}>{n.label}</Link>
                ))}
              </div>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GlobalSearch mobileIconOnly />
            </span>

            <span style={{ position: 'relative' }}>
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
                <>
                  <div onClick={() => setNotifOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 55 }} />
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
                </>
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
              <span className="hidden sm:block" style={{ position: 'relative' }}>
                <button onClick={() => setNewOpen(o => !o)} style={{
                  fontSize: 12.5, fontWeight: 700, color: '#fff', background: newOpen ? 'rgb(var(--l-ink) / 0.85)' : 'rgb(var(--l-ink))',
                  borderRadius: 999, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 5, border: 'none', cursor: 'pointer',
                }}>
                  {newOpen ? <X size={13} /> : <Plus size={13} />} New
                </button>
                {newOpen && (
                  <>
                    <div onClick={() => setNewOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 55 }} />
                    <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 10, zIndex: 56 }}>
                      <QuickMenu actions={actions} onClose={() => setNewOpen(false)} />
                    </div>
                  </>
                )}
              </span>
            )}

            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgb(var(--l-green))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>LJ</div>
          </div>
        </div>
      </div>
      <style>{`
        .glass-more:hover .glass-more-flyout { opacity: 1 !important; pointer-events: auto !important; }
        .glass-more-flyout a:hover, .glass-rail-flyout a:hover { background: rgb(var(--l-green) / 0.1); color: rgb(var(--l-green)); }
      `}</style>
    </header>
  )
}

export function GlassHeaderSpacer() {
  return <div style={{ height: 78 }} />
}

// ── Left rail ─────────────────────────────────────────────────────────────
// Same width/breakpoint/sticky-offset the old labeled Sidebar used (hidden
// md:flex, w-56 → here w-20 since it's icon-only) so the flex layout math
// every page already assumes doesn't shift — only the visual treatment
// changes. Icon per group: the group's own first item's icon, since
// NavGroup only carries per-item icons, not a group-level one.
export function GlassSidebar({ config }: { config: ModuleConfig }) {
  const path = usePathname()
  const isActive = (href: string) => href === config.home ? path === href : isPathActive(path, href)

  // No overflow-y here on purpose: setting only one axis non-visible forces
  // the CSS spec to make the other 'auto' too (this bit finance-live once
  // already — it silently clips flyouts that render outside the box). The
  // rail tops out around 8 icons for the biggest module (Finance), which
  // fits any real viewport height without scrolling, so there's nothing to
  // gain from overflow-y here and real risk in adding it back.
  return (
    <aside className="hidden md:flex flex-col w-20 shrink-0 sticky top-[86px] items-center pt-1 gap-3">
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

function RailGroup({ title, items, isActive }: { title: string; items: NavGroup['items']; isActive: (href: string) => boolean }) {
  const Icon = items[0].icon
  const groupActive = items.some(it => isActive(it.href))
  return (
    // Explicit width bridges the icon→flyout gap into the element's own
    // hit-box (flyout starts exactly at left:42, touching) — otherwise the
    // dead 10px strip between them drops :hover before the flyout is
    // reached, and it closes right as you try to click it.
    <span className="rail-group group" style={{ position: 'relative', display: 'inline-block', width: 42, height: 42, flexShrink: 0 }}>
      <span title={title} style={{
        width: 42, height: 42, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', cursor: 'pointer',
        ...(groupActive ? { background: 'rgb(var(--l-green) / 0.16)', border: '1px solid rgb(var(--l-green) / 0.3)' } : { ...navGlass }),
      }}>
        <Icon size={16} color={groupActive ? 'rgb(var(--l-green))' : 'rgb(var(--l-ink) / 0.6)'} />
        {/* No separate hover tooltip here on purpose — the flyout already
            opens with the group's name as its own header, so a second,
            differently-positioned label doing the same job was pure visual
            noise (that's the stray floating tag in the screenshot) — it's
            gone, not just relabeled. */}
      </span>
      {/* Anchored to the icon's TOP, not vertically centered — a flyout
          taller than the ~50px gap between icons only grows downward now,
          so it can no longer climb up over the icon above it. zIndex still
          matters for whatever's below: every rail-group is a sibling in the
          same stacking context, painted in DOM order, so without it a tall
          flyout would get drawn under the icon two spots down. */}
      <div className="rail-group-flyout glass-rail-flyout" style={{
        ...flyoutGlass, position: 'absolute', left: 42, top: -6, zIndex: 60,
        borderRadius: 14, padding: '8px 8px 8px 18px', minWidth: 186, opacity: 0, pointerEvents: 'none', transition: 'opacity .15s',
        display: 'flex', flexDirection: 'column', gap: 1,
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgb(var(--l-ink) / 0.4)', padding: '4px 10px 6px' }}>{title}</span>
        {items.map(it => (
          <Link key={it.href} href={it.href} style={{
            fontSize: 13, fontWeight: 600, color: 'rgb(var(--l-ink) / 0.8)', textDecoration: 'none',
            padding: '7px 10px', borderRadius: 8, whiteSpace: 'nowrap',
          }}>{it.label}</Link>
        ))}
      </div>
      <style>{`
        .rail-group:hover .rail-group-flyout { opacity: 1 !important; pointer-events: auto !important; }
      `}</style>
    </span>
  )
}
