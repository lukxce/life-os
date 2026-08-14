'use client'
import Link from 'next/link'
import { useFinanceBetaData } from '@/hooks/useFinanceBetaData'
import { formatRSD, formatEUR } from '@/lib/utils'

function Switcher() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <Link href="/beta" style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>← All styles</Link>
      {[['finance-dark', 'Dark'], ['finance-sage', 'Sage'], ['finance-photo', 'Photo']].map(([href, label]) => (
        <Link key={href} href={`/beta/${href}`}
          style={{
            fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 999, textDecoration: 'none',
            background: href === 'finance-photo' ? '#4fa3c4' : 'rgba(255,255,255,0.1)',
            color: '#fff',
          }}>{label}</Link>
      ))}
    </div>
  )
}

function DonutRing({ segments, centerLabel, centerSub }: { segments: { value: number; color: string }[]; centerLabel: string; centerSub: string }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  const r = 42, c = 2 * Math.PI * r
  let offset = 0
  return (
    <svg width="140" height="140" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="11" />
      {segments.map((s, i) => {
        const frac = s.value / total
        const dash = frac * c
        const el = (
          <circle key={i} cx="50" cy="50" r={r} fill="none" stroke={s.color} strokeWidth="11" strokeLinecap="round"
            strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-offset}
            transform="rotate(-90 50 50)" style={{ transition: 'stroke-dasharray 0.8s ease' }} />
        )
        offset += dash
        return el
      })}
      <text x="50" y="47" textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff">{centerLabel}</text>
      <text x="50" y="60" textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.5)">{centerSub}</text>
    </svg>
  )
}

export default function FinancePhotoBeta() {
  const { dashboard, signals, loading } = useFinanceBetaData()

  if (loading || !dashboard) {
    return <div style={{ minHeight: '100dvh', background: '#0a1a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)' }}>Loading…</div>
  }

  const allCats = [...dashboard.personalExpenses, ...dashboard.businessExpenses]
    .filter((c: any) => c.amountRSD > 0).sort((a: any, b: any) => b.amountRSD - a.amountRSD).slice(0, 5)
  const maxCat = Math.max(...allCats.map((c: any) => c.amountRSD), 1)
  const personalSpend = dashboard.personalExpenses.reduce((s: number, c: any) => s + c.amountRSD, 0)
  const businessSpend = dashboard.businessExpenses.reduce((s: number, c: any) => s + c.amountRSD, 0)
  const totalSpend = personalSpend + businessSpend
  const budgets = signals?.budgetsNearLimit ?? []
  const bills = signals?.billsDueSoon ?? []

  return (
    <div style={{
      minHeight: '100dvh', fontFamily: 'inherit', color: '#fff', padding: '32px 16px 60px',
      background: `
        radial-gradient(900px 500px at 15% 10%, rgba(79,163,196,0.25), transparent 60%),
        radial-gradient(700px 450px at 85% 85%, rgba(120,90,200,0.18), transparent 55%),
        linear-gradient(160deg, #0a1626 0%, #123047 45%, #1c4a63 100%)
      `,
    }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.05em' }}>Money Stats</p>
          <Switcher />
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.18)', borderRadius: 28, padding: 24,
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
            <div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>Net worth</p>
              <p style={{ fontSize: 30, fontWeight: 800, marginTop: 2 }}>{formatEUR(dashboard.totals.totalEUR)}</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace', marginTop: 2 }}>{formatRSD(dashboard.totals.totalRSD)}</p>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>LJ</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, alignItems: 'center', marginBottom: 22 }}>
            {/* Bars */}
            <div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 10 }}>Top spending</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 90 }}>
                {allCats.map((c: any, i: number) => (
                  <div key={c.category} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <div style={{
                      width: '100%', maxWidth: 22, borderRadius: 6,
                      height: `${Math.max((c.amountRSD / maxCat) * 74, 6)}px`,
                      background: i === 0 ? '#4fa3c4' : 'rgba(255,255,255,0.25)',
                    }} />
                    <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', marginTop: 6, textAlign: 'center', lineHeight: 1.2 }}>{c.category.split(' ')[0]}</p>
                  </div>
                ))}
                {allCats.length === 0 && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Nothing logged this month.</p>}
              </div>
            </div>

            {/* Donut */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <DonutRing
                segments={[{ value: personalSpend, color: '#4fa3c4' }, { value: businessSpend, color: '#f2b84b' }]}
                centerLabel={`${(totalSpend / 1000).toFixed(0)}k`} centerSub="RSD spent" />
              <div style={{ display: 'flex', gap: 12, fontSize: 10 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.6)' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4fa3c4' }} />Personal
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.6)' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f2b84b' }} />Business
                </span>
              </div>
            </div>
          </div>

          {/* Income strip */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
            {[
              { label: 'Net income', value: formatRSD(dashboard.income.totalNetRSD) },
              { label: 'Deductions', value: formatRSD(dashboard.income.totalDeductions) },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '10px 14px' }}>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{s.label}</p>
                <p style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', marginTop: 2 }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Bills / budgets list — "Challenges" style */}
          {(budgets.length > 0 || bills.length > 0) && (
            <div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 10 }}>On your radar</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {budgets.slice(0, 3).map((b: any, i: number) => (
                  <div key={`bud-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '10px 12px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 600 }}>{b.category}</p>
                      <div style={{ height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.12)', marginTop: 6, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(b.pct, 100)}%`, background: b.pct >= 100 ? '#e2664f' : '#4fa3c4', borderRadius: 999 }} />
                      </div>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap',
                      background: b.pct >= 100 ? 'rgba(226,102,79,0.2)' : 'rgba(79,163,196,0.2)',
                      color: b.pct >= 100 ? '#f28a75' : '#7fc4e0',
                    }}>{b.pct >= 100 ? 'Over' : `${b.pct}%`}</span>
                  </div>
                ))}
                {bills.slice(0, 2).map((bl: any) => (
                  <div key={bl.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '10px 12px' }}>
                    <p style={{ fontSize: 12, fontWeight: 600 }}>{bl.name}</p>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
                      background: bl.daysUntil <= 0 ? 'rgba(226,102,79,0.2)' : 'rgba(242,184,75,0.2)',
                      color: bl.daysUntil <= 0 ? '#f28a75' : '#f2c96f',
                    }}>{bl.daysUntil < 0 ? `${Math.abs(bl.daysUntil)}d overdue` : bl.daysUntil === 0 ? 'due today' : `due ${bl.daysUntil}d`}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
