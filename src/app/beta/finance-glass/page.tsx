'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Wallet, Settings, Bell, Search, RotateCcw, LayoutGrid, CreditCard, PiggyBank, Receipt } from 'lucide-react'
import { formatRSD, formatEUR } from '@/lib/utils'
import { NeedleChart } from './NeedleChart'
import styles from './glass.module.css'

const TABS = ['Overview', 'Accounts', 'Spending', 'Bills', 'Income']
const RAIL = [
  { icon: LayoutGrid, href: '/beta', label: 'All styles', active: true },
  { icon: CreditCard, href: '/finance/accounts', label: 'Accounts' },
  { icon: Receipt, href: '/finance/bills', label: 'Bills' },
  { icon: PiggyBank, href: '/finance/insights', label: 'Insights' },
]

function DonutRing({ segments, size = 92 }: { segments: { value: number; color: string }[]; size?: number }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  const r = 33, c = 2 * Math.PI * r
  let offset = 0
  return (
    <svg width={size} height={size} viewBox="0 0 84 84">
      <circle cx="42" cy="42" r={r} fill="none" stroke="rgba(20,37,34,0.08)" strokeWidth="9" />
      {segments.map((s, i) => {
        const dash = (s.value / total) * c
        const el = <circle key={i} cx="42" cy="42" r={r} fill="none" stroke={s.color} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-offset} transform="rotate(-90 42 42)" />
        offset += dash
        return el
      })}
    </svg>
  )
}

function HalfGauge({ pct }: { pct: number }) {
  const r = 58, cx = 68, cy = 68
  const circumference = Math.PI * r
  const filled = Math.max(0, Math.min(pct, 150)) / 150
  return (
    <svg viewBox="0 0 136 78" width="100%" style={{ maxWidth: 180 }}>
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="11" strokeLinecap="round" />
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#e2f463" strokeWidth="11" strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={circumference * (1 - filled)} style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="26" fontWeight="700" fill="#142522" letterSpacing="-0.02em">{Math.round(pct)}%</text>
    </svg>
  )
}

