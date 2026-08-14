import type { CSSProperties } from 'react'

// A real glassmorphism recipe: strong blur+saturate, a lighter top edge
// (light catching the rim of actual glass), and an inset highlight — not
// just a translucent flat color. Needs a detailed background (GrainMesh)
// behind it to actually read as frosted; blurring a smooth gradient looks
// identical to not blurring it.
export function glassStyle(opts?: { opacity?: number; blur?: number }): CSSProperties {
  const { opacity = 0.07, blur = 28 } = opts ?? {}
  return {
    background: `rgba(255,255,255,${opacity})`,
    backdropFilter: `blur(${blur}px) saturate(160%)`,
    WebkitBackdropFilter: `blur(${blur}px) saturate(160%)`,
    border: '1px solid rgba(255,255,255,0.14)',
    borderTop: '1px solid rgba(255,255,255,0.32)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.1)',
  }
}
