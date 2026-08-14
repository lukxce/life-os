'use client'
import Link from 'next/link'
import { Search, Pencil, Calendar, Plus, FileText } from 'lucide-react'
import { useFinanceBetaData } from '@/hooks/useFinanceBetaData'
import { formatRSD, formatEUR } from '@/lib/utils'
import { GrainMesh } from '@/components/beta/GrainMesh'
import { IconRail } from '@/components/beta/IconRail'
import { glassStyle } from '@/components/beta/glass'

const BAR_COLORS = ['#ff8a3d', '#ffb37a', '#e8674f', '#c94f37', '#a86a4a', '#6b5040']

function Switcher() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {[['finance-dark', 'Dark'], ['finance-sage', 'Sage'], ['finance-photo', 'Photo']].map(([href, label]) => (
        <Link key={href} href={`/beta/${href}`}
          style={{
            fontSize: 11, fontWeight: 600, padding: '5px 11px', borderRadius: 999, textDecoration: 'none',
            background: href === 'finance-dark' ? '#ff8a3d' : 'rgba(255,255,255,0.1)',
            color: href === 'finance-dark' ? '#0b0b0d' : 'rgba(255,255,255,0.7)',
          }}>{label}</Link>
      ))}
    </div>
  )
}

function MiniBars({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 32 }}>
      {values.map((v, i) => (
        <div key={i} style={{ width: 4, borderRadius: 2, height: `${Math.max((v / max) * 32, 3)}px`, background: color, opacity: 0.5 + (v / max) * 0.5 }} />
      ))}
    </div>
  )
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1), min = Math.min(...values, 0)
  const range = max - min || 1
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${28 - ((v - min) / range) * 26}`).join(' ')
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" style={{ width: '100%', height: 32 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function RadialGauge({ pct, sublabel }: { pct: number; sublabel: string }) {
  const r = 74, cx = 90, cy = 90
  const circumference = Math.PI * r
  const filled = Math.max(0, Math.min(pct, 150)) / 150
  return (
    <svg viewBox="0 0 180 106" width="100%" style={{ maxWidth: 240 }}>
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="13" strokeLinecap="round" />
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#ff8a3d" strokeWidth="13" strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={circumference * (1 - filled)}
        style={{ transition: 'stroke-dashoffset 0.8s ease', filter: 'drop-shadow(0 0 10px rgba(255,138,61,0.6))' }} />
      {Array.from({ length: 9 }).map((_, i) => {
        const a = Math.PI - (i / 8) * Math.PI
        const x1 = cx + Math.cos(a) * (r + 9), y1 = cy - Math.sin(a) * (r + 9)
        const x2 = cx + Math.cos(a) * (r + 15), y2 = cy - Math.sin(a) * (r + 15)
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
      })}
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize="32" fontWeight="800" fill="#fff" letterSpacing="-0.5">{Math.round(pct)}%</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.5)">{sublabel}</text>
    </svg>
  )
}

export default function FinanceDarkBeta() {
  const { dashboard, signals, loading } = useFinanceBetaData()

  if (loading || !dashboard) {
    return (
      <div style={{ minHeight: '100dvh', position: 'relative' }}>
        <GrainMesh tone="warm" />
        <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)' }}>Loading…</div>
      </div>
    )
  }

  const allCats = [...dashboard.personalExpenses, ...dashboard.businessExpenses]
    .filter((c: any) => c.amountRSD > 0).sort((a: any, b: any) => b.amountRSD - a.amountRSD)
  const top5 = allCats.slice(0, 5)
  const maxCat = Math.max(...top5.map((c: any) => c.amountRSD), 1)
  const pace = signals?.pace
  const spendThisMonth = allCats.reduce((s: number, c: any) => s + c.amountRSD, 0)
  const barValues = top5.map((c: any) => c.amountRSD)
  const now = new Date()
  const monthLabel = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
  const monthStartLabel = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })

  return (
    <div style={{ minHeight: '100dvh', color: '#fff', position: 'relative' }}>
      <GrainMesh tone="warm" />
      <IconRail />

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '28px 24px 60px 90px' }}>
        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: '#ff8a3d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, color: '#0b0b0d' }}>K</div>
            <div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.1 }}>Finance</p>
              <p style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>Dashboard</p>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)' }}>Hey, Luka 👋</p>
            <p style={{ fontSize: 15, fontWeight: 600 }}>Here's your money today</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Switcher />
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>LJ</div>
          </div>
        </div>

        {/* Hero */}
        <div style={{ ...glassStyle({ opacity: 0.05 }), borderRadius: 28, padding: '30px 30px 24px', marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Net worth</p>
          <p style={{ fontSize: 58, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.02em', textShadow: '0 0 50px rgba(255,138,61,0.4)' }}>{formatEUR(dashboard.totals.totalEUR)}</p>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', marginTop: 8, fontFamily: 'var(--font-mono, monospace)' }}>{formatRSD(dashboard.totals.totalRSD)}</p>

          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, ...glassStyle({ opacity: 0.06, blur: 12 }), display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Search size={14} color="rgba(255,255,255,0.6)" /></div>
            <div style={{ width: 34, height: 34, borderRadius: 10, ...glassStyle({ opacity: 0.06, blur: 12 }), display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Pencil size={14} color="rgba(255,255,255,0.6)" /></div>
            <div style={{ ...glassStyle({ opacity: 0.06, blur: 12 }), borderRadius: 999, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>
              <Calendar size={13} /> {monthStartLabel} – {monthLabel}
            </div>
            <Link href="/finance/accounts" style={{ ...glassStyle({ opacity: 0.06, blur: 12 }), borderRadius: 999, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#fff', textDecoration: 'none' }}>
              <Plus size={13} /> Add Wallet
            </Link>
            <Link href="/finance/insights" style={{ background: '#ff8a3d', borderRadius: 999, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#0b0b0d', textDecoration: 'none' }}>
              <FileText size={13} /> Create a Report
            </Link>
          </div>
        </div>

        {/* Stat row with embedded mini-viz */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 14 }}>
          <div style={{ ...glassStyle(), borderRadius: 22, padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>Spending</p>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>This month</span>
            </div>
            <MiniBars values={barValues.length ? barValues : [1, 1, 1]} color="#ff8a3d" />
            <p style={{ fontSize: 20, fontWeight: 800, fontFamily: 'monospace', marginTop: 10 }}>{formatRSD(spendThisMonth)}</p>
          </div>
          <div style={{ ...glassStyle(), borderRadius: 22, padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>Net income</p>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>This month</span>
            </div>
            <Sparkline values={[dashboard.income.totalGrossRSD * 0.7, dashboard.income.totalGrossRSD * 0.85, dashboard.income.totalDeductions, dashboard.income.totalNetRSD]} color="#4ee08a" />
            <p style={{ fontSize: 20, fontWeight: 800, fontFamily: 'monospace', marginTop: 10 }}>{formatRSD(dashboard.income.totalNetRSD)}</p>
          </div>
          <div style={{ ...glassStyle(), borderRadius: 22, padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>Accounts</p>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{dashboard.accounts.length} tracked</span>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              {dashboard.accounts.slice(0, 6).map((a: any, i: number) => (
                <div key={a.id} title={a.name} style={{ width: 26, height: 26, borderRadius: '50%', background: BAR_COLORS[i % BAR_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#0b0b0d' }}>
                  {a.name.slice(0, 1)}
                </div>
              ))}
            </div>
            <p style={{ fontSize: 20, fontWeight: 800, fontFamily: 'monospace', marginTop: 14 }}>{formatEUR(dashboard.totals.personalEUR)}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 14 }}>
          {/* Wellness-score-style card: pace as the hero number */}
          <div style={{ ...glassStyle(), borderRadius: 24, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>Spending Pace</p>
                <p style={{ fontSize: 44, fontWeight: 800, color: '#ff8a3d', lineHeight: 1 }}>{pace ? `${pace.spentPct}%` : '—'}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
                  {pace ? (pace.status === 'ahead' ? 'Spending faster than usual' : pace.status === 'behind' ? 'Spending slower than usual' : 'On track with usual pace') : 'Not enough history yet'}
                </p>
              </div>
            </div>
            <div style={{ marginTop: 18 }}>
              {top5.map((c: any, i: number) => (
                <div key={c.category} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>{c.category}</span>
                    <span style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)' }}>{formatRSD(c.amountRSD)}</span>
                  </div>
                  <div style={{ height: 7, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.max((c.amountRSD / maxCat) * 100, 3)}%`, background: BAR_COLORS[i % BAR_COLORS.length], borderRadius: 999 }} />
                  </div>
                </div>
              ))}
              {top5.length === 0 && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>Nothing logged this month yet.</p>}
            </div>
            <div style={{ display: 'flex', gap: 24, marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <div>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Avg monthly</p>
                <p style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}>{pace ? formatRSD(pace.avgMonthlyRSD) : '—'}</p>
              </div>
              <div>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Projected</p>
                <p style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}>{pace?.projectedRSD ? formatRSD(pace.projectedRSD) : '—'}</p>
              </div>
            </div>
          </div>

          {/* Gauge card */}
          <div style={{ ...glassStyle(), borderRadius: 24, padding: '22px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {[...Array(5)].map((_, i) => <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: i === 2 ? '#ff8a3d' : 'rgba(255,255,255,0.2)' }} />)}
            </div>
            {pace ? <RadialGauge pct={pace.spentPct} sublabel={pace.status === 'ahead' ? 'ahead' : pace.status === 'behind' ? 'behind' : 'on track'} /> : (
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', textAlign: 'center', padding: '20px 0' }}>Not enough history yet.</p>
            )}
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 12, textAlign: 'center', lineHeight: 1.4 }}>Balanced spend state<br />vs. your usual pace</p>
          </div>
        </div>
      </div>
    </div>
  )
}
