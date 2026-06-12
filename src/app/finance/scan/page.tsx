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

// ── Component ──────────────────────────────────────────────────────────────

export default function ScanPage() {
  const router = useRouter()

  // QR video
  const qrVideoRef    = useRef<HTMLVideoElement>(null)
  const qrCanvasRef   = useRef<HTMLCanvasElement>(null)
  const qrStreamRef   = useRef<MediaStream | null>(null)
  const qrActiveRef   = useRef(false)
  const qrScannerRef  = useRef<any>(null)
  // PFR OCR
  const pfrVideoRef   = useRef<HTMLVideoElement>(null)
  const pfrCanvasRef  = useRef<HTMLCanvasElement>(null)
  const pfrStreamRef  = useRef<MediaStream | null>(null)
  const tesseractRef  = useRef<any>(null)
  const ocrActiveRef  = useRef(false)
  const trackRef      = useRef<MediaStreamTrack | null>(null)

  type Mode = 'idle' | 'qr' | 'pfr'
  const [mode,           setMode]           = useState<Mode>('idle')
  const [qrEngine,       setQrEngine]       = useState<'native' | 'html5'>('native')
  const [manualUrl,      setManualUrl]      = useState('')
  const [parsed,         setParsed]         = useState<any>(null)
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState('')
  const [expenseType,    setExpenseType]    = useState<'personal' | 'business'>('personal')
  const [torchOn,        setTorchOn]        = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)
  const [zoom,           setZoom]           = useState(1)
  const [zoomSupported,  setZoomSupported]  = useState(false)
  const [zoomMin,        setZoomMin]        = useState(1)
  const [zoomMax,        setZoomMax]        = useState(5)
  const [qrScanning,     setQrScanning]     = useState(false)
  const [pfrInput,       setPfrInput]       = useState('')
  const [ocrBusy,        setOcrBusy]        = useState(false)
  const [ocrLoopRunning, setOcrLoopRunning] = useState(false)

  // ── Parse via portal URL ───────────────────────────────────────────────────

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
      if (data.error) {
        setError(data.error)
      } else if (data.pfrFailed) {
        setError('PFR broj alone cannot fetch receipt data — the PURS portal needs the full QR URL. Scan the QR code or paste the full URL.')
      } else {
        setParsed(data)
      }
    } catch {
      setError('Failed to reach server — check your connection.')
    }
    setLoading(false)
  }, [])

  // ── Shared camera helpers ──────────────────────────────────────────────────

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
    catch { setError('Flash not available') }
  }

  const applyZoom = async (val: number) => {
    const t = trackRef.current; if (!t) return
    try { await t.applyConstraints({ advanced: [{ zoom: val } as any] }); setZoom(val) }
    catch {}
  }

  function resetCameraState() {
    trackRef.current = null
    setTorchOn(false); setTorchSupported(false); setZoomSupported(false); setZoom(1)
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
    resetCameraState()
    setQrScanning(false)
    setMode('idle')
  }, [])

  const startQr = () => {
    setError('')
    const hasNative = typeof window !== 'undefined' && 'BarcodeDetector' in window
    flushSync(() => { setMode('qr'); setQrEngine(hasNative ? 'native' : 'html5') })
    void (hasNative ? initQrNative() : initQrHtml5())
  }

  const initQrNative = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width:  { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })
      qrStreamRef.current = stream
      const vid = qrVideoRef.current!
      vid.srcObject = stream
      await vid.play()
      applyTrackCaps(stream.getVideoTracks()[0])
    } catch (e: any) {
      setMode('idle')
      setError(/permission|denied/i.test(String(e)) ? 'Camera access denied.' : 'Could not start camera.')
      return
    }

    const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
    qrActiveRef.current = true
    setQrScanning(true)

    // Scan a center crop of the video for better performance
    const scan = async () => {
      if (!qrActiveRef.current) return
      const vid = qrVideoRef.current
      const canvas = qrCanvasRef.current
      if (!vid || !canvas || vid.videoWidth === 0 || vid.paused) {
        requestAnimationFrame(scan); return
      }
      try {
        // Crop center 60% of the frame — that's where users aim the QR
        const vw = vid.videoWidth; const vh = vid.videoHeight
        const cropSize = Math.min(vw, vh) * 0.7
        const cx = (vw - cropSize) / 2; const cy = (vh - cropSize) / 2
        canvas.width = cropSize; canvas.height = cropSize
        canvas.getContext('2d')!.drawImage(vid, cx, cy, cropSize, cropSize, 0, 0, cropSize, cropSize)
        const codes = await detector.detect(canvas)
        if (codes.length > 0) {
          const text: string = codes[0].rawValue
          stopQr()
          handleSufUrl(text.startsWith('http') ? text : pfrToUrl(text))
          return
        }
      } catch {}
      requestAnimationFrame(scan)
    }
    requestAnimationFrame(scan)
  }

  const initQrHtml5 = async () => {
    const { Html5Qrcode } = await import('html5-qrcode')
    const scanner = new Html5Qrcode('qr-reader', { verbose: false })
    qrScannerRef.current = scanner
    setQrScanning(true)
    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 30, disableFlip: false } as any,
        (text: string) => { stopQr(); handleSufUrl(text.startsWith('http') ? text : pfrToUrl(text)) },
        () => {},
      )
      await new Promise(r => setTimeout(r, 600))
      const vid = document.querySelector('#qr-reader video') as HTMLVideoElement | null
      if (vid?.srcObject) applyTrackCaps((vid.srcObject as MediaStream).getVideoTracks()[0])
    } catch (e: any) {
      qrScannerRef.current = null; setMode('idle'); setQrScanning(false)
      setError(/permission|denied/i.test(String(e)) ? 'Camera access denied.' : 'Could not start camera.')
    }
  }

  // ── PFR live OCR ───────────────────────────────────────────────────────────

  const stopPfr = useCallback(async () => {
    ocrActiveRef.current = false
    try { await tesseractRef.current?.terminate() } catch {}
    tesseractRef.current = null
    pfrStreamRef.current?.getTracks().forEach(t => t.stop())
    pfrStreamRef.current = null
    resetCameraState()
    setMode('idle'); setOcrBusy(false); setOcrLoopRunning(false); setPfrInput('')
  }, [])

  const startPfr = async () => {
    setError(''); setPfrInput('')
    flushSync(() => setMode('pfr'))
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      pfrStreamRef.current = stream
      if (pfrVideoRef.current) { pfrVideoRef.current.srcObject = stream; await pfrVideoRef.current.play() }
      applyTrackCaps(stream.getVideoTracks()[0])
    } catch (e: any) {
      setMode('idle')
      setError(/permission|denied/i.test(String(e)) ? 'Camera access denied.' : 'Could not start camera.')
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
    setOcrLoopRunning(true)
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
        if (pfr) { setPfrInput(pfr); ocrActiveRef.current = false; setOcrBusy(false); break }
      } catch {}
      setOcrBusy(false)
      await new Promise(r => setTimeout(r, 300))
    }
    setOcrLoopRunning(false)
  }

  const restartOcrLoop = () => { setPfrInput(''); ocrActiveRef.current = true; runOcrLoop() }

  useEffect(() => () => { stopQr(); stopPfr() }, [stopQr, stopPfr])

  // ── Camera controls (shared) ───────────────────────────────────────────────

  const CameraControls = ({ onStop }: { onStop: () => void }) => (
    <div className="space-y-2 pt-1">
      {zoomSupported && (
        <div className="flex items-center gap-2 px-1">
          <ZoomOut size={14} className="text-gray-400 shrink-0" />
          <input type="range" min={zoomMin} max={zoomMax} step={0.1} value={zoom}
            onChange={e => applyZoom(Number(e.target.value))}
            className="flex-1 accent-indigo-600" />
          <ZoomIn size={14} className="text-gray-400 shrink-0" />
          <span className="text-xs text-gray-400 w-8 text-right tabular-nums">{zoom.toFixed(1)}×</span>
        </div>
      )}
      <div className="flex gap-2">
        {torchSupported && (
          <button onClick={toggleTorch}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-colors
              ${torchOn ? 'bg-yellow-400 text-gray-900' : 'border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}>
            {torchOn ? <Zap size={15} /> : <ZapOff size={15} />}
            Flash
          </button>
        )}
        <button onClick={onStop}
          className="flex-1 flex items-center justify-center gap-2 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 py-2 rounded-xl text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950 transition-colors">
          <X size={15} /> Stop
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
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Paste receipt URL</span>
            </div>
            <input
              value={manualUrl}
              onChange={e => setManualUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && manualUrl && handleSufUrl(manualUrl)}
              placeholder="https://suf.purs.gov.rs/v/?vl=..."
              className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => handleSufUrl(manualUrl)}
              disabled={!manualUrl.trim() || loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
              {loading ? 'Parsing…' : 'Parse Receipt'}
            </button>
          </section>

          {/* ② Scan QR */}
          <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                  <QrCode size={14} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Scan QR code</span>
              </div>
              {mode !== 'qr' && (
                <button onClick={startQr}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors">
                  Start
                </button>
              )}
            </div>

            {mode === 'qr' && (
              <div className="space-y-3">
                {/* Video with targeting overlay */}
                <div className="relative rounded-xl overflow-hidden bg-black aspect-square">
                  {qrEngine === 'native' ? (
                    <video ref={qrVideoRef} playsInline muted className="w-full h-full object-cover" />
                  ) : (
                    <div id="qr-reader" className="w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover [&_img]:hidden [&_select]:hidden [&_button]:hidden [&_span]:hidden" />
                  )}
                  {/* Targeting reticle */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative w-56 h-56">
                      {/* Corner brackets */}
                      <span className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white rounded-tl-md" />
                      <span className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white rounded-tr-md" />
                      <span className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white rounded-bl-md" />
                      <span className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white rounded-br-md" />
                      {/* Scanning line */}
                      {qrScanning && (
                        <span className="absolute left-2 right-2 h-0.5 bg-indigo-400/80 rounded-full animate-[scanLine_2s_ease-in-out_infinite]" />
                      )}
                    </div>
                  </div>
                  {/* Status badge */}
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
                    <span className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white text-xs font-medium px-3 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                      Point at QR code
                    </span>
                  </div>
                </div>
                {/* Hidden canvas for crop-based detection */}
                <canvas ref={qrCanvasRef} className="hidden" />
                <CameraControls onStop={stopQr} />
              </div>
            )}
          </section>

          {/* ③ Scan PFR number */}
          <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                  <ScanText size={14} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Scan PFR number</span>
              </div>
              {mode !== 'pfr' && (
                <button onClick={startPfr}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors">
                  Start
                </button>
              )}
            </div>

            {mode === 'pfr' && (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden bg-black">
                  <video ref={pfrVideoRef} playsInline muted className="w-full rounded-xl" />
                  {/* Scan window overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="w-11/12 border-2 border-white/60 rounded-lg py-5 bg-black/20 backdrop-blur-[1px] flex items-center justify-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${ocrBusy ? 'bg-yellow-400 animate-pulse' : ocrLoopRunning ? 'bg-emerald-400 animate-pulse' : 'bg-white/40'}`} />
                      <span className="text-white/80 text-xs font-medium tracking-widest uppercase">
                        {!ocrLoopRunning && pfrInput ? 'Found' : ocrBusy ? 'Reading…' : 'Scanning'}
                      </span>
                    </div>
                  </div>
                </div>
                <canvas ref={pfrCanvasRef} className="hidden" />

                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1.5">
                    {ocrLoopRunning ? 'Detecting…' : 'Detected — confirm or edit'}
                  </label>
                  <input
                    value={pfrInput}
                    onChange={e => setPfrInput(e.target.value.toUpperCase())}
                    placeholder="XXXXXXXX-XXXXXXXX-XXXX"
                    spellCheck={false} autoCorrect="off" autoCapitalize="characters"
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm font-mono bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex gap-2">
                  {!ocrLoopRunning && (
                    <button onClick={restartOcrLoop}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800">
                      <RotateCcw size={13} /> Scan again
                    </button>
                  )}
                  <button
                    onClick={() => { stopPfr(); handleSufUrl(pfrToUrl(pfrInput)) }}
                    disabled={!isPfrBroj(pfrInput)}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-semibold transition-colors ${!ocrLoopRunning ? 'flex-1' : 'w-full'}`}>
                    <Check size={15} /> Use this PFR
                  </button>
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
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center text-sm text-gray-400 dark:text-gray-500 animate-pulse">
          Fetching receipt details…
        </div>
      )}

      {parsed && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Receipt details</h3>

          {parsed.warning && (
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-lg p-3 text-xs">
              ⚠️ {parsed.warning}
            </div>
          )}

          {!parsed.total && !parsed.date && !parsed.merchantName && (
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-xs text-gray-500 dark:text-gray-400">
              Could not read details automatically — fill in below.
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Merchant</label>
              <input
                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={parsed.merchantName ?? ''}
                onChange={e => setParsed((p: any) => ({ ...p, merchantName: e.target.value }))}
                placeholder="Merchant name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Total (RSD)</label>
                <input
                  type="number"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={parsed.total ?? ''}
                  onChange={e => setParsed((p: any) => ({ ...p, total: parseFloat(e.target.value) || null }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Date</label>
                <input
                  type="date"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={parsed.date ? new Date(parsed.date).toISOString().split('T')[0] : ''}
                  onChange={e => setParsed((p: any) => ({ ...p, date: e.target.value ? new Date(e.target.value).toISOString() : null }))}
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
            Continue → Categorize
          </button>
          <button
            onClick={() => { setParsed(null); setManualUrl('') }}
            className="w-full border border-gray-200 dark:border-gray-700 py-2.5 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Scan Another
          </button>
        </div>
      )}

      {/* Scan line keyframe */}
      <style>{`
        @keyframes scanLine {
          0%   { top: 8px;  opacity: 1; }
          48%  { top: calc(100% - 8px); opacity: 1; }
          50%  { opacity: 0; }
          52%  { top: 8px;  opacity: 0; }
          54%  { opacity: 1; }
          100% { top: calc(100% - 8px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
