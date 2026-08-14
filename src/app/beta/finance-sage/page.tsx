'use client'
import Link from 'next/link'
import { Bell, Settings, RotateCcw } from 'lucide-react'
import { useFinanceBetaData } from '@/hooks/useFinanceBetaData'
import { formatRSD, formatEUR } from '@/lib/utils'
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts'

const TABS = ['Overview', 'Accounts', 'Spending', 'Bills', 'Income']
const SUBTABS = ['This Month', 'Trends', 'Categories', 'Accounts', 'Bills', 'Goals']

function RingGauge({ pct, label, tone }: { pct: number; label: string; tone: string }) {
  const r = 34, c = 2 * Math.PI * r
  const filled = Math.max(0, Math.min(pct, 100)) / 100
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(30,50,30,0.08)" strokeWidth="9" />
        <circle cx="44" cy="44" r={r} fill="none" stroke={tone} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - filled)} transform="rotate(-90 44 44)"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
        <text x="44" y="49" textAnchor="middle" fontSize="17" fontWeight="800" fill="#1e2e1e">{Math.round(pct)}%</text>
      </svg>
      <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(30,50,30,0.6)', textAlign: 'center' }}>{label}</p>
    </div>
  )
}

// Outer "shell" glass — more saturated sage tint, sits between the page
// wash and the lighter content cards, giving the two-tone layered depth.
const shellGlass: React.CSSProperties = {
  background: 'rgba(207, 227, 207, 0.55)', backdropFilter: 'blur(20px) saturate(140%)', WebkitBackdropFilter: 'blur(20px) saturate(140%)',
  border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 8px 32px rgba(60,90,60,0.1), inset 0 1px 0 rgba(255,255,255,0.6)',
}
// Inner content glass — near-white, sits inside the shell.
const cardGlass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(16px) saturate(130%)', WebkitBackdropFilter: 'blur(16px) saturate(130%)',
  border: '1px solid rgba(255,255,255,0.7)', boxShadow: '0 6px 24px rgba(60,90,60,0.08), inset 0 1px 0 rgba(255,255,255,0.7)',
}