export default function FinanceGlassBeta() {
  const [dashboard, setDashboard] = useState<any>(null)
  const [signals, setSignals] = useState<any>(null)
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    Promise.all([
      fetch(`/api/finance/dashboard?period=month&date=${today}`).then(r => r.json()),
      fetch('/api/finance/signals').then(r => r.json()),
      fetch(`/api/finance/expenses?period=month&date=${today}`).then(r => r.json()),
    ]).then(([d, s, e]) => { setDashboard(d); setSignals(s); setExpenses(Array.isArray(e) ? e : []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading || !dashboard) {
    return (
      <div className={styles.page}>
        <div className={styles.scene} />
        <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(20,37,34,0.4)' }}>Loading…</div>
      </div>
    )
  }

  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const todayIndex = now.getDate() - 1
  const daily = Array(daysInMonth).fill(0)
  for (const e of expenses) {
    const d = new Date(e.date).getDate()
    if (d >= 1 && d <= daysInMonth && d - 1 <= todayIndex) daily[d - 1] += e.amountRSD
  }
  const monthTotal = daily.reduce((s, v) => s + v, 0)
  const peakIndex = daily.reduce((best, v, i) => (v > daily[best] ? i : best), 0)
  const last3 = daily.slice(Math.max(0, todayIndex - 2), todayIndex + 1)
  const momentum = last3.length ? Math.round(last3.reduce((s, v) => s + v, 0) / last3.length) : 0

  const allCats = [...dashboard.personalExpenses, ...dashboard.businessExpenses]
    .filter((c: any) => c.amountRSD > 0).sort((a: any, b: any) => b.amountRSD - a.amountRSD)
  const topCats = allCats.slice(0, 4)
  const maxCat = Math.max(...topCats.map((c: any) => c.amountRSD), 1)
  const totalNetWorth = dashboard.totals.totalRSD || 1
  const pace = signals?.pace
  const personalSpend = dashboard.personalExpenses.reduce((s: number, c: any) => s + c.amountRSD, 0)
  const businessSpend = dashboard.businessExpenses.reduce((s: number, c: any) => s + c.amountRSD, 0)

  return (
    <div className={styles.page}>
      <div className={styles.scene} />

      {/* Icon rail */}
      <div className={styles.rail}>
        <span className={styles.railCaption}>Finance</span>
        {RAIL.map((r, i) => (
          <span key={i}>
            <Link href={r.href} data-label={r.label} className={`${styles.railBtn} ${r.active ? styles.railBtnActive : ''}`}>
              <r.icon size={17} color={r.active ? '#eafd35' : 'rgba(20,37,34,0.6)'} />
            </Link>
            {i === 0 && <div className={styles.railDivider} />}
          </span>
        ))}
      </div>

      {/* Floating pill topbar */}
      <div className={styles.topbarWrap}>
        <div className={styles.topbar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className={styles.logoMark}><div className={styles.logoDot} /></div>
            <span className={styles.wordmark}>finance os</span>
          </div>
          <div className={styles.navPill}>
            {TABS.map(t => (
              <span key={t} className={`${styles.navItem} ${t === 'Overview' ? styles.navItemActive : ''}`}>{t}</span>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {[['finance-dark', 'Dark'], ['finance-sage', 'Sage'], ['finance-photo', 'Photo'], ['finance-glass', 'Glass']].map(([href, label]) => (
              <Link key={href} href={`/beta/${href}`} style={{
                fontSize: 10.5, fontWeight: 700, padding: '4px 9px', borderRadius: 999, textDecoration: 'none',
                background: href === 'finance-glass' ? '#142522' : 'rgba(255,255,255,0.4)',
                color: href === 'finance-glass' ? '#eafd35' : 'rgba(20,37,34,0.55)',
              }}>{label}</Link>
            ))}
            <button className={styles.iconBtn}><Settings size={14} color="rgba(20,37,34,0.6)" /></button>
            <button className={styles.iconBtn}><Bell size={14} color="rgba(20,37,34,0.6)" /><span className={styles.notifDot} /></button>
            <div className={styles.avatar}>LJ</div>
          </div>
        </div>
      </div>

      {/* Profile row + greeting */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18, flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className={styles.avatar} style={{ width: 42, height: 42, fontSize: 13 }}>LJ</div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'rgba(20,37,34,0.45)' }}>Owner</p>
            <p style={{ fontSize: 14, fontWeight: 800 }}>Luka Jovanović</p>
          </div>
          <button className={styles.iconBtn} style={{ background: 'rgba(255,255,255,0.35)' }}><Search size={14} color="rgba(20,37,34,0.5)" /></button>
        </div>
        <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div>
            <p style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>Hey, Luka 👋</p>
            <p style={{ fontSize: 13.5, color: 'rgba(20,37,34,0.55)', marginTop: 2 }}>Here's where your money moved this month</p>
          </div>
          <button className={styles.iconBtn}><RotateCcw size={14} color="rgba(20,37,34,0.5)" /></button>
        </div>
      </div>

      <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 18 }}>Finance Overview</h1>

      {/* Hero sheet */}
      <div className={styles.sheet} style={{ padding: '32px 34px', display: 'grid', gridTemplateColumns: 'minmax(260px, 340px) 1fr', gap: 32 }}>
        {/* Info column */}
        <div>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <Wallet size={19} color="#142522" />
          </div>
          <p style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>Daily spending</p>
          <p style={{ fontSize: 13, color: '#404d4a', lineHeight: 1.55, marginBottom: 18 }}>
            Every expense logged this month, day by day. <Link href="/finance/expenses/personal" style={{ color: '#1e6f5c', fontWeight: 700, textDecoration: 'none' }}>See the full ledger</Link> for every transaction.
          </p>
          <p style={{ fontSize: 74, fontWeight: 400, lineHeight: 1, letterSpacing: '-0.045em', marginBottom: 20 }}>
            {(monthTotal / 1000).toFixed(1)}<span style={{ fontSize: 32, color: 'rgba(20,37,34,0.45)' }}>k</span>
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5.5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 700 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#404d4a', fontWeight: 500 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: '#c9dc7c' }} /> Momentum (3d avg)
              </span>
              <span>{formatRSD(momentum)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 700 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#404d4a', fontWeight: 500 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: '#e2f463' }} /> Peak day (Day {peakIndex + 1})
              </span>
              <span>{formatRSD(daily[peakIndex])}</span>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <NeedleChart daily={daily} todayIndex={todayIndex} />
        </div>
      </div>

      {/* Tabs strip */}
      <div style={{ display: 'flex', gap: 6, margin: '18px 0', overflowX: 'auto', paddingBottom: 2 }}>
        {['Overview', 'By Category', 'By Account', 'Trend', 'Bills', 'Goals'].map((t, i) => (
          <span key={t} className={`${styles.tab} ${i === 0 ? styles.tabActive : ''}`}>{t}</span>
        ))}
      </div>

      {/* Stats band — 4 hairline-divided columns */}
      <div className={styles.sheetSecondary} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {/* Table column */}
        <div className={styles.statCol}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#404d4a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Accounts</p>
          </div>
          <p style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>By balance</p>
          <div style={{ display: 'flex', gap: 12, fontSize: 9, fontWeight: 700, color: 'rgba(20,37,34,0.4)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
            <span style={{ flex: 1 }}>Account</span><span>Share</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {dashboard.accounts.slice(0, 4).map((a: any) => {
              const share = Math.round((a.balanceRSD / totalNetWorth) * 100)
              return (
                <div key={a.id} className={styles.hoverRow} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 6px', margin: '0 -6px' }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(20,37,34,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{a.name.slice(0, 1)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</p>
                    <p style={{ fontSize: 10, color: 'rgba(20,37,34,0.45)' }}>{a.currency === 'EUR' ? formatEUR(a.currentBalance) : formatRSD(a.currentBalance)}</p>
                  </div>
                  <span style={{ fontSize: 12.5, fontWeight: 700 }}>{share}%</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Gauge column */}
        <div className={styles.statCol} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#404d4a', textTransform: 'uppercase', letterSpacing: '0.04em', alignSelf: 'flex-start' }}>Pace</p>
          <p style={{ fontSize: 16, fontWeight: 800, marginBottom: 8, alignSelf: 'flex-start' }}>Spend vs. usual</p>
          <HalfGauge pct={pace?.spentPct ?? 0} />
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: 11, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.5)', marginTop: 8 }}>
            <span style={{ color: 'rgba(20,37,34,0.5)' }}>Avg monthly</span>
            <span style={{ fontWeight: 700 }}>{pace ? formatRSD(pace.avgMonthlyRSD) : '—'}</span>
          </div>
        </div>

        {/* Mini-bars column */}
        <div className={styles.statCol}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#404d4a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Categories</p>
          <p style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>Top spenders</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topCats.map((c: any, i: number) => (
              <div key={c.category}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 4 }}>
                  <span style={{ color: '#404d4a', fontWeight: 600 }}>{c.category}</span>
                  <span style={{ fontWeight: 700 }}>{formatRSD(c.amountRSD)}</span>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.6)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.max((c.amountRSD / maxCat) * 100, 4)}%`, background: i === 0 ? '#eafd35' : 'rgba(20,37,34,0.35)', borderRadius: 999 }} />
                </div>
              </div>
            ))}
            {topCats.length === 0 && <p style={{ fontSize: 12, color: 'rgba(20,37,34,0.4)' }}>Nothing logged yet.</p>}
          </div>
          <p style={{ fontSize: 10, color: 'rgba(20,37,34,0.4)', marginTop: 12 }}>{now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
        </div>

        {/* Ring column */}
        <div className={styles.statCol}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#404d4a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Split</p>
          <p style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>Personal / Business</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <DonutRing segments={[{ value: personalSpend, color: '#142522' }, { value: businessSpend, color: '#e2f463' }]} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5.5px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: '#142522' }} />
                <span style={{ color: '#404d4a' }}>Personal</span>
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, marginLeft: 14 }}>{formatRSD(personalSpend)}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginTop: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: '#e2f463' }} />
                <span style={{ color: '#404d4a' }}>Business</span>
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, marginLeft: 14 }}>{formatRSD(businessSpend)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
