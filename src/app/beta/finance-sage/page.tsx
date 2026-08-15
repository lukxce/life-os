'use client'
import Link from 'next/link'
import { Bell, Settings, RotateCcw, Zap } from 'lucide-react'
import { useFinanceBetaData } from '@/hooks/useFinanceBetaData'
import { formatRSD, formatEUR } from '@/lib/utils'
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts'
import { GrainMesh } from '@/components/beta/GrainMesh'
import { IconRail } from '@/components/beta/IconRail'

const TABS = ['Overview', 'Accounts', 'Spending', 'Bills', 'Income']
const SUBTABS = ['This Month', 'Trends', 'Categories', 'Accounts', 'Bills', 'Goals']

// Palette: mostly neutral gray/white/black, ONE sparse accent (chartreuse)
// — not a green theme. The reference uses green exactly once, as a highlight
// color, everywhere else is black text on white glass over a muted gray-blue
// backdrop.
const ACCENT = '#cddc39'
const INK = '#16181a'

const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.55)',
  backdropFilter: 'blur(22px) saturate(140%)', WebkitBackdropFilter: 'blur(22px) saturate(140%)',
  border: '1px solid rgba(255,255,255,0.65)',
  boxShadow: '0 8px 28px rgba(20,30,25,0.1), inset 0 1px 0 rgba(255,255,255,0.7)',
}

function RingGauge({ pct, label, tone }: { pct: number; label: string; tone: string }) {
  const r = 34, c = 2 * Math.PI * r
  const filled = Math.max(0, Math.min(pct, 100)) / 100
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(20,24,22,0.1)" strokeWidth="9" />
        <circle cx="44" cy="44" r={r} fill="none" stroke={tone} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - filled)} transform="rotate(-90 44 44)"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
        <text x="44" y="49" textAnchor="middle" fontSize="17" fontWeight="800" fill={INK}>{Math.round(pct)}%</text>
      </svg>
      <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(20,24,22,0.6)', textAlign: 'center' }}>{label}</p>
    </div>
  )
}

