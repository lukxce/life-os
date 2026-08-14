'use client'
import Link from 'next/link'
import { useFinanceBetaData } from '@/hooks/useFinanceBetaData'
import { formatRSD, formatEUR } from '@/lib/utils'

const BAR_COLORS = ['#ff8a3d', '#ffb37a', '#e8674f', '#c94f37', '#7a5040', '#4a3830']

function Switcher() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <Link href="/beta" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>← All styles</Link>
      {[['finance-dark', 'Dark'], ['finance-sage', 'Sage'], ['finance-photo', 'Photo']].map(([href, label]) => (
        <Link key={href} href={`/beta/${href}`}
          style={{
            fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 999, textDecoration: 'none',
            background: href === 'finance-dark' ? '#ff8a3d' : 'rgba(255,255,255,0.08)',
            color: href === 'finance-dark' ? '#0b0b0d' : 'rgba(255,255,255,0.7)',
          }}>{label}</Link>
      ))}
    </div>
  )
}

function RadialGauge({ pct, label, sublabel }: { pct: number; label: string; sublabel: string }) {
  const r = 80, cx = 100, cy = 100
  const circumference = Math.PI * r
  const filled = Math.max(0, Math.min(pct, 150)) / 150
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg viewBox="0 0 200 118" width="100%" style={{ maxWidth: 260 }}>
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="14" strokeLinecap="round" />
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#ff8a3d" strokeWidth="14" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={circumference * (1 - filled)}
          style={{ transition: 'stroke-dashoffset 0.8s ease', filter: 'drop-shadow(0 0 8px rgba(255,138,61,0.55))' }} />
        {Array.from({ length: 11 }).map((_, i) => {
          const a = Math.PI - (i / 10) * Math.PI
          const x1 = cx + Math.cos(a) * (r + 10), y1 = cy - Math.sin(a) * (r + 10)
          const x2 = cx + Math.cos(a) * (r + 16), y2 = cy - Math.sin(a) * (r + 16)
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
        })}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="30" fontWeight="800" fill="#fff">{Math.round(pct)}%</text>
        <text x={cx} y={cy + 16} textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.45)">{sublabel}</text>
      </svg>
      <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.75)', marginTop: -6 }}>{label}</p>
    </div>
  )
}

export default function FinanceDarkBeta() {
  const { dashboard, signals, loading } = useFinanceBetaData()

  if (loading || !dashboard) {
    return <div style={{ minHeight: '100dvh', background: '#0b0b0d', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading…</div>
  }

  const allCats = [...dashboard.personalExpenses, ...dashboard.businessExpenses]
    .filter((c: any) => c.amountRSD > 0).sort((a: any, b: any) => b.amountRSD - a.amountRSD).slice(0, 6)
  const maxCat = Math.max(...allCats.map((c: any) => c.amountRSD), 1)
  const pace = signals?.pace
  const spendThisMonth = allCats.reduce((s: number, c: any) => s + c.amountRSD, 0) + [...dashboard.personalExpenses, ...dashboard.businessExpenses].filter((c: any) => !allCats.includes(c)).reduce((s: number, c: any) => s + c.amountRSD, 0)

  return (
    <div style={{
      minHeight: '100dvh', color: '#fff', fontFamily: 'inherit', padding: '28px 20px 60px',
      background: 'radial-gradient(1200px 600px at 15% -10%, rgba(255,138,61,0.18), transparent 60%), radial-gradient(900px 500px at 100% 0%, rgba(122,80,64,0.15), transparent 55%), #0b0b0d',
    }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)' }}>Hey, Luka 👋</p>
            <h1 style={{ fontSize: 26, fontWeight: 800, marginTop: 2 }}>Here's your money today</h1>
          </div>
          <Switcher />
        </div>

        {/* Hero net worth */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Net worth</p>
          <p style={{ fontSize: 56, fontWeight: 800, lineHeight: 1, textShadow: '0 0 40px rgba(255,138,61,0.35)' }}>{formatEUR(dashboard.totals.totalEUR)}</p>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', marginTop: 6, fontFamily: 'monospace' }}>{formatRSD(dashboard.totals.totalRSD)}</p>
        </div>

        {/* Stat row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
          {[
            { label: 'Spent this month', value: formatRSD(spendThisMonth) },
            { label: 'Net income', value: formatRSD(dashboard.income.totalNetRSD) },
            { label: 'Accounts', value: `${dashboard.accounts.length} tracked` },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '18px 20px', backdropFilter: 'blur(12px)' }}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>{s.label}</p>
              <p style={{ fontSize: 20, fontWeight: 700, fontFamily: 'monospace' }}>{s.value}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 280px', gap: 16 }}>
          {/* Category bars */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 22, backdropFilter: 'blur(12px)' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.8)', marginBottom: 16 }}>Spending by category</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {allCats.length === 0 && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>Nothing logged this month yet.</p>}
              {allCats.map((c: any, i: number) => (
                <div key={c.category}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>{c.category}</span>
                    <span style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)' }}>{formatRSD(c.amountRSD)}</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.max((c.amountRSD / maxCat) * 100, 3)}%`, background: BAR_COLORS[i % BAR_COLORS.length], borderRadius: 999 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gauge */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 22, backdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {pace ? (
              <RadialGauge pct={pace.spentPct} label="Spending pace" sublabel={pace.status === 'ahead' ? 'ahead of usual' : pace.status === 'behind' ? 'behind usual' : 'on track'} />
            ) : (
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>Not enough history yet for a pace reading.</p>
            )}
          </div>
        </div>

        {/* Accounts strip */}
        <div style={{ marginTop: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.8)', marginBottom: 12 }}>Accounts</p>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 6 }}>
            {dashboard.accounts.map((a: any) => (
              <div key={a.id} style={{ minWidth: 160, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '14px 16px', flexShrink: 0 }}>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>{a.name}</p>
                <p style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace' }}>{a.currency === 'EUR' ? formatEUR(a.currentBalance) : formatRSD(a.currentBalance)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
