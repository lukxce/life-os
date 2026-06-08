'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const from = searchParams.get('from') || '/'

  // Focus hidden input on mount so keyboard works on desktop.
  // Skip on touch devices (mobile/tablet) — use the on-screen numpad instead.
  useEffect(() => {
    const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches
    if (!isTouch) inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(false), 1200); return () => clearTimeout(t) }
  }, [error])

  const submit = async (value: string) => {
    if (value.length < 4) return
    setLoading(true)
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: value }),
    })
    if (res.ok) {
      router.replace(from)
    } else {
      setPin('')
      setError(true)
      setLoading(false)
      const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches
      if (!isTouch) setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const press = (val: string) => {
    if (loading) return
    if (val === '←') { setPin(p => p.slice(0, -1)); return }
    const next = pin + val
    if (next.length > 8) return
    setPin(next)
  }

  // Keyboard input via hidden field
  const handleKeyInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (loading) return
    const val = e.target.value.replace(/\D/g, '').slice(0, 8)
    setPin(val)
    e.target.value = ''
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && pin.length >= 4) submit(pin)
    if (e.key === 'Backspace') setPin(p => p.slice(0, -1))
  }

  const KEYS = ['1','2','3','4','5','6','7','8','9','','0','←']

  const dots = Array.from({ length: Math.max(4, pin.length) })

  return (
    <div
      className="min-h-screen bg-gray-950 flex items-center justify-center px-4"
      onClick={() => {
        const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches
        if (!isTouch) inputRef.current?.focus()
      }}
    >
      {/* Hidden input captures keyboard */}
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        className="sr-only"
        onChange={handleKeyInput}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />

      <div className="w-full max-w-xs space-y-8">
        <div className="text-center">
          <div className="text-4xl mb-3">✅</div>
          <h1 className="text-xl font-bold text-white">Life OS</h1>
          <p className="text-sm text-gray-400 mt-1">Enter your PIN to continue</p>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-4">
          {loading ? (
            // Spinner while authenticating
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
              <span className="text-sm text-gray-400">Checking…</span>
            </div>
          ) : (
            dots.map((_, i) => (
              <div key={i} className={`w-3 h-3 rounded-full transition-all duration-150 ${
                error ? 'bg-red-500 scale-110' :
                i < pin.length ? 'bg-white scale-110' : 'bg-gray-700'
              }`} />
            ))
          )}
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3">
          {KEYS.map((k, i) => (
            k === '' ? <div key={i} /> :
            <button
              key={i}
              onClick={() => {
                press(k)
                const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches
                if (!isTouch) inputRef.current?.focus()
              }}
              disabled={loading}
              className={`h-16 rounded-2xl text-xl font-semibold transition-all active:scale-95 disabled:opacity-40 ${
                k === '←'
                  ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  : 'bg-gray-800 text-white hover:bg-gray-700 active:bg-gray-600'
              }`}
            >
              {k}
            </button>
          ))}
        </div>

        {/* Enter button — visible once PIN is long enough */}
        <button
          onClick={() => submit(pin)}
          disabled={pin.length < 4 || loading}
          className="w-full h-14 rounded-2xl font-semibold text-base transition-all active:scale-95 disabled:opacity-30 bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-2"
        >
          {loading
            ? <><div className="w-4 h-4 border-2 border-indigo-300 border-t-white rounded-full animate-spin" /> Checking…</>
            : 'Enter →'
          }
        </button>

        {error && (
          <p className="text-center text-red-400 text-sm animate-pulse">Incorrect PIN</p>
        )}

        <p className="text-center text-xs text-gray-600">You can also type with your keyboard</p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
