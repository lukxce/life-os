// A fixed, full-bleed backdrop with real color/edge detail (bold blurred
// blobs) plus a grain layer — so a glass panel's backdrop-filter actually
// has something to visibly distort. A backdrop-blur over a smooth 3-stop
// CSS gradient reads as flat because there's no detail behind it to blur;
// this gives it real texture, the same way a blurred photo does in the
// reference designs, without hot-linking an external image.
export function GrainMesh({ tone }: { tone: 'warm' | 'cool' | 'sage' }) {
  const blobs = tone === 'warm'
    ? [
        { cx: 15, cy: 12, r: 34, color: '#ff8a3d', o: 0.55 },
        { cx: 82, cy: 8, r: 28, color: '#c94f37', o: 0.4 },
        { cx: 92, cy: 55, r: 30, color: '#4a2f22', o: 0.6 },
        { cx: 10, cy: 70, r: 32, color: '#7a4a2e', o: 0.45 },
        { cx: 55, cy: 90, r: 38, color: '#1a1210', o: 0.7 },
        { cx: 48, cy: 40, r: 26, color: '#e8674f', o: 0.25 },
      ]
    : tone === 'cool'
    ? [
        { cx: 12, cy: 15, r: 32, color: '#4fa3c4', o: 0.5 },
        { cx: 85, cy: 10, r: 30, color: '#7a5ec8', o: 0.35 },
        { cx: 90, cy: 60, r: 34, color: '#123047', o: 0.65 },
        { cx: 8, cy: 75, r: 30, color: '#1c4a63', o: 0.5 },
        { cx: 55, cy: 92, r: 36, color: '#0a1626', o: 0.7 },
        { cx: 45, cy: 42, r: 24, color: '#6fc4d8', o: 0.22 },
      ]
    : [
        // Muted, desaturated blue-gray-green — not "sage" as in bright
        // mint. The reference is mostly neutral gray with black/white and
        // one sparse chartreuse accent, never a green wash.
        { cx: 12, cy: 10, r: 36, color: '#8b9c94', o: 0.5 },
        { cx: 85, cy: 5, r: 30, color: '#a4b3ac', o: 0.4 },
        { cx: 92, cy: 55, r: 34, color: '#6f8880', o: 0.4 },
        { cx: 6, cy: 68, r: 32, color: '#b0bdb6', o: 0.5 },
        { cx: 50, cy: 92, r: 40, color: '#7e938a', o: 0.35 },
        { cx: 45, cy: 38, r: 22, color: '#cddc39', o: 0.12 },
      ]
  const base = tone === 'warm' ? '#0b0b0d' : tone === 'cool' ? '#0a1626' : '#c7d0ca'
  const grainMatrix = tone === 'sage'
    ? '0 0 0 0 0.1  0 0 0 0 0.18  0 0 0 0 0.1  0 0 0 0.04 0' // faint dark grain, visible on light
    : '0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.05 0' // faint white grain, visible on dark

  return (
    <svg
      aria-hidden
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: -1 }}
      preserveAspectRatio="xMidYMid slice" viewBox="0 0 100 100"
    >
      <defs>
        <filter id={`blur-${tone}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <filter id={`grain-${tone}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" result="noise" />
          <feColorMatrix in="noise" type="matrix" values={grainMatrix} />
        </filter>
      </defs>
      <rect width="100" height="100" fill={base} />
      <g filter={`url(#blur-${tone})`}>
        {blobs.map((b, i) => (
          <circle key={i} cx={b.cx} cy={b.cy} r={b.r} fill={b.color} opacity={b.o} />
        ))}
      </g>
      <rect width="100" height="100" filter={`url(#grain-${tone})`} opacity={0.5} />
    </svg>
  )
}