export default function FinanceSageBeta() {
  const { dashboard, signals, loading } = useFinanceBetaData()

  if (loading || !dashboard) {
    return (
      <div style={{ minHeight: '100dvh', position: 'relative' }}>
        <GrainMesh tone="sage" />
        <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(20,24,22,0.4)' }}>Loading…</div>
      </div>
    )
  }

  const allCats = [...dashboard.personalExpenses, ...dashboard.businessExpenses]
    .filter((c: any) => c.amountRSD > 0).sort((a: any, b: any) => b.amountRSD - a.amountRSD)
  const chartData = allCats.slice(0, 8).map((c: any) => ({ name: c.category, value: Math.round(c.amountRSD) }))
  const peak = chartData.reduce((m, c) => (c.value > (m?.value ?? -1) ? c : m), null as null | { name: string; value: number })
  const totalNetWorth = dashboard.totals.totalRSD || 1
  const pace = signals?.pace
  const totalSpend = allCats.reduce((s: number, c: any) => s + c.amountRSD, 0)
  const savingsRate = dashboard.income.totalGrossRSD > 0
    ? Math.max(0, Math.round((dashboard.income.totalNetRSD - totalSpend) / dashboard.income.totalGrossRSD * 100))
    : 0

  return (
    <div style={{ minHeight: '100dvh', color: INK, position: 'relative' }}>
      <GrainMesh tone="sage" />
      <IconRail tone="light" />

      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '20px 20px 60px 90px' }}>
        {/* Sticky top nav */}
        <div style={{ ...glass, borderRadius: 20, padding: '10px 16px', position: 'sticky', top: 12, zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 20, height: 20, borderRadius: 6, background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={12} color={INK} fill={INK} />
              </div>
              <span style={{ fontSize: 15, fontWeight: 800 }}>Finance OS</span>
            </div>
            <div style={{ display: 'flex', gap: 3 }}>
              {TABS.map(t => (
                <span key={t} style={{
                  fontSize: 12.5, fontWeight: 600, padding: '6px 13px', borderRadius: 999,
                  background: t === 'Overview' ? '#fff' : 'transparent',
                  color: t === 'Overview' ? INK : 'rgba(20,24,22,0.55)',
                  boxShadow: t === 'Overview' ? '0 2px 8px rgba(20,30,25,0.15)' : 'none',
                }}>{t}</span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {[['finance-dark', 'Dark'], ['finance-sage', 'Sage'], ['finance-photo', 'Photo']].map(([href, label]) => (
              <Link key={href} href={`/beta/${href}`} style={{
                fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 999, textDecoration: 'none',
                background: href === 'finance-sage' ? INK : 'rgba(20,24,22,0.08)',
                color: href === 'finance-sage' ? '#fff' : 'rgba(20,24,22,0.55)',
              }}>{label}</Link>
            ))}
            <Bell size={16} color="rgba(20,24,22,0.5)" />
            <Settings size={16} color="rgba(20,24,22,0.5)" />
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: INK, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>LJ</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 15, color: 'rgba(20,24,22,0.6)' }}>Hey, Luka 👋</p>
            <h1 style={{ fontSize: 25, fontWeight: 800, marginTop: 2, letterSpacing: '-0.01em' }}>Explore your finances</h1>
          </div>
          <div style={{ ...glass, width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RotateCcw size={15} color="rgba(20,24,22,0.5)" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) 1fr', gap: 16 }}>
          {/* Left: hero + chart */}
          <div>
            <div style={{ ...glass, borderRadius: 24, padding: 26 }}>
              <p style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(20,24,22,0.5)', marginBottom: 6 }}>Net worth</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                <p style={{ fontSize: 44, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.02em' }}>{formatEUR(dashboard.totals.totalEUR)}</p>
                {pace && (
                  <span style={{
                    fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
                    background: pace.status === 'ahead' ? 'rgba(200,80,60,0.16)' : pace.status === 'behind' ? 'rgba(205,220,57,0.35)' : 'rgba(20,24,22,0.08)',
                    color: pace.status === 'ahead' ? '#c8503c' : pace.status === 'behind' ? '#6b7414' : 'rgba(20,24,22,0.6)',
                  }}>{pace.status === 'ahead' ? '↑ pace ahead' : pace.status === 'behind' ? '↓ pace behind' : '— on pace'}</span>
                )}
              </div>
              <p style={{ fontSize: 14, color: 'rgba(20,24,22,0.5)', marginTop: 4, fontFamily: 'monospace' }}>{formatRSD(dashboard.totals.totalRSD)}</p>

              <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap' }}>
                {[[ACCENT, 'Spent', formatRSD(totalSpend)], [INK, 'Net income', formatRSD(dashboard.income.totalNetRSD)], ['#9aa39d', 'Deductions', formatRSD(dashboard.income.totalDeductions)]].map(([dot, label, val]) => (
                  <div key={label as string} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot as string }} />
                    <span style={{ color: 'rgba(20,24,22,0.6)' }}>{label}</span>
                    <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{val}</span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 22, height: 190, position: 'relative' }}>
                {peak && (
                  <div style={{
                    position: 'absolute', top: -6, right: 8, background: INK, color: '#fff', borderRadius: 12, padding: '8px 12px',
                    fontSize: 11, lineHeight: 1.5, boxShadow: '0 8px 20px rgba(20,30,25,0.25)', zIndex: 2, backdropFilter: 'blur(8px)',
                  }}>
                    <strong>{peak.name}</strong><br />
                    {formatRSD(peak.value)} · biggest category
                  </div>
                )}
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                    <defs>
                      <linearGradient id="accentFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={ACCENT} stopOpacity={0.55} />
                        <stop offset="100%" stopColor={ACCENT} stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'rgba(20,24,22,0.5)' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: any) => formatRSD(v)} contentStyle={{ fontSize: 12, borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }} />
                    <Area type="monotone" dataKey="value" stroke="#a8b622" strokeWidth={2.5} fill="url(#accentFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sub-tab strip */}
            <div style={{ display: 'flex', gap: 4, marginTop: 16, marginBottom: 12, overflowX: 'auto', paddingBottom: 2 }}>
              {SUBTABS.map(t => (
                <span key={t} style={{
                  fontSize: 12, fontWeight: 600, padding: '6px 13px', borderRadius: 999, whiteSpace: 'nowrap',
                  background: t === 'Goals' ? INK : 'rgba(20,24,22,0.08)',
                  color: t === 'Goals' ? '#fff' : 'rgba(20,24,22,0.6)',
                }}>{t}</span>
              ))}
            </div>

            {/* Accounts performance list */}
            <div style={{ ...glass, borderRadius: 24, padding: 22 }}>
              <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Accounts performance</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {dashboard.accounts.map((a: any) => {
                  const share = Math.round((a.balanceRSD / totalNetWorth) * 100)
                  return (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderTop: '1px solid rgba(20,24,22,0.08)' }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(20,24,22,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: INK, flexShrink: 0 }}>
                        {a.name.slice(0, 1)}
                      </div>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                      <span style={{ fontSize: 12, color: 'rgba(20,24,22,0.45)', width: 40, textAlign: 'right' }}>{share}%</span>
                      <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', width: 110, textAlign: 'right' }}>
                        {a.currency === 'EUR' ? formatEUR(a.currentBalance) : formatRSD(a.currentBalance)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right: gauges */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ ...glass, borderRadius: 24, padding: 22 }}>
              <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Budget health</p>
              <p style={{ fontSize: 11, color: 'rgba(20,24,22,0.5)', marginBottom: 14 }}>vs. your usual pace</p>
              <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                <RingGauge pct={pace?.spentPct ?? 0} label="spend pace" tone="#a8b622" />
                <RingGauge pct={savingsRate} label="savings rate" tone={INK} />
              </div>
            </div>

            <div style={{ ...glass, borderRadius: 24, padding: 22 }}>
              <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Income this month</p>
              <p style={{ fontSize: 26, fontWeight: 800 }}>{formatRSD(dashboard.income.totalNetRSD)}</p>
              <p style={{ fontSize: 12, color: 'rgba(20,24,22,0.5)', marginTop: 4 }}>after {formatRSD(dashboard.income.totalDeductions)} deductions</p>
            </div>

            {signals?.billsDueSoon?.length > 0 && (
              <div style={{ ...glass, borderRadius: 24, padding: 22 }}>
                <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Due soon</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {signals.billsDueSoon.slice(0, 4).map((b: any) => (
                    <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span>{b.name}</span>
                      <span style={{ fontWeight: 700, color: b.daysUntil <= 0 ? '#c8503c' : 'rgba(20,24,22,0.7)' }}>
                        {b.daysUntil < 0 ? `${Math.abs(b.daysUntil)}d overdue` : b.daysUntil === 0 ? 'today' : `${b.daysUntil}d`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
