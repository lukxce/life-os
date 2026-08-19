'use client'
import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Card, Label } from '@/components/ledger/primitives'

// Cross-module findings — spending vs. workouts, spending vs. habit
// completion, mood vs. habit completion — computed once server-side
// (src/lib/patterns.ts) and shared with the one mascot nudge that surfaces
// the strongest one. Nothing here is module-specific the way Signals
// (finance) or nudges (mostly single-module) are; self-hides entirely
// until there's enough history to say something real.
export function PatternsCard() {
  const [findings, setFindings] = useState<{ id: string; text: string }[] | null>(null)

  useEffect(() => {
    fetch('/api/life/patterns', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setFindings(d.findings ?? []))
      .catch(() => setFindings([]))
  }, [])

  if (!findings || findings.length === 0) return null

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <Sparkles size={14} className="text-ldg-green" />
        <Label>Patterns</Label>
      </div>
      <div className="mt-2 space-y-2">
        {findings.map(f => (
          <p key={f.id} className="text-[14px] text-ldg-ink leading-snug">{f.text}</p>
        ))}
      </div>
    </Card>
  )
}
