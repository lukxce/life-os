'use client'
import { useRef, useState } from 'react'

interface Props {
  value: number
  target: number
  unit: string
  color?: string | null
  onUpdate: (val: number) => void
}

export function QuantityInput({ value, target, unit, color, onUpdate }: Props) {
  const pct = Math.min(100, target > 0 ? (value / target) * 100 : 0)
  const barColor = color ?? 'rgb(var(--l-green))'
  const done = pct >= 100
  const containerRef = useRef<HTMLDivElement>(null)
  const [editing, setEditing] = useState(false)
  const [inputVal, setInputVal] = useState(String(value))
  const activeColor = done ? 'rgb(var(--l-green))' : barColor

  function commit(v: number) {
    onUpdate(Math.max(0, Math.min(Math.round(v), target * 2)))
  }

  function updateFromPointer(clientX: number) {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    commit(ratio * target)
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    ;(e.target as Element).setPointerCapture(e.pointerId)
    updateFromPointer(e.clientX)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.buttons === 0) return
    updateFromPointer(e.clientX)
  }

  return (
    <div
      ref={containerRef}
      className="relative rounded-xl overflow-hidden cursor-ew-resize select-none border border-black/5 dark:border-white/5 touch-none"
      style={{ background: `linear-gradient(90deg, ${activeColor}25 ${pct}%, transparent ${pct}%)` }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
    >
      <div className="flex items-center justify-between px-4 py-3 pointer-events-none">
        {editing ? (
          <input
            autoFocus
            type="number"
            className="w-20 text-sm font-semibold bg-transparent outline-none pointer-events-auto"
            value={inputVal}
            onClick={e => e.stopPropagation()}
            onChange={e => setInputVal(e.target.value)}
            onBlur={() => { commit(Number(inputVal) || 0); setEditing(false) }}
            onKeyDown={e => { if (e.key === 'Enter') { commit(Number(inputVal) || 0); setEditing(false) } }}
          />
        ) : (
          <button
            className="text-sm font-semibold pointer-events-auto"
            onClick={e => { e.stopPropagation(); setInputVal(String(value)); setEditing(true) }}
          >
            {value.toLocaleString()}
            <span className="text-ldg-ink/55 font-normal text-xs"> / {target.toLocaleString()} {unit}</span>
          </button>
        )}
        <span className="text-xs font-bold" style={{ color: activeColor }}>
          {Math.round(pct)}%
        </span>
      </div>
    </div>
  )
}
