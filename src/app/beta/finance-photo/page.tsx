'use client'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { useFinanceBetaData } from '@/hooks/useFinanceBetaData'
import { formatRSD, formatEUR } from '@/lib/utils'
import { GrainMesh } from '@/components/beta/GrainMesh'
import { IconRail } from '@/components/beta/IconRail'
import { glassStyle } from '@/components/beta/glass'

function Switcher() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {[['finance-dark', 'Dark'], ['finance-sage', 'Sage'], ['finance-photo', 'Photo']].map(([href, label]) => (
        <Link key={href} href={`/beta/${href}`}
          style={{
            fontSize: 11, fontWeight: 600, padding: '5px 11px', borderRadius: 999, textDecoration: 'none',
            background: href === 'finance-photo' ? '#4fa3c4' : 'rgba(255,255,255,0.12)',
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
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="11" />
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
      <text x="50" y="60" textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.55)">{centerSub}</text>
    </svg>
  )
}

function MiniRing({ pct }: { pct: number }) {
  const r = 15, c = 2 * Math.PI * r
  const filled = Math.max(0, Math.min(pct, 100)) / 100
  return (
    <svg width="38" height="38" viewBox="0 0 38 38">
      <circle cx="19" cy="19" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
      <circle cx="19" cy="19" r={r} fill="none" stroke={pct >= 100 ? '#4ee08a' : '#4fa3c4'} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - filled)} transform="rotate(-90 19 19)" />
    </svg>
  )
}

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function FinancePhotoBeta() {
  const { dashboard, signals, loading } = useFinanceBetaData()

  if (loading || !dashboard) {
    return (
      <div style={{ minHeight: '100dvh', position: 'relative' }}>
        <GrainMesh tone="cool" />
        <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)' }}>Loading…</div>
      </div>
    )
  }

  const allCats = [...dashboard.personalExpenses, ...dashboard.businessExpenses]
    .filter((c: any) => c.amountRSD > 0).sort((a: any, b: any) => b.amountRSD - a.amountRSD).slice(0, 5)
  const maxCat = Math.max(...allCats.map((c: any) => c.amountRSD), 1)
  const personalSpend = dashboard.personalExpenses.reduce((s: number, c: any) => s + c.amountRSD, 0)
  const businessSpend = dashboard.businessExpenses.reduce((s: number, c: any) => s + c.amountRSD, 0)
  const totalSpend = personalSpend + businessSpend
  const budgets = signals?.budgetsNearLimit ?? []
  const bills = signals?.billsDueSoon ?? []
  const todayIdx = new Date().getDay()
  const pace = signals?.pace

  return (
    <div style={{ minHeight: '100dvh', color: '#fff', position: 'relative' }}>
      <GrainMesh tone="cool" />
      <IconRail />

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 20px 60px 90px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.05em' }}>Money Stats</p>
          <Switcher />
        </div>

        {/* Genuinely translucent — low opacity + strong blur, real detail behind it */}
        <div style={{ ...glassStyle({ opacity: 0.06, blur: 32 }), borderRadius: 30, padding: 26 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
            <div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>Net worth</p>
              <p style={{ fontSize: 32, fontWeight: 800, marginTop: 2, letterSpacing: '-0.02em' }}>{formatEUR(dashboard.totals.totalEUR)}</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace', marginTop: 2 }}>{formatRSD(dashboard.totals.totalRSD)}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Bell size={16} color="rgba(255,255,255,0.6)" />
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>LJ</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, alignItems: 'center', marginBottom: 22 }}>
            <div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 10 }}>Top spending</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 96 }}>
                {allCats.map((c: any, i: number) => (
                  <div key={c.category} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.45)', marginBottom: 3 }}>{Math.round((c.amountRSD / maxCat) * 100)}%</span>
                    <div style={{
                      width: '100%', maxWidth: 22, borderRadius: 6,
                      height: `${Math.max((c.amountRSD / maxCat) * 62, 6)}px`,
                      background: i === 0 ? '#4fa3c4' : 'rgba(255,255,255,0.28)',
                    }} />
                    <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', marginTop: 6, textAlign: 'center', lineHeight: 1.2 }}>{c.category.split(' ')[0]}</p>
                  </div>
                ))}
                {allCats.length === 0 && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Nothing logged this month.</p>}
              </div>
            </div>

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

          {/* Income + pace pills */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
            {[
              { label: 'Net income', value: formatRSD(dashboard.income.totalNetRSD) },
              { label: 'Spend pace', value: pace ? `${pace.spentPct}%` : '—' },
            ].map(s => (
              <div key={s.label} style={{ ...glassStyle({ opacity: 0.05, blur: 12 }), flex: 1, borderRadius: 14, padding: '10px 14px' }}>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{s.label}</p>
                <p style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', marginTop: 2 }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Challenges-style: budgets + bills with mini progress rings */}
          {(budgets.length > 0 || bills.length > 0) && (
            <div style={{ marginBottom: 18 }}>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 10 }}>On your radar</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {budgets.slice(0, 2).map((b: any, i: number) => (
                  <div key={`bud-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 12, ...glassStyle({ opacity: 0.05, blur: 12 }), borderRadius: 14, padding: '9px 12px' }}>
                    <MiniRing pct={b.pct} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 600 }}>{b.category}</p>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{formatRSD(b.spent)} / {formatRSD(b.limit)}</p>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap',
                      background: b.pct >= 100 ? 'rgba(226,102,79,0.22)' : 'rgba(79,163,196,0.22)',
                      color: b.pct >= 100 ? '#f28a75' : '#7fc4e0',
                    }}>{b.pct >= 100 ? 'Over' : 'On Going'}</span>
                  </div>
                ))}
                {bills.slice(0, 2).map((bl: any) => (
                  <div key={bl.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...glassStyle({ opacity: 0.05, blur: 12 }), borderRadius: 14, padding: '9px 12px' }}>
                    <p style={{ fontSize: 12, fontWeight: 600 }}>{bl.name}</p>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
                      background: bl.daysUntil <= 0 ? 'rgba(226,102,79,0.22)' : 'rgba(242,184,75,0.22)',
                      color: bl.daysUntil <= 0 ? '#f28a75' : '#f2c96f',
                    }}>{bl.daysUntil < 0 ? `${Math.abs(bl.daysUntil)}d overdue` : bl.daysUntil === 0 ? 'due today' : `due ${bl.daysUntil}d`}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Calendar week strip */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {DAYS.map((d, i) => (
                <div key={i} style={{
                  width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700,
                  background: i === todayIdx ? '#4fa3c4' : 'transparent', color: i === todayIdx ? '#fff' : 'rgba(255,255,255,0.4)',
                }}>{d}</div>
              ))}
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>Net income</p>
              <p style={{ fontSize: 13, fontWeight: 700 }}>{formatRSD(dashboard.income.totalNetRSD)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
