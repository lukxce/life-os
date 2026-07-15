'use client'
import { useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import { compressImage } from '@/lib/image'

interface Props {
  onResult: (description: string, calories: number | null, protein: number | null) => void
  onError?: (msg: string) => void
  className?: string
  disabled?: boolean
}

// Camera/upload button that turns a plate photo into a description +
// AI-estimated calories/protein via POST /api/life/meal-log/photo. Shared
// across every meal-logging surface (fitness page, Home's Now card and
// Outstanding card, the floating mascot) so there's one capture flow.
export function MealPhotoButton({ onResult, onError, className, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)

  async function handleFile(file: File) {
    setLoading(true)
    try {
      const { base64, mediaType } = await compressImage(file, 1024, 0.8)
      const res = await fetch('/api/life/meal-log/photo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mediaType }),
      })
      const data = await res.json()
      if (data.error || !data.description) {
        onError?.(data.error ? 'Photo scan failed — try typing it instead.' : "Couldn't tell what's in that photo — try typing it instead.")
        return
      }
      onResult(data.description, data.calories, data.protein)
    } catch {
      onError?.('Could not process the photo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
      <button type="button" onClick={() => inputRef.current?.click()} disabled={disabled || loading}
        className={className ?? 'flex items-center justify-center w-9 h-9 shrink-0 rounded-lg border border-ldg-ink/10 text-ldg-ink/55 disabled:opacity-40'}>
        {loading ? <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" /> : <Camera size={15} />}
      </button>
    </>
  )
}
