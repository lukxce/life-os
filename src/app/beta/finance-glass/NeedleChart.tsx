'use client'
import { useRef, useState } from 'react'
import { formatRSD } from '@/lib/utils'

type Point = { x: number; y: number }

// Catmull-Rom → cubic bezier, for the smoothed momentum curve.
function smoothPath(points: Point[]): string {
  if (points.length < 2) return ''
  const pts = [points[0], ...points, points[points.length - 1]]
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < pts.length - 2; i++) {
    const p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2]
    const cp1x = p1.x + (p2.x - p0.x) / 6, cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6, cp2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`
  }
  return d
}

export function NeedleChart({ daily, todayIndex }: { daily: number[]; todayIndex: number }) {
  const [hover, setHover] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const W = 640, H = 200, PAD_TOP = 28, PAD_BOTTOM = 4, PAD_L = 6, PAD_R = 46
  const plotW = W - PAD_L - PAD_R, plotH = H - PAD_TOP - PAD_BOTTOM
  const n = daily.length
  const max = Math.max(...daily, 1)
  const step = plotW / (n - 1 || 1)

  const barX = (i: number) => PAD_L + i * step
  const barY = (v: number) => PAD_TOP + plotH - Math.max((v / max) * plotH, v > 0 ? 4 : 3)
  const barH = (v: number) => Math.max((v / max) * plotH, v > 0 ? 4 : 3)

  // 3-day trailing moving average, only through today (rest stays flat/zero).
  const curvePoints: Point[] = daily.map((_, i) => {
    const start = Math.max(0, i - 2)
    const window = daily.slice(start, i + 1).filter((_, j) => start + j <= todayIndex)
    const avg = window.length ? window.reduce((s, v) => s + v, 0) / window.length : 0
    return { x: barX(i), y: PAD_TOP + plotH - (avg / max) * plotH }
  })

  const peakIndex = daily.reduce((best, v, i) => (v > daily[best] ? i : best), 0)
  const activeIndex = hover ?? (daily[peakIndex] > 0 ? peakIndex : null)

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const xFrac = (e.clientX - rect.left) / rect.width
    const xSvg = xFrac * W
    const idx = Math.round((xSvg - PAD_L) / step)
    setHover(Math.max(0, Math.min(n - 1, idx)))
  }

  const yTicks = [0, 0.5, 1].map(f => ({ y: PAD_TOP + plotH * (1 - f), label: Math.round(max * f) }))

  return (
    <div style={{ position: 'relative' }}>
      {/* Period labels above the chart */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: `0 ${PAD_R}px 0 ${PAD_L}px`, marginBottom: 6 }}>
        {[1, Math.round(n / 4), Math.round(n / 2), Math.round((3 * n) / 4), n].map((d, i) => (
          <span key={i} style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'rgba(20,37,34,0.4)' }}>D{d}</span>
        ))}
      </div>

      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ cursor: 'crosshair', display: 'block' }}
        onMouseMove={handleMove} onMouseLeave={() => setHover(null)}>
        {/* Right-edge y-ticks */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={PAD_L} y1={t.y} x2={W - PAD_R + 6} y2={t.y} stroke="rgba(20,37,34,0.08)" strokeWidth="1" />
            <text x={W - PAD_R + 10} y={t.y + 3} fontSize="9" fill="rgba(20,37,34,0.4)">{t.label >= 1000 ? `${Math.round(t.label / 1000)}k` : t.label}</text>
          </g>
        ))}

        {/* Needles */}
        {daily.map((v, i) => (
          <rect key={i} x={barX(i) - 2} y={barY(v)} width={4} height={barH(v)} rx={2}
            fill={i === activeIndex && v > 0 ? '#e2f463' : 'rgba(255,255,255,0.85)'} />
        ))}

        {/* Momentum curve + soft area fill */}
        <path d={`${smoothPath(curvePoints)} L ${curvePoints[curvePoints.length - 1].x} ${PAD_TOP + plotH} L ${curvePoints[0].x} ${PAD_TOP + plotH} Z`}
          fill="rgba(201,220,124,0.34)" stroke="none" />
        <path d={smoothPath(curvePoints)} fill="none" stroke="#c9dc7c" strokeWidth="2.4" strokeLinecap="round" />

        {/* Crosshair */}
        {activeIndex != null && (
          <line x1={barX(activeIndex)} y1={PAD_TOP} x2={barX(activeIndex)} y2={PAD_TOP + plotH} stroke="rgba(20,37,34,0.15)" strokeWidth="1" strokeDasharray="2 3" />
        )}
      </svg>

      {/* Tooltip flag pinned to active period */}
      {activeIndex != null && (
        <div style={{
          position: 'absolute', left: `${(barX(activeIndex) / W) * 100}%`, top: 0,
          transform: `translateX(${activeIndex > n * 0.7 ? '-100%' : activeIndex < n * 0.15 ? '0%' : '-50%'})`,
          background: '#fdfef2', borderRadius: 12, padding: '9px 13px', boxShadow: '0 10px 28px rgba(28,40,42,0.22)',
          fontSize: 11, lineHeight: 1.6, pointerEvents: 'none', zIndex: 5, minWidth: 118,
        }}>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'rgba(20,37,34,0.45)', marginBottom: 3 }}>Day {activeIndex + 1}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: 2, background: '#e2f463', flexShrink: 0 }} />
            <span style={{ fontWeight: 700, color: '#142522' }}>{formatRSD(daily[activeIndex])}</span>
          </div>
        </div>
      )}
    </div>
  )
}