export default function FinanceSageBeta() {
  const { dashboard, signals, loading } = useFinanceBetaData()

  if (loading || !dashboard) {
    return <div style={{ minHeight: '100dvh', background: '#e6f0e6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(30,50,30,0.4)' }}>Loading…</div>
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
    <div style={{
      minHeight: '100dvh', padding: '20px 20px 60px', color: '#1e2e1e',
      background: 'radial-gradient(1000px 500px at 20% -10%, rgba(143,184,122,0.35), transparent 60%), radial-gradient(800px 500px at 100% 20%, rgba(111,174,123,0.25), transparent 55%), linear-gradient(170deg, #f3f8f3 0%, #e2ede2 55%, #cfe3cf 100%)',
    }}>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        {/* Sticky top nav — the more-saturated outer shell */}
        <div style={{ ...shellGlass, borderRadius: 20, padding: '10px 16px', position: 'sticky', top: 12, zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>Finance OS</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {TABS.map(t => (
                <span key={t} style={{
                  fontSize: 12.5, fontWeight: 600, padding: '6px 13px', borderRadius: 999,
                  background: t === 'Overview' ? '#5b8a63' : 'transparent',
                  color: t === 'Overview' ? '#fff' : 'rgba(30,50,30,0.6)',
                }}>{t}</span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {[['finance-dark', 'Dark'], ['finance-sage', 'Sage'], ['finance-photo', 'Photo']].map(([href, label]) => (
              <Link key={href} href={`/beta/${href}`} style={{
                fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 999, textDecoration: 'none',
                background: href === 'finance-sage' ? '#1e2e1e' : 'rgba(30,50,30,0.08)',
                color: href === 'finance-sage' ? '#fff' : 'rgba(30,50,30,0.55)',
              }}>{label}</Link>
            ))}
            <Bell size={16} color="rgba(30,50,30,0.5)" />
            <Settings size={16} color="rgba(30,50,30,0.5)" />
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#5b8a63', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>LJ</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 15, color: 'rgba(30,50,30,0.55)' }}>Hey, Luka 👋</p>
            <h1 style={{ fontSize: 25, fontWeight: 800, marginTop: 2, letterSpacing: '-0.01em' }}>Explore your finances</h1>
          </div>
          <RotateCcw size={16} color="rgba(30,50,30,0.35)" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) 1fr', gap: 16 }}>
          {/* Left: hero + chart */}
          <div>
            <div style={{ ...cardGlass, borderRadius: 24, padding: 26 }}>
              <p style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(30,50,30,0.45)', marginBottom: 6 }}>Net worth</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                <p style={{ fontSize: 44, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.02em' }}>{formatEUR(dashboard.totals.totalEUR)}</p>
                {pace && (
                  <span style={{
                    fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
                    background: pace.status === 'ahead' ? 'rgba(200,80,60,0.14)' : pace.status === 'behind' ? 'rgba(91,138,99,0.16)' : 'rgba(30,50,30,0.08)',
                    color: pace.status === 'ahead' ? '#c8503c' : pace.status === 'behind' ? '#4b7a53' : 'rgba(30,50,30,0.6)',
                  }}>{pace.status === 'ahead' ? '↑ pace ahead' : pace.status === 'behind' ? '↓ pace behind' : '— on pace'}</span>
                )}
              </div>
              <p style={{ fontSize: 14, color: 'rgba(30,50,30,0.45)', marginTop: 4, fontFamily: 'monospace' }}>{formatRSD(dashboard.totals.totalRSD)}</p>

              {/* Chip legend */}
              <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap' }}>
                {[['#5b8a63', 'Spent', formatRSD(totalSpend)], ['#8fb87a', 'Net income', formatRSD(dashboard.income.totalNetRSD)], ['#c8a35b', 'Deductions', formatRSD(dashboard.income.totalDeductions)]].map(([dot, label, val]) => (
                  <div key={label as string} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot as string }} />
                    <span style={{ color: 'rgba(30,50,30,0.55)' }}>{label}</span>
                    <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{val}</span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 22, height: 190, position: 'relative' }}>
                {peak && (
                  <div style={{
                    position: 'absolute', top: -6, right: 8, background: '#1e2e1e', color: '#fff', borderRadius: 12, padding: '8px 12px',
                    fontSize: 11, lineHeight: 1.5, boxShadow: '0 8px 20px rgba(30,50,30,0.25)', zIndex: 2,
                  }}>
                    <strong>{peak.name}</strong><br />
                    {formatRSD(peak.value)} · biggest category
                  </div>
                )}
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                    <defs>
                      <linearGradient id="sageFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#5b8a63" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#5b8a63" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'rgba(30,50,30,0.45)' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: any) => formatRSD(v)} contentStyle={{ fontSize: 12, borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }} />
                    <Area type="monotone" dataKey="value" stroke="#5b8a63" strokeWidth={2.5} fill="url(#sageFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sub-tab strip */}
            <div style={{ display: 'flex', gap: 4, marginTop: 16, marginBottom: 12, overflowX: 'auto', paddingBottom: 2 }}>
              {SUBTABS.map(t => (
                <span key={t} style={{
                  fontSize: 12, fontWeight: 600, padding: '6px 13px', borderRadius: 999, whiteSpace: 'nowrap',
                  background: t === 'Goals' ? 'rgba(30,50,30,0.85)' : 'rgba(30,50,30,0.06)',
                  color: t === 'Goals' ? '#fff' : 'rgba(30,50,30,0.55)',
                }}>{t}</span>
              ))}
            </div>

            {/* Accounts performance list */}
            <div style={{ ...cardGlass, borderRadius: 24, padding: 22 }}>
              <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Accounts performance</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {dashboard.accounts.map((a: any) => {
                  const share = Math.round((a.balanceRSD / totalNetWorth) * 100)
                  return (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderTop: '1px solid rgba(30,50,30,0.06)' }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(91,138,99,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#4b7a53', flexShrink: 0 }}>
                        {a.name.slice(0, 1)}
                      </div>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                      <span style={{ fontSize: 12, color: 'rgba(30,50,30,0.4)', width: 40, textAlign: 'right' }}>{share}%</span>
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
            <div style={{ ...cardGlass, borderRadius: 24, padding: 22 }}>
              <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Budget health</p>
              <p style={{ fontSize: 11, color: 'rgba(30,50,30,0.45)', marginBottom: 14 }}>vs. your usual pace</p>
              <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                <RingGauge pct={pace?.spentPct ?? 0} label="spend pace" tone="#5b8a63" />
                <RingGauge pct={savingsRate} label="savings rate" tone="#8fb87a" />
              </div>
            </div>

            <div style={{ ...cardGlass, borderRadius: 24, padding: 22 }}>
              <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Income this month</p>
              <p style={{ fontSize: 26, fontWeight: 800 }}>{formatRSD(dashboard.income.totalNetRSD)}</p>
              <p style={{ fontSize: 12, color: 'rgba(30,50,30,0.45)', marginTop: 4 }}>after {formatRSD(dashboard.income.totalDeductions)} deductions</p>
            </div>

            {signals?.billsDueSoon?.length > 0 && (
              <div style={{ ...cardGlass, borderRadius: 24, padding: 22 }}>
                <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Due soon</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {signals.billsDueSoon.slice(0, 4).map((b: any) => (
                    <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span>{b.name}</span>
                      <span style={{ fontWeight: 700, color: b.daysUntil <= 0 ? '#c8503c' : 'rgba(30,50,30,0.7)' }}>
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
