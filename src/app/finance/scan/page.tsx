'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { flushSync } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
  X, Zap, ZapOff, ZoomIn, ZoomOut,
  ScanText, QrCode, Check, RotateCcw, Link2,
} from 'lucide-react'

// ── Helpers ────────────────────────────────────────────────────────────────

function isPfrBroj(text: string): boolean {
  return /^[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+$/i.test(text.trim())
}
function pfrToUrl(pfr: string): string {
  return `https://suf.purs.gov.rs/v/?vl=${btoa(pfr.trim())}`
}
function extractPfr(rawText: string): string | null {
  const text = rawText.toUpperCase()
  const direct = text.match(/[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+/)
  if (direct) return direct[0]
  const collapsed = text.replace(/([A-Z0-9]) ([A-Z0-9])/g, '$1$2')
  const retry = collapsed.match(/[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+/)
  return retry ? retry[0] : null
}

// ── Types ──────────────────────────────────────────────────────────────────

type Mode   = 'idle' | 'qr' | 'pfr'
type Parsed = {
  merchantName: string | null
  merchantPib:  string | null
  total:        number | null
  date:         string | null
  sufUrl:       string
  pfrRef?:      string
  warning?:     string | null
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ScanPage() {
  const router = useRouter()

  // QR
  const qrVideoRef   = useRef<HTMLVideoElement>(null)
  const qrStreamRef  = useRef<MediaStream | null>(null)
  const qrActiveRef  = useRef(false)
  const qrScannerRef = useRef<any>(null)
  // PFR OCR
  const pfrVideoRef  = useRef<HTMLVideoElement>(null)
  const pfrCanvasRef = useRef<HTMLCanvasElement>(null)
  const pfrStreamRef = useRef<MediaStream | null>(null)
  const tesseractRef = useRef<any>(null)
  const ocrActiveRef = useRef(false)
  // camera track (torch/zoom)
  const trackRef     = useRef<MediaStreamTrack | null>(null)

  const [mode,           setMode]           = useState<Mode>('idle')
  const [manualUrl,      setManualUrl]      = useState('')
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
  const [qrStatus,       setQrStatus]       = useState<'scanning' | 'found'>('scanning')
  const [pfrInput,       setPfrInput]       = useState('')
  const [ocrBusy,        setOcrBusy]        = useState(false)
  const [ocrDone,        setOcrDone]        = useState(false)

  // ── Parse receipt URL via API ──────────────────────────────────────────────

  const handleSufUrl = useCallback(async (url: string) => {
    setLoading(true)
    setError('')
    try {
      const res  = await fetch('/api/finance/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sufUrl: url }),
      })
      const data = await res.json()
      // Always show the form — even if parsing failed, let user fill it in
      setParsed({
        merchantName: data.merchantName ?? null,
        merchantPib:  data.merchantPib  ?? null,
        total:        data.total        ?? null,
        date:         data.date         ?? null,
        sufUrl:       data.sufUrl       ?? url,
        warning:      data.pfrFailed
          ? 'Receipt data could not be fetched — fill in below.'
          : (data.warning ?? null),
      })
    } catch {
      setError('Failed to reach server — check your connection.')
    }
    setLoading(false)
  }, [])

  // ── Camera helpers ─────────────────────────────────────────────────────────

  function applyTrackCaps(track: MediaStreamTrack) {
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
    try { await t.applyConstraints({ advanced: [{ torch: !torchOn } as any] }); setTorchOn(v => !v) }
    catch {}
  }
  const applyZoom = async (val: number) => {
    const t = trackRef.current; if (!t) return
    try { await t.applyConstraints({ advanced: [{ zoom: val } as any] }); setZoom(val) }
    catch {}
  }
  function resetCamState() {
    trackRef.current = null
    setTorchOn(false); setTorchSupported(false); setZoomSupported(false); setZoom(1)
  }

  async function startCamera(ref: React.RefObject<HTMLVideoElement>) {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    })
    if (ref.current) { ref.current.srcObject = stream; await ref.current.play() }
    applyTrackCaps(stream.getVideoTracks()[0])
    return stream
  }

  // ── QR scanner ─────────────────────────────────────────────────────────────

  const stopQr = useCallback(async () => {
    qrActiveRef.current = false
    qrStreamRef.current?.getTracks().forEach(t => t.stop())
    qrStreamRef.current = null
    try {
      if (qrScannerRef.current) {
        await qrScannerRef.current.stop()
        qrScannerRef.current.clear()
        qrScannerRef.current = null
      }
    } catch {}
    resetCamState()
    setMode('idle')
    setQrStatus('scanning')
  }, [])

  const startQr = () => {
    setError('')
    // video element is always in DOM — ref is ready before we request the stream
    setMode('qr')
    void initQrNative()
  }

  const initQrNative = async () => {
    // getUserMedia + attach stream directly to the always-mounted video element
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
    } catch (e: any) {
      setMode('idle')
      setError(/permission|denied/i.test(String(e)) ? 'Camera permission denied.' : 'Could not start camera.')
      return
    }
    qrStreamRef.current = stream
    const vid = qrVideoRef.current!
    vid.srcObject = stream
    try { await vid.play() } catch {}
    applyTrackCaps(stream.getVideoTracks()[0])

    // If BarcodeDetector available, use it for fast native detection
    if ('BarcodeDetector' in window) {
      const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
      qrActiveRef.current = true
      const loop = async () => {
        while (qrActiveRef.current) {
          if (vid.videoWidth > 0 && !vid.paused) {
            try {
              const codes = await detector.detect(vid)
              if (codes.length > 0) {
                const text: string = codes[0].rawValue
                setQrStatus('found')
                stopQr()
                handleSufUrl(text.startsWith('http') ? text : pfrToUrl(text))
                return
              }
            } catch {}
          }
          await new Promise(r => setTimeout(r, 100))
        }
      }
      loop()
    } else {
      // Fallback: html5-qrcode decoder on canvas frames from our stream
      void initQrHtml5Decode(vid)
    }
  }

  const initQrHtml5Decode = async (vid: HTMLVideoElement) => {
    const { Html5Qrcode } = await import('html5-qrcode')
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    qrActiveRef.current = true
    while (qrActiveRef.current) {
      if (vid.videoWidth > 0 && !vid.paused) {
        canvas.width = vid.videoWidth; canvas.height = vid.videoHeight
        ctx.drawImage(vid, 0, 0)
        try {
          const blob: Blob = await new Promise(res => canvas.toBlob(b => res(b!), 'image/jpeg', 0.8))
          const file = new File([blob], 'frame.jpg', { type: 'image/jpeg' })
          const result = await Html5Qrcode.scanFileV2(file, false)
          if (result?.decodedText) {
            const text = result.decodedText
            setQrStatus('found')
            stopQr()
            handleSufUrl(text.startsWith('http') ? text : pfrToUrl(text))
            return
          }
        } catch {}
      }
      await new Promise(r => setTimeout(r, 200))
    }
  }

  // ── PFR live OCR ───────────────────────────────────────────────────────────

  const stopPfr = useCallback(async () => {
    ocrActiveRef.current = false
    try { await tesseractRef.current?.terminate() } catch {}
    tesseractRef.current = null
    pfrStreamRef.current?.getTracks().forEach(t => t.stop())
    pfrStreamRef.current = null
    resetCamState()
    setMode('idle'); setOcrBusy(false); setOcrDone(false); setPfrInput('')
  }, [])

  const startPfr = async () => {
    setError(''); setPfrInput(''); setOcrDone(false)
    flushSync(() => setMode('pfr'))
    try {
      pfrStreamRef.current = await startCamera(pfrVideoRef)
    } catch (e: any) {
      setMode('idle')
      setError(/permission|denied/i.test(String(e)) ? 'Camera permission denied.' : 'Could not start camera.')
      return
    }
    try {
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker('eng', 1, { logger: () => {} })
      await worker.setParameters({ tessedit_pageseg_mode: '11' as any })
      tesseractRef.current = worker
    } catch { setError('Could not load OCR engine.'); return }
    ocrActiveRef.current = true
    runOcrLoop()
  }

  const runOcrLoop = async () => {
    while (ocrActiveRef.current) {
      const video = pfrVideoRef.current; const canvas = pfrCanvasRef.current; const worker = tesseractRef.current
      if (!video || !canvas || !worker || video.videoWidth === 0) { await new Promise(r => setTimeout(r, 300)); continue }
      setOcrBusy(true)
      try {
        const vw = video.videoWidth; const vh = video.videoHeight
        const cropY = Math.floor(vh * 0.25); const cropH = Math.floor(vh * 0.50)
        canvas.width = vw; canvas.height = cropH
        const ctx = canvas.getContext('2d')!
        ctx.filter = 'contrast(1.8) brightness(1.05)'
        ctx.drawImage(video, 0, cropY, vw, cropH, 0, 0, vw, cropH)
        ctx.filter = 'none'
        const { data: { text } } = await worker.recognize(canvas)
        const pfr = extractPfr(text)
        if (pfr) {
          setPfrInput(pfr)
          ocrActiveRef.current = false
          setOcrBusy(false)
          setOcrDone(true)
          return
        }
      } catch {}
      setOcrBusy(false)
      await new Promise(r => setTimeout(r, 300))
    }
    setOcrBusy(false)
  }

  const restartOcr = () => { setPfrInput(''); setOcrDone(false); ocrActiveRef.current = true; runOcrLoop() }

  // PFR confirm: don't call PURS API (it doesn't work for PFR-only).
  // Just open the form with PFR as a reference and let user fill in amount.
  const confirmPfr = async () => {
    await stopPfr()
    setParsed({
      merchantName: null,
      merchantPib:  null,
      total:        null,
      date:         null,
      sufUrl:       '',
      pfrRef:       pfrInput,
      warning:      'Enter the amount and merchant below — PFR saved as reference.',
    })
  }

  useEffect(() => () => { stopQr(); stopPfr() }, [stopQr, stopPfr])

  // ── Camera controls ────────────────────────────────────────────────────────

  const CameraControls = ({ onStop }: { onStop: () => void }) => (
    <div className="space-y-2">
      {zoomSupported && (
        <div className="flex items-center gap-2">
          <ZoomOut size={14} className="text-gray-400 shrink-0" />
          <input type="range" min={zoomMin} max={zoomMax} step={0.1} value={zoom}
            onChange={e => applyZoom(Number(e.target.value))} className="flex-1 accent-indigo-500" />
          <ZoomIn size={14} className="text-gray-400 shrink-0" />
          <span className="text-xs text-gray-400 w-8 tabular-nums text-right">{zoom.toFixed(1)}×</span>
        </div>
      )}
      <div className="flex gap-2">
        {torchSupported && (
          <button onClick={toggleTorch}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium border transition-colors
              ${torchOn ? 'bg-yellow-400 text-gray-900 border-yellow-400' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}>
            {torchOn ? <Zap size={14} /> : <ZapOff size={14} />} Flash
          </button>
        )}
        <button onClick={onStop}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors">
          <X size={14} /> Stop
        </button>
      </div>
    </div>
  )

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-lg mx-auto space-y-3 pb-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Scan Receipt</h2>

      {!parsed && (
        <div className="space-y-3">

          {/* ① Paste URL */}
          <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                <Link2 size={14} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Paste receipt URL</p>
                <p className="text-[11px] text-gray-400">Scan QR with iPhone Camera → tap banner → copy URL from address bar</p>
              </div>
            </div>
            <input
              value={manualUrl}
              onChange={e => setManualUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && manualUrl.trim() && handleSufUrl(manualUrl.trim())}
              placeholder="https://suf.purs.gov.rs/v/?vl=..."
              className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => handleSufUrl(manualUrl.trim())}
              disabled={!manualUrl.trim() || loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
              {loading ? 'Parsing…' : 'Parse Receipt'}
            </button>
          </section>

          {/* ② Scan QR code */}
          <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                  <QrCode size={14} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Scan QR code</p>
              </div>
              {mode !== 'qr' && (
                <button onClick={startQr}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors">
                  Start
                </button>
              )}
            </div>
          </section>

          {/* ③ Scan / enter PFR broj */}
          <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                  <ScanText size={14} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">PFR broj</p>
                  <p className="text-[11px] text-gray-400">Printed above the QR code on the receipt</p>
                </div>
              </div>
              {mode !== 'pfr' && (
                <button onClick={startPfr}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors">
                  Scan
                </button>
              )}
            </div>

            {/* Manual PFR input — always visible */}
            {mode !== 'pfr' && (
              <div className="flex gap-2">
                <input
                  value={pfrInput}
                  onChange={e => setPfrInput(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && isPfrBroj(pfrInput) && confirmPfr()}
                  placeholder="XXXXXXXX-XXXXXXXX-XXXX"
                  spellCheck={false} autoCorrect="off" autoCapitalize="characters"
                  className="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm font-mono bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  onClick={confirmPfr}
                  disabled={!isPfrBroj(pfrInput)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-semibold transition-colors">
                  <Check size={16} />
                </button>
              </div>
            )}

            {mode === 'pfr' && (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden bg-black">
                  <video ref={pfrVideoRef} playsInline muted className="w-full rounded-xl" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-11/12 border-2 border-white/60 rounded-lg py-5 bg-black/20 flex items-center justify-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${ocrBusy ? 'bg-yellow-400 animate-pulse' : ocrDone ? 'bg-emerald-400' : 'bg-white/50 animate-pulse'}`} />
                      <span className="text-white/80 text-xs font-medium tracking-widest uppercase">
                        {ocrDone ? 'Found' : ocrBusy ? 'Reading…' : 'Scanning'}
                      </span>
                    </div>
                  </div>
                </div>
                <canvas ref={pfrCanvasRef} className="hidden" />
                <div className="space-y-2">
                  <input
                    value={pfrInput}
                    onChange={e => setPfrInput(e.target.value.toUpperCase())}
                    placeholder="Detecting… XXXXXXXX-XXXXXXXX-XXXX"
                    spellCheck={false} autoCorrect="off" autoCapitalize="characters"
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm font-mono bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <div className="flex gap-2">
                    {ocrDone && (
                      <button onClick={restartOcr}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium">
                        <RotateCcw size={13} /> Scan again
                      </button>
                    )}
                    <button
                      onClick={confirmPfr}
                      disabled={!isPfrBroj(pfrInput)}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-semibold transition-colors ${ocrDone ? 'flex-1' : 'w-full'}`}>
                      <Check size={15} /> Confirm PFR
                    </button>
                  </div>
                </div>
                <CameraControls onStop={stopPfr} />
              </div>
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
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center text-sm text-gray-400 animate-pulse">
          Fetching receipt details…
        </div>
      )}

      {parsed && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Receipt details</h3>

          {parsed.warning && (
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-lg p-3 text-xs">
              {parsed.warning}
            </div>
          )}

          {parsed.pfrRef && (
            <div className="text-xs text-gray-400">PFR reference: <span className="font-mono text-gray-600 dark:text-gray-300">{parsed.pfrRef}</span></div>
          )}

          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Merchant</label>
              <input
                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={parsed.merchantName ?? ''}
                onChange={e => setParsed(p => p && ({ ...p, merchantName: e.target.value }))}
                placeholder="e.g. Maxi, Lidl…"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Amount (RSD)</label>
                <input
                  type="number"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={parsed.total ?? ''}
                  onChange={e => setParsed(p => p && ({ ...p, total: parseFloat(e.target.value) || null }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Date</label>
                <input
                  type="date"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}>
                  {t}
                </button>
              ))}
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
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition-colors">
            Continue → Add Expense
          </button>
          <button
            onClick={() => { setParsed(null); setManualUrl('') }}
            className="w-full border border-gray-200 dark:border-gray-700 py-2.5 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Start Over
          </button>
        </div>
      )}

      {/* QR video — always in DOM so ref is ready before getUserMedia resolves */}
      {/* It's visually hidden until mode=qr; the fullscreen overlay sits on top */}
      <video
        ref={qrVideoRef}
        playsInline
        muted
        autoPlay
        style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                 objectFit: 'cover', zIndex: mode === 'qr' ? 50 : -1,
                 opacity: mode === 'qr' ? 1 : 0, pointerEvents: 'none' }}
      />

      {/* QR UI overlay — corner guide + controls */}
      {mode === 'qr' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 51, display: 'flex', flexDirection: 'column' }}>
          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '48px 20px 16px', background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)' }}>
            <span style={{ color: 'white', fontWeight: 600, fontSize: 18 }}>Scan QR Code</span>
            <button onClick={stopQr}
              style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
                       border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: 260, height: 260,
                          boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }}>
              {/* Corner brackets */}
              {[['top-0 left-0','borderTop','borderLeft'],['top-0 right-0','borderTop','borderRight'],
                ['bottom-0 left-0','borderBottom','borderLeft'],['bottom-0 right-0','borderBottom','borderRight']]
                .map(([pos], i) => {
                  const t = i < 2 ? 0 : 'auto'; const b = i >= 2 ? 0 : 'auto'
                  const l = i % 2 === 0 ? 0 : 'auto'; const r = i % 2 === 1 ? 0 : 'auto'
                  return (
                    <span key={i} style={{
                      position: 'absolute', top: t, bottom: b, left: l, right: r,
                      width: 32, height: 32,
                      borderTop:    i < 2  ? '3px solid white' : undefined,
                      borderBottom: i >= 2 ? '3px solid white' : undefined,
                      borderLeft:   i % 2 === 0 ? '3px solid white' : undefined,
                      borderRight:  i % 2 === 1 ? '3px solid white' : undefined,
                    }} />
                  )
                })
              }
              {qrStatus === 'found' && (
                <div style={{ position: 'absolute', inset: 0, border: '2px solid #34d399',
                              background: 'rgba(52,211,153,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={48} color="#34d399" strokeWidth={3} />
                </div>
              )}
            </div>
          </div>

          {/* Bottom controls */}
          <div style={{ padding: '16px 24px 48px', background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 14, margin: 0 }}>
              {qrStatus === 'found' ? 'Detected — loading…' : 'Point camera at the QR code'}
            </p>
            {zoomSupported && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <ZoomOut size={16} color="rgba(255,255,255,0.6)" />
                <input type="range" min={zoomMin} max={zoomMax} step={0.1} value={zoom}
                  onChange={e => applyZoom(Number(e.target.value))} style={{ flex: 1, accentColor: '#818cf8' }} />
                <ZoomIn size={16} color="rgba(255,255,255,0.6)" />
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, width: 32, textAlign: 'right' }}>{zoom.toFixed(1)}×</span>
              </div>
            )}
            {torchSupported && (
              <button onClick={toggleTorch}
                style={{ width: '100%', padding: '12px', borderRadius: 16, border: 'none', cursor: 'pointer',
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
    </div>
  )
}
