'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  const from = searchParams.get('from') || '/'

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
    }
  }

  const press = (val: string) => {
    if (loading) return
    if (val === '←') { setPin(p => p.slice(0, -1)); return }
    const next = pin + val
    setPin(next)
    if (next.length >= 4) submit(next)
  }

  const KEYS = ['1','2','3','4','5','6','7','8','9','','0','←']

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-xs space-y-8">
        <div className="text-center">
          <div className="text-4xl mb-3">✅</div>
          <h1 className="text-xl font-bold text-white">Life OS</h1>
          <p className="text-sm text-gray-400 mt-1">Enter your PIN to continue</p>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-4">
          {[0,1,2,3].map(i => (
            <div key={i} className={`w-3 h-3 rounded-full transition-all duration-150 ${
              error ? 'bg-red-500 scale-110' :
              i < pin.length ? 'bg-white scale-110' : 'bg-gray-700'
            }`} />
          ))}
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3">
          {KEYS.map((k, i) => (
            k === '' ? <div key={i} /> :
            <button
              key={i}
              onClick={() => press(k)}
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

        {error && (
          <p className="text-center text-red-400 text-sm animate-pulse">Incorrect PIN</p>
        )}
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
