'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, X, Zap, ZapOff, Hash } from 'lucide-react'

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * PFR broj: alphanumeric string with a single dash, e.g. "ABC123XY-12345678"
 */
function isPfrBroj(text: string): boolean {
  return /^[A-Z0-9]+-[A-Z0-9]+$/i.test(text.trim())
}

/**
 * Construct the PURS receipt URL from a PFR broj.
 * The `vl` parameter is the PFR broj base64-encoded (standard, not URL-safe).
 */
function pfrToUrl(pfr: string): string {
  const encoded = typeof window !== 'undefined'
    ? btoa(pfr.trim())                                   // browser
    : Buffer.from(pfr.trim()).toString('base64')         // SSR (shouldn't run but safe)
  return `https://suf.purs.gov.rs/v/?vl=${encoded}`
}

/**
 * Accept either:
 *   - a full suf.purs.gov.rs URL  (QR code new-style, or manual paste)
 *   - a PFR broj string           (QR code old-style printers, or typed manually)
 *   - a partial URL / bare path
 */
function normaliseReceiptInput(raw: string): string | null {
  const t = raw.trim()
  if (!t) return null
  if (t.startsWith('http')) return t          // already a URL
  if (isPfrBroj(t))         return pfrToUrl(t) // PFR → construct URL
  return null
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ScanPage() {
  const router = useRouter()

  const scannerRef  = useRef<any>(null)
  const trackRef    = useRef<MediaStreamTrack | null>(null)

  const [scanning,        setScanning]        = useState(false)
  const [manualUrl,       setManualUrl]        = useState('')
  const [manualPfr,       setManualPfr]        = useState('')
  const [parsed,          setParsed]           = useState<any>(null)
  const [loading,         setLoading]          = useState(false)
  const [error,           setError]            = useState('')
  const [expenseType,     setExpenseType]      = useState<'personal' | 'business'>('personal')
  const [torchOn,         setTorchOn]          = useState(false)
  const [torchSupported,  setTorchSupported]   = useState(false)

  const handleSufUrl = async (url: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/finance/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sufUrl: url }),
      })
      const data = await res.json()
      if (data.error) setError(data.error)
      else setParsed(data)
    } catch {
      setError('Failed to parse receipt')
    }
    setLoading(false)
  }

  /** Called with whatever text the QR scanner decoded */
  const handleQrResult = useCallback((text: string) => {
    const url = normaliseReceiptInput(text)
    if (url) {
      handleSufUrl(url)
    } else {
      setError(`Unrecognised QR code: ${text.slice(0, 60)}`)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePfrSubmit = () => {
    const url = pfrToUrl(manualPfr)
    handleSufUrl(url)
  }

  const stopScanner = useCallback(async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop()
        scannerRef.current.clear()
        scannerRef.current = null
      }
    } catch {}
    trackRef.current = null
    setScanning(false)
    setTorchOn(false)
    setTorchSupported(false)
  }, [])

  const startScanner = async () => {
    setError('')
    setScanning(true)

    // html5-qrcode must be imported client-side only
    const { Html5Qrcode } = await import('html5-qrcode')

    const scanner = new Html5Qrcode('qr-reader', { verbose: false })
    scannerRef.current = scanner

    try {
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 15,
          // qrbox as a function keeps the scan region centred and appropriately sized
          qrbox: (w: number, h: number) => {
            const side = Math.floor(Math.min(w, h) * 0.72)
            return { width: side, height: side }
          },
          aspectRatio: 1,
          disableFlip: false,
        },
        (decodedText: string) => {
          stopScanner()
          handleQrResult(decodedText)
        },
        // Per-frame error: suppress (fires constantly when no QR is visible)
        () => {},
      )

      // After the stream is running, grab the video track for torch control
      await new Promise(r => setTimeout(r, 500)) // brief settle
      const videoEl = document.querySelector('#qr-reader video') as HTMLVideoElement | null
      if (videoEl?.srcObject) {
        const track = (videoEl.srcObject as MediaStream).getVideoTracks()[0]
        if (track) {
          trackRef.current = track
          const caps = track.getCapabilities() as any
          if (caps?.torch) setTorchSupported(true)
        }
      }
    } catch (err: any) {
      scannerRef.current = null
      setScanning(false)
      if (/permission|denied/i.test(String(err))) {
        setError('Camera access denied. Enter the URL or PFR broj below.')
      } else {
        setError('Could not start camera. Enter the URL or PFR broj below.')
      }
    }
  }

  const toggleTorch = async () => {
    const track = trackRef.current
    if (!track) return
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn } as any] })
      setTorchOn(v => !v)
    } catch {
      setError('Flash not available on this device')
    }
  }

  // Clean up on unmount
  useEffect(() => () => { stopScanner() }, [stopScanner])

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Scan Receipt</h2>

      {!parsed && (
        <>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
            {!scanning ? (
              <button
                onClick={startScanner}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700">
                <Camera size={18} /> Open Camera
              </button>
            ) : (
              <div className="space-y-3">
                {/* html5-qrcode renders its own video into this div */}
                <div
                  id="qr-reader"
                  className="w-full overflow-hidden rounded-xl [&_video]:w-full [&_video]:rounded-xl [&_img]:hidden [&_select]:hidden [&_#qr-reader__header_text]:hidden [&_#qr-reader__status_span]:hidden"
                />

                <div className="flex gap-2">
                  {torchSupported && (
                    <button
                      onClick={toggleTorch}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors
                        ${torchOn
                          ? 'bg-yellow-500 text-white'
                          : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                        }`}>
                      {torchOn ? <Zap size={16} /> : <ZapOff size={16} />}
                      {torchOn ? 'Flash on' : 'Flash off'}
                    </button>
                  )}
                  <button
                    onClick={stopScanner}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-2 rounded-lg text-sm font-medium">
                    <X size={16} /> Stop
                  </button>
                </div>

                <p className="text-xs text-gray-400 text-center">
                  Point camera at the QR code on the receipt
                </p>
              </div>
            )}
          </div>

          {/* ── PFR Broj fallback ── */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
            <div className="flex items-center gap-1.5">
              <Hash size={13} className="text-gray-400" />
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Enter PFR broj from the receipt
              </label>
            </div>
            <input
              value={manualPfr}
              onChange={e => setManualPfr(e.target.value.toUpperCase())}
              placeholder="ABC123XY-12345678"
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="characters"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 tracking-wider"
            />
            <button
              onClick={handlePfrSubmit}
              disabled={!isPfrBroj(manualPfr) || loading}
              className="w-full bg-gray-800 dark:bg-gray-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              {loading ? 'Looking up…' : 'Look Up Receipt'}
            </button>
            <p className="text-[10px] text-gray-400 text-center">
              Printed above the QR code — e.g. <span className="font-mono">ABC123XY-12345678</span>
            </p>
          </div>

          {/* ── Full URL fallback ── */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Or paste the receipt URL manually
            </label>
            <input
              value={manualUrl}
              onChange={e => setManualUrl(e.target.value)}
              placeholder="https://suf.purs.gov.rs/v/?vl=..."
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />
            <button
              onClick={() => handleSufUrl(manualUrl)}
              disabled={!manualUrl || loading}
              className="w-full bg-gray-800 dark:bg-gray-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              {loading ? 'Parsing…' : 'Parse Receipt'}
            </button>
          </div>
        </>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {loading && !parsed && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="animate-pulse text-gray-400">Fetching receipt details…</div>
        </div>
      )}

      {parsed && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Receipt Parsed</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Merchant</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{parsed.merchantName || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">PIB</span>
              <span className="font-mono text-xs text-gray-700 dark:text-gray-300">{parsed.merchantPib || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Date</span>
              <span className="text-gray-700 dark:text-gray-300">
                {parsed.date ? new Date(parsed.date).toLocaleString('sr-RS') : '—'}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
              <span className="text-gray-700 dark:text-gray-300 font-medium">Total</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">
                {parsed.total?.toLocaleString('sr-RS')} RSD
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">
              Expense type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setExpenseType('personal')}
                className={`py-2 rounded-lg text-sm font-medium border transition-colors
                  ${expenseType === 'personal'
                    ? 'bg-red-600 text-white border-red-600'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}>
                Personal
              </button>
              <button
                onClick={() => setExpenseType('business')}
                className={`py-2 rounded-lg text-sm font-medium border transition-colors
                  ${expenseType === 'business'
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}>
                Business
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              const params = new URLSearchParams({
                merchantName: parsed.merchantName || '',
                merchantPib:  parsed.merchantPib  || '',
                sufUrl:       parsed.sufUrl        || '',
                amount:       String(parsed.total  || ''),
                date:         parsed.date ? new Date(parsed.date).toISOString().split('T')[0] : '',
              })
              router.push(`/finance/expenses/${expenseType}?${params.toString()}`)
            }}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700">
            Continue → Categorize
          </button>
          <button
            onClick={() => { setParsed(null); setManualUrl('') }}
            className="w-full border border-gray-300 dark:border-gray-600 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            Scan Another
          </button>
        </div>
      )}
    </div>
  )
}
