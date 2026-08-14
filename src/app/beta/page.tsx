import Link from 'next/link'

const STYLES = [
  {
    href: '/beta/finance-dark',
    name: 'Dark Cinematic',
    desc: 'Near-black, amber glow, radial gauge — sporty/performance mood.',
    swatch: 'linear-gradient(135deg, #0b0b0d 0%, #1a1410 60%, #ff8a3d 130%)',
  },
  {
    href: '/beta/finance-sage',
    name: 'Sage Glass',
    desc: 'Light, soft green glassmorphism — calm, minimal, airy.',
    swatch: 'linear-gradient(135deg, #eef4ee 0%, #cfe3cf 60%, #6fae7b 130%)',
  },
  {
    href: '/beta/finance-photo',
    name: 'Photo Glass',
    desc: 'Full-bleed moody gradient backdrop, frosted glass panel floating on top.',
    swatch: 'linear-gradient(135deg, #0a1a2a 0%, #16344a 55%, #2f6f8f 130%)',
  },
]

export default function BetaIndexPage() {
  return (
    <div style={{ minHeight: '100dvh', background: '#0e0e10', color: '#fff', padding: '48px 20px' }}>
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
          Design exploration
        </p>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Finance Overview — 3 styles</h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', marginBottom: 36, maxWidth: 560 }}>
          Same real data (net worth, accounts, spend, income, pace) in three different visual directions. Pick a favorite, or none — the real dashboard is untouched.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
          {STYLES.map(s => (
            <Link key={s.href} href={s.href} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{
                borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.03)', transition: 'transform 0.2s, border-color 0.2s',
              }}>
                <div style={{ height: 120, background: s.swatch }} />
                <div style={{ padding: '16px 18px' }}>
                  <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{s.name}</p>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>{s.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
        <Link href="/finance" style={{ display: 'inline-block', marginTop: 36, fontSize: 13, color: 'rgba(255,255,255,0.4)', textDecoration: 'underline' }}>
          ← Back to the real Finance dashboard
        </Link>
      </div>
    </div>
  )
}
