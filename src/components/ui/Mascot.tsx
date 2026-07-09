'use client'
import { cn } from '@/lib/utils'

export type MascotMood = 'content' | 'curious' | 'pleased' | 'sleepy'

// A single, consistent character — same jade body color always, only the
// face changes. Recognizability comes from repetition, not variation.
const BLOB_PATH = 'M50 6C74 6 92 24 92 48C92 70 76 92 50 92C24 92 8 70 8 48C8 24 26 6 50 6Z'

function Face({ mood }: { mood: MascotMood }) {
  switch (mood) {
    case 'pleased':
      return (
        <>
          <circle cx="37" cy="46" r="4.5" fill="#2a1d17" />
          <circle cx="63" cy="46" r="4.5" fill="#2a1d17" />
          <path d="M34 60 Q50 74 66 60" stroke="#2a1d17" strokeWidth="4.5" strokeLinecap="round" fill="none" />
        </>
      )
    case 'curious':
      return (
        <>
          <circle cx="36" cy="47" r="4" fill="#2a1d17" />
          <circle cx="64" cy="44" r="4.5" fill="#2a1d17" />
          <path d="M42 62 Q50 66 58 61" stroke="#2a1d17" strokeWidth="4.5" strokeLinecap="round" fill="none" />
          <path d="M56 34 Q64 30 70 34" stroke="#2a1d17" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        </>
      )
    case 'sleepy':
      return (
        <>
          <path d="M31 46 Q37 42 43 46" stroke="#2a1d17" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M57 46 Q63 42 69 46" stroke="#2a1d17" strokeWidth="4" strokeLinecap="round" fill="none" />
          <circle cx="50" cy="61" r="3" fill="#2a1d17" />
        </>
      )
    default: // content
      return (
        <>
          <circle cx="37" cy="47" r="4.5" fill="#2a1d17" />
          <circle cx="63" cy="47" r="4.5" fill="#2a1d17" />
          <path d="M38 60 Q50 68 62 60" stroke="#2a1d17" strokeWidth="4.5" strokeLinecap="round" fill="none" />
        </>
      )
  }
}

export function Mascot({
  mood = 'content', size = 56, idle = true, className,
}: { mood?: MascotMood; size?: number; idle?: boolean; className?: string }) {
  return (
    <div className={cn('relative', idle && 'mascot-idle', className)} style={{ width: size, height: size }}>
      {/* Box-shadow glow, not a blurred radial-gradient layer — the gradient
          version blended invisibly into the warm ivory canvas since jade at
          low opacity read almost the same as the background behind it */}
      <div aria-hidden className={cn('absolute inset-0 rounded-full', idle && 'mascot-glow')} />
      <svg viewBox="0 0 100 100" className="relative w-full h-full drop-shadow-sm">
        <path d={BLOB_PATH} fill="rgb(var(--jade))" />
        <Face mood={mood} />
      </svg>
    </div>
  )
}
