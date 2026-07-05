'use client'
import { useEffect, useRef, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { X, Zap, ZapOff, ZoomIn, ZoomOut, Check, Camera } from 'lucide-react'

function isSufUrl(s: string) { return s.includes('suf.purs.gov.rs') }
function pfrToUrl(pfr: string) { return `https://suf.purs.gov.rs/v/?vl=${btoa(pfr.trim())}` }

// Downscale + JPEG-compress a photo so the upload stays small
async function compressImage(file: File, maxDim = 1600, quality = 0.85): Promise<{ base64: string; mediaType: string }> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width  = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const dataUrl = canvas.toDataURL('image/jpeg', quality)
  return { base64: dataUrl.split(',')[1], mediaType: 'image/jpeg' }
}

type Parsed = {
  merchantName: string | null
  merchantPib:  string | null
  total:        number | null
  date:         string | null
  sufUrl:       string
  warning?:     string | null
}

function ScanInner() {
  const router = useRouter()
  const params = useSearchParams()

  const videoRef        = useRef<HTMLVideoElement>(null)
  const zxingRef        = useRef<{ stop: () => void } | null>(null)
  const trackRef        = useRef<MediaStreamTrack | null>(null)
  const photoInputRef   = useRef<HTMLInputElement>(null)

  const [scanning,       setScanning]       = useState(false)
  const [qrFound,        setQrFound]        = useState(false)
  const [url,            setUrl]            = useState('')
  const [parsed,         setParsed]         = useState<Parsed | null>(null)
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState('')
  const [expenseType,    setExpenseType]    = useState<'personal' | 'business'>('personal')
  const [torchOn,        setTorchOn]        = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)
  const [zoom,           setZoom]           = useState(1)
  const [zoomSupported,  setZoomSupported]  = useState(false)
  const [zoomMin,        setZoomMin]        = useState(1)
  const [zoomMax,        setZoomMax]        = useState(5)

  const handleSufUrl = useCallback(async (sufUrl: string) => {
    setLoading(true); setError('')
    try {
      const res  = await fetch('/api/finance/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sufUrl }),
      })
      const data = await res.json()
      setParsed({
        merchantName: data.merchantName ?? null,
        merchantPib:  data.merchantPib  ?? null,
        total:        data.total        ?? null,
        date:         data.date         ?? null,
        sufUrl:       data.sufUrl       ?? sufUrl,
        warning:      data.pfrFailed ? 'Receipt data could not be fetched — fill in below.' : (data.warning ?? null),
      })
    } catch { setError('Failed to reach server.') }
    setLoading(false)
  }, [])

  useEffect(() => {
    const shared = params.get('url') || params.get('text') || ''
    if (shared && isSufUrl(shared)) handleSufUrl(shared.trim())
  }, [params, handleSufUrl])

  // Photo flow: try exact QR decode from the still image first (fiscal data,
  // no guessing) — only fall back to AI vision if there's no readable QR.
  const handlePhoto = useCallback(async (file: File) => {
    setLoading(true); setError('')
    try {
      const objectUrl = URL.createObjectURL(file)
      try {
        const { BrowserQRCodeReader } = await import('@zxing/browser')
        const result = await new BrowserQRCodeReader().decodeFromImageUrl(objectUrl)
        const text = result.getText()
        URL.revokeObjectURL(objectUrl)
        if (text) {
          await handleSufUrl(text.startsWith('http') ? text : pfrToUrl(text))
          return
        }
      } catch {
        URL.revokeObjectURL(objectUrl)
        // No QR in the photo — fall through to AI extraction
      }

      const { base64, mediaType } = await compressImage(file)
      const res = await fetch('/api/finance/scan-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mediaType }),
      })
      const data = await res.json()
      if (data.error) { setError(`Photo scan failed: ${data.error}`); setLoading(false); return }
      setParsed({
        merchantName: data.merchantName ?? null,
        merchantPib:  data.merchantPib  ?? null,
        total:        data.total        ?? null,
        date:         data.date         ?? null,
        sufUrl:       '',
        warning: data.confidence === 'high'
          ? 'Read by AI from the photo — no QR found. Double-check the amount.'
          : 'Read by AI from the photo and the image was hard to read — verify every field before saving.',
      })
    } catch {
      setError('Could not process the photo.')
    }
    setLoading(false)
  }, [handleSufUrl])

  const applyTrackCaps = (track: MediaStreamTrack) => {
    trackRef.current = track
    const caps = track.getCapabilities() as any
    if (caps?.torch) setTorchSupported(true)
    if (caps?.zoom) {
      setZoomSupported(true)
      setZoomMin(caps.zoom.min ?? 1)
      setZoomMax(Math.min(caps.zoom.max ?? 5, 5))
    }
  }

  const toggleTorch = async () => {
    const t = trackRef.current; if (!t) return
    try { await t.applyConstraints({ advanced: [{ torch: !torchOn } as any] }); setTorchOn(v => !v) } catch {}
  }
  const applyZoom = async (val: number) => {
    const t = trackRef.current; if (!t) return
    try { await t.applyConstraints({ advanced: [{ zoom: val } as any] }); setZoom(val) } catch {}
  }

  const stopScanner = useCallback(() => {
    zxingRef.current?.stop()
    zxingRef.current = null
    trackRef.current = null
    setScanning(false); setQrFound(false)
    setTorchOn(false); setTorchSupported(false); setZoomSupported(false); setZoom(1)
  }, [])

  const startScanner = async () => {
    setError(''); setQrFound(false); setScanning(true)
    try {
      const { BrowserQRCodeReader } = await import('@zxing/browser')
      const reader = new BrowserQRCodeReader()

      const controls = await reader.decodeFromConstraints(
        {
          video: {
            facingMode: { ideal: 'environment' },
            width:  { ideal: 1920 },
            height: { ideal: 1080 },
          },
        },
        videoRef.current!,
        (result, err, ctrl) => {
          if (result) {
            const text = result.getText()
            setQrFound(true)
            ctrl.stop()
            zxingRef.current = null
            trackRef.current = null
            setScanning(false)
            handleSufUrl(text.startsWith('http') ? text : pfrToUrl(text))
          }
        }
      )

      zxingRef.current = controls

      // Grab track for torch/zoom after ZXing has set srcObject
      const stream = videoRef.current?.srcObject as MediaStream | null
      const track  = stream?.getVideoTracks()[0]
      if (track) applyTrackCaps(track)

    } catch (e: any) {
      setScanning(false)
      setError(/permission|denied/i.test(String(e))
        ? 'Camera permission denied — enable it in Settings, or use "Photo" below.'
        : 'Could not start the camera — use "Photo" below instead (works every time).')
    }
  }

  useEffect(() => () => { stopScanner() }, [stopScanner])

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Scan Receipt</h2>

      {/* Video element — ZXing manages srcObject */}
      <video ref={videoRef} playsInline muted
        style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          objectFit: 'cover',
          zIndex:   scanning ? 50 : -1,
          opacity:  scanning ? 1  : 0,
          pointerEvents: 'none',
        }} />

      {/* Fullscreen overlay */}
      {scanning && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 51, display: 'flex', flexDirection: 'column' }}>
          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '52px 20px 16px',
                        background: 'linear-gradient(to bottom, rgba(0,0,0,0.65), transparent)' }}>
            <span style={{ color: 'white', fontWeight: 600, fontSize: 18 }}>Scan QR Code</span>
            <button onClick={stopScanner}
              style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
                       border: 'none', color: 'white', display: 'flex', alignItems: 'center',
                       justifyContent: 'center', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>

          {/* Viewfinder */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: 260, height: 260,
                          boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }}>
              {[{t:0,b:'auto',l:0,r:'auto'},{t:0,b:'auto',l:'auto',r:0},
                {t:'auto',b:0,l:0,r:'auto'},{t:'auto',b:0,l:'auto',r:0}].map((p, i) => (
                <span key={i} style={{
                  position: 'absolute', top: p.t, bottom: p.b, left: p.l, right: p.r,
                  width: 32, height: 32,
                  borderTop:    i < 2  ? '3px solid white' : undefined,
                  borderBottom: i >= 2 ? '3px solid white' : undefined,
                  borderLeft:   i % 2 === 0 ? '3px solid white' : undefined,
                  borderRight:  i % 2 === 1 ? '3px solid white' : undefined,
                }} />
              ))}
              {qrFound && (
                <div style={{ position: 'absolute', inset: 0, border: '2px solid #34d399',
                               background: 'rgba(52,211,153,0.2)',
                               display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={48} color="#34d399" strokeWidth={3} />
                </div>
              )}
            </div>
          </div>

          {/* Bottom controls */}
          <div style={{ padding: '16px 24px 52px',
                        background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)',
                        display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 14, margin: 0 }}>
              {qrFound ? 'Detected — loading…' : 'Point camera at the QR code on your receipt'}
            </p>
            {zoomSupported && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <ZoomOut size={16} color="rgba(255,255,255,0.6)" />
                <input type="range" min={zoomMin} max={zoomMax} step={0.1} value={zoom}
                  onChange={e => applyZoom(Number(e.target.value))}
                  style={{ flex: 1, accentColor: '#818cf8' }} />
                <ZoomIn size={16} color="rgba(255,255,255,0.6)" />
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, width: 32, textAlign: 'right' }}>
                  {zoom.toFixed(1)}×
                </span>
              </div>
            )}
            {torchSupported && (
              <button onClick={toggleTorch}
                style={{ width: '100%', padding: 12, borderRadius: 16, border: 'none', cursor: 'pointer',
                         background: torchOn ? '#facc15' : 'rgba(255,255,255,0.15)',
                         color: torchOn ? '#111' : 'white', fontWeight: 600, fontSize: 14,
                         display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {torchOn ? <Zap size={16} /> : <ZapOff size={16} />}
                {torchOn ? 'Flash On' : 'Flash Off'}
              </button>
            )}
          </div>
        </div>
      )}

      {!parsed && (
        <div className="space-y-3">
          <section className="bg-white/85 dark:bg-gray-900/70 rounded-2xl border border-black/10 dark:border-white/10 p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={startScanner} disabled={scanning || loading}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white py-3 rounded-xl font-semibold transition-colors">
                Scan QR
              </button>
              <button onClick={() => photoInputRef.current?.click()} disabled={scanning || loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2">
                <Camera size={17} /> Photo
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center">
              Photo works offline-camera style: snap the whole receipt — the QR is read from the picture, with AI as backup.
            </p>
            <input ref={photoInputRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) handlePhoto(f)
                e.target.value = ''
              }} />
          </section>

          <section className="bg-white/85 dark:bg-gray-900/70 rounded-2xl border border-black/10 dark:border-white/10 p-4 space-y-2">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Paste URL</p>
            <input
              value={url}
              onChange={e => {
                setUrl(e.target.value)
                if (isSufUrl(e.target.value.trim())) handleSufUrl(e.target.value.trim())
              }}
              onPaste={e => {
                const text = e.clipboardData.getData('text')
                if (isSufUrl(text.trim())) {
                  e.preventDefault(); setUrl(text.trim()); handleSufUrl(text.trim())
                }
              }}
              placeholder="https://suf.purs.gov.rs/v/?vl=..."
              autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
              className="w-full border border-black/10 dark:border-white/10 rounded-xl px-3 py-3 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {url && !isSufUrl(url) && (
              <button onClick={() => handleSufUrl(url.trim())} disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
                {loading ? 'Parsing…' : 'Parse'}
              </button>
            )}
          </section>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-3 text-sm">
          {error}
        </div>
      )}

      {loading && !parsed && (
        <div className="bg-white/85 dark:bg-gray-900/70 rounded-2xl border border-black/10 dark:border-white/10 p-8 text-center text-sm text-gray-400 animate-pulse">
          Fetching receipt details…
        </div>
      )}

      {parsed && (
        <div className="bg-white/85 dark:bg-gray-900/70 rounded-2xl border border-black/10 dark:border-white/10 p-5 space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Receipt details</h3>

          {parsed.warning && (
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-lg p-3 text-xs">
              {parsed.warning}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Merchant</label>
              <input
                className="w-full border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={parsed.merchantName ?? ''}
                onChange={e => setParsed(p => p && ({ ...p, merchantName: e.target.value }))}
                placeholder="e.g. Maxi, Lidl, DM…"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Amount (RSD)</label>
                <input type="number"
                  className="w-full border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={parsed.total ?? ''}
                  onChange={e => setParsed(p => p && ({ ...p, total: parseFloat(e.target.value) || null }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Date</label>
                <input type="date"
                  className="w-full border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={parsed.date ? new Date(parsed.date).toISOString().split('T')[0] : ''}
                  onChange={e => setParsed(p => p && ({ ...p, date: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">Expense type</label>
            <div className="grid grid-cols-2 gap-2">
              {(['personal', 'business'] as const).map(t => (
                <button key={t} onClick={() => setExpenseType(t)}
                  className={`py-2 rounded-xl text-sm font-medium border transition-colors capitalize ${
                    expenseType === t
                      ? t === 'personal' ? 'bg-red-600 text-white border-red-600' : 'bg-purple-600 text-white border-purple-600'
                      : 'border-black/10 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}>{t}</button>
              ))}
            </div>
          </div>

          <button
            onClick={() => {
              const p = new URLSearchParams({
                merchantName: parsed.merchantName || '',
                merchantPib:  parsed.merchantPib  || '',
                sufUrl:       parsed.sufUrl        || '',
                amount:       String(parsed.total  || ''),
                date:         parsed.date ? new Date(parsed.date).toISOString().split('T')[0] : '',
              })
              router.push(`/finance/expenses/${expenseType}?${p.toString()}`)
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition-colors">
            Continue → Add Expense
          </button>
          <button onClick={() => { setParsed(null); setUrl('') }}
            className="w-full border border-black/10 dark:border-white/10 py-2.5 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Start Over
          </button>
        </div>
      )}
    </div>
  )
}

export default function ScanPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400 animate-pulse">Loading…</div>}>
      <ScanInner />
    </Suspense>
  )
}
