'use client'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import { FloatingMascot } from '@/components/ui/FloatingMascot'
import { GlassHeader, GlassHeaderSpacer, GlassSidebar, GlassMobileRow } from './GlassChrome'
import { QuickAction } from '@/components/ledger/QuickMenu'
import { cn } from '@/lib/utils'

// ── Life OS navigation, v5 (Glass) ───────────────────────────────────────────
// Floating glass header on every page, with a "Menu" button (mobile) that
// opens a full sheet covering every module + this module's pages + quick
// actions. Desktop also gets a floating icon rail; mobile also gets
// GlassMobileRow — the same rail content, directly visible (not behind a
// tap) right under the header, horizontally scrollable so it never wraps or
// crowds regardless of how many groups a module has.

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
  groups: NavGroup[]        // full page list — desktop rail + mobile menu sheet
  tabs: NavItem[]           // legacy — unused, kept so Shell configs don't need edits
  actions?: ModuleAction[]  // quick actions → "+ New" (header, desktop) / mobile menu sheet
  headerExtra?: React.ReactNode
  contentClassName?: string
  fullBleed?: boolean
}

export function AppShell({ config, children }: { config: ModuleConfig; children: React.ReactNode }) {
  const path = usePathname()
  return (
    <div className="min-h-screen bg-ldg-paper text-ldg-ink">
      <GlassHeader actions={(config.actions ?? []) as QuickAction[]} config={config} />
      <GlassHeaderSpacer />
      <GlassMobileRow config={config} />

      {/* GlassSidebar is position:fixed (matches the one version of this
          chrome that actually got proven out, the finance-live beta) — not
          an in-flow flex sibling, so it no longer reserves layout space
          itself. md:pl-20 on main reserves the same 80px visually instead.
          This swap is also a real bug fix, not just tidying: position:sticky
          is a known source of hit-testing quirks for content that overflows
          the sticky element's own box via position:absolute — exactly what
          the rail's flyouts do — and that's what made the flyout links
          genuinely unclickable while still fully visible. */}
      <GlassSidebar config={config} />

      {config.fullBleed ? (
        <main className="md:pl-20 relative">{children}</main>
      ) : (
        <main className="md:pl-20">
          <div key={path} className={cn('page-in mx-auto w-full px-4 md:px-6 py-6 pb-16 md:pb-10', config.contentClassName ?? 'max-w-3xl')}>
            {children}
          </div>
        </main>
      )}

      <FloatingMascot />
    </div>
  )
}
