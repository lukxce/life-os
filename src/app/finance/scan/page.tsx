'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { flushSync } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
  Camera, X, Zap, ZapOff, ZoomIn, ZoomOut,
  Hash, ScanText, QrCode, Check, RotateCcw, ImageIcon,
} from 'lucide-react'

// ── Helpers ────────────────────────────────────────────────────────────────

function isPfrBroj(text: string): boolean {
  return /^[A-Z0-9]{8}-[A-Z0-9]{8}-[A-Z0-9]{2,12}$/i.test(text.trim())
}
function pfrToUrl(pfr: string): string {
  return `https://suf.purs.gov.rs/v/?vl=${btoa(pfr.trim())}`
}
function extractPfr(rawText: string): string | null {
  const text = rawText.toUpperCase()
  const direct = text.match(/[A-Z0-9]{8}-[A-Z0-9]{8}-[A-Z0-9]{2,12}/)
  if (direct) return direct[0]
  // OCR sometimes inserts spaces inside tokens — collapse and retry
  const collapsed = text.replace(/([A-Z0-9]) ([A-Z0-9])/g, '$1$2')
  const retry = collapsed.match(/[A-Z0-9]{8}-[A-Z0-9]{8}-[A-Z0-9]{2,12}/)
  return retry ? retry[0] : null
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ScanPage() {
  const router = useRouter()

  // QR — native BarcodeDetector path
  const qrVideoRef     = useRef<HTMLVideoElement>(null)
  const qrStreamRef    = useRef<MediaStream | null>(null)
  const qrActiveRef    = useRef(false)
  // QR — html5-qrcode fallback (older browsers)
  const qrScannerRef   = useRef<any>(null)
  // PFR
  const pfrVideoRef        = useRef<HTMLVideoElement>(null)
  const pfrCanvasRef       = useRef<HTMLCanvasElement>(null)
  const pfrStreamRef       = useRef<MediaStream | null>(null)
  const tesseractWorkerRef = useRef<any>(null)
  const ocrActiveRef       = useRef(false)
  // shared
  const trackRef           = useRef<MediaStreamTrack | null>(null)

  type Mode = 'idle' | 'qr' | 'pfr'
  const [mode,           setMode]          = useState<Mode>('idle')
  const [qrEngine,       setQrEngine]      = useState<'native' | 'html5'>('native')
  const [manualUrl,      setManualUrl]     = useState('')
  const [manualPfr,      setManualPfr]     = useState('')
  const [parsed,         setParsed]        = useState<any>(null)
  const [loading,        setLoading]       = useState(false)
  const [error,          setError]         = useState('')
  const [expenseType,    setExpenseType]   = useState<'personal' | 'business'>('personal')
  const [torchOn,        setTorchOn]       = useState(false)
  const [torchSupported, setTorchSupported]= useState(false)
  const [zoom,           setZoom]          = useState(1)
  const [zoomSupported,  setZoomSupported] = useState(false)
  const [zoomMin,        setZoomMin]       = useState(1)
  const [zoomMax,        setZoomMax]       = useState(5)
  const [pfrInput,       setPfrInput]      = useState('')
  const [ocrBusy,        setOcrBusy]       = useState(false)
  const [ocrLoopRunning, setOcrLoopRunning]= useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  // ── Parse receipt via portal URL ──────────────────────────────────────────

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

  // ── Parse receipt via photo (Claude vision) ───────────────────────────────

  const handlePhoto = async (file: File) => {
    setLoading(true)
    setError('')
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const mediaType = file.type || 'image/jpeg'
      const res = await fetch('/api/finance/scan-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mediaType }),
      })
      const data = await res.json()
      if (data.error) setError(data.error)
      else setParsed(data)
    } catch {
      setError('Failed to read photo')
    }
    setLoading(false)
  }

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
    const t = trackRef.current
    if (!t) return
    try {
      await t.applyConstraints({ advanced: [{ torch: !torchOn } as any] })
      setTorchOn(v => !v)
    } catch { setError('Flash not available') }
  }

  const applyZoom = async (val: number) => {
    const t = trackRef.current
    if (!t) return
    try {
      await t.applyConstraints({ advanced: [{ zoom: val } as any] })
      setZoom(val)
    } catch {}
  }

  function resetCameraState() {
    trackRef.current = null
    setTorchOn(false)
    setTorchSupported(false)
    setZoomSupported(false)
    setZoom(1)
  }

  // ── QR scanner ─────────────────────────────────────────────────────────────

  const stopQr = useCallback(async () => {
    qrActiveRef.current = false
    // native path
    qrStreamRef.current?.getTracks().forEach(t => t.stop())
    qrStreamRef.current = null
    // html5-qrcode fallback path
    try {
      if (qrScannerRef.current) {
        await qrScannerRef.current.stop()
        qrScannerRef.current.clear()
        qrScannerRef.current = null
      }
    } catch {}
    resetCameraState()
    setMode('idle')
  }, [])

  const startQr = () => {
    setError('')
    const hasNative = typeof window !== 'undefined' && 'BarcodeDetector' in window
    flushSync(() => {
      setMode('qr')
      setQrEngine(hasNative ? 'native' : 'html5')
    })
    void (hasNative ? initQrNative() : initQrHtml5())
  }

  /** Direct BarcodeDetector path — fastest on iOS 17+ and Chrome */
  const initQrNative = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      qrStreamRef.current = stream
      const vid = qrVideoRef.current!
      vid.srcObject = stream
      await vid.play()
      applyTrackCaps(stream.getVideoTracks()[0])
    } catch (e: any) {
      setMode('idle')
      setError(/permission|denied/i.test(String(e))
        ? 'Camera access denied — enter PFR or URL below.'
        : 'Could not start camera.')
      return
    }

    const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
    qrActiveRef.current = true

    const tick = async () => {
      if (!qrActiveRef.current) return
      const vid = qrVideoRef.current
      try {
        if (vid && vid.videoWidth > 0 && !vid.paused) {
          const barcodes = await detector.detect(vid)
          if (barcodes.length > 0) {
            const text: string = barcodes[0].rawValue
            stopQr()
            handleSufUrl(text.startsWith('http') ? text : pfrToUrl(text))
            return
          }
        }
      } catch {}
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  /** html5-qrcode fallback for browsers without BarcodeDetector */
  const initQrHtml5 = async () => {
    const { Html5Qrcode } = await import('html5-qrcode')
    const scanner = new Html5Qrcode('qr-reader', { verbose: false })
    qrScannerRef.current = scanner
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
      qrScannerRef.current = null
      setMode('idle')
      setError(/permission|denied/i.test(String(e))
        ? 'Camera access denied — enter PFR or URL below.'
        : 'Could not start camera.')
    }
  }

  // ── PFR live OCR scanner ───────────────────────────────────────────────────

  const stopPfr = useCallback(async () => {
    ocrActiveRef.current = false
    try { await tesseractWorkerRef.current?.terminate() } catch {}
    tesseractWorkerRef.current = null
    pfrStreamRef.current?.getTracks().forEach(t => t.stop())
    pfrStreamRef.current = null
    resetCameraState()
    setMode('idle')
    setOcrBusy(false)
    setOcrLoopRunning(false)
    setPfrInput('')
  }, [])

  const startPfr = async () => {
    setError('')
    setPfrInput('')
    flushSync(() => setMode('pfr'))

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      pfrStreamRef.current = stream
      if (pfrVideoRef.current) {
        pfrVideoRef.current.srcObject = stream
        await pfrVideoRef.current.play()
      }
      applyTrackCaps(stream.getVideoTracks()[0])
    } catch (e: any) {
      setMode('idle')
      setError(/permission|denied/i.test(String(e))
        ? 'Camera access denied — type the PFR broj below.'
        : 'Could not start camera.')
      return
    }

    try {
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker('eng', 1, { logger: () => {} })
      await worker.setParameters({
        // PSM 11 = sparse text — finds characters scattered anywhere in the frame
        tessedit_pageseg_mode: '11' as any,
      })
      tesseractWorkerRef.current = worker
    } catch {
      setError('Could not load OCR engine.')
      return
    }

    ocrActiveRef.current = true
    runOcrLoop()
  }

  const runOcrLoop = async () => {
    setOcrLoopRunning(true)
    while (ocrActiveRef.current) {
      const video  = pfrVideoRef.current
      const canvas = pfrCanvasRef.current
      const worker = tesseractWorkerRef.current
      if (!video || !canvas || !worker || video.videoWidth === 0) {
        await new Promise(r => setTimeout(r, 300))
        continue
      }

      setOcrBusy(true)
      try {
        const vw = video.videoWidth
        const vh = video.videoHeight

        // Crop to center 50% vertically — PFR text should be in the guide box.
        // This halves the image area, making OCR roughly 2× faster.
        const cropY = Math.floor(vh * 0.25)
        const cropH = Math.floor(vh * 0.50)

        canvas.width  = vw
        canvas.height = cropH
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
          break
        }
      } catch {}
      setOcrBusy(false)

      await new Promise(r => setTimeout(r, 300))
    }
    setOcrLoopRunning(false)
  }

  const restartOcrLoop = () => {
    setPfrInput('')
    ocrActiveRef.current = true
    runOcrLoop()
  }

  useEffect(() => () => { stopQr(); stopPfr() }, [stopQr, stopPfr])

  // ── Camera controls (shared) ───────────────────────────────────────────────

  const CameraControls = () => (
    <>
      {zoomSupported && (
        <div className="flex items-center gap-2 px-1">
          <ZoomOut size={15} className="text-gray-400 shrink-0" />
          <input type="range" min={zoomMin} max={zoomMax} step={0.1} value={zoom}
            onChange={e => applyZoom(Number(e.target.value))}
            className="flex-1 accent-blue-600" />
          <ZoomIn size={15} className="text-gray-400 shrink-0" />
          <span className="text-xs text-gray-400 w-8 text-right tabular-nums">{zoom.toFixed(1)}×</span>
        </div>
      )}
      <div className="flex gap-2">
        {torchSupported && (
          <button onClick={toggleTorch}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
              torchOn ? 'bg-yellow-500 text-white' : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
            }`}>
            {torchOn ? <Zap size={16} /> : <ZapOff size={16} />}
            {torchOn ? 'Flash on' : 'Flash off'}
          </button>
        )}
        <button
          onClick={mode === 'qr' ? stopQr : stopPfr}
          className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-2 rounded-lg text-sm font-medium">
          <X size={16} /> Stop
        </button>
      </div>
    </>
  )

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Scan Receipt</h2>

      {!parsed && (
        <>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">

            {mode === 'idle' && (
              <div className="grid grid-cols-3 gap-2">
                <button onClick={startQr}
                  className="flex flex-col items-center gap-1.5 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors">
                  <QrCode size={24} />
                  <span className="text-sm font-medium">Scan QR</span>
                </button>
                <button onClick={startPfr}
                  className="flex flex-col items-center gap-1.5 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors">
                  <ScanText size={24} />
                  <span className="text-sm font-medium">Scan PFR</span>
                </button>
                <button onClick={() => photoInputRef.current?.click()}
                  className="flex flex-col items-center gap-1.5 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors">
                  <ImageIcon size={24} />
                  <span className="text-sm font-medium">Photo</span>
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handlePhoto(f) }}
                />
              </div>
            )}

            {/* ── QR mode ── */}
            {mode === 'qr' && (
              <div className="space-y-3">
                {qrEngine === 'native'
                  ? (
                    <video
                      ref={qrVideoRef}
                      playsInline muted
                      className="w-full rounded-xl bg-black"
                    />
                  ) : (
                    <div
                      id="qr-reader"
                      className="w-full overflow-hidden rounded-xl [&_video]:w-full [&_video]:rounded-xl [&_img]:hidden [&_select]:hidden"
                    />
                  )
                }
                <CameraControls />
                <p className="text-xs text-gray-400 text-center">Point at the QR code on the receipt</p>
              </div>
            )}

            {/* ── PFR live OCR mode ── */}
            {mode === 'pfr' && (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden bg-black">
                  <video ref={pfrVideoRef} playsInline muted className="w-full rounded-xl" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="w-11/12 border-2 border-white/70 rounded-lg py-4 bg-white/10 backdrop-blur-[1px] flex items-center justify-center gap-2">
                      {ocrLoopRunning
                        ? <span className={`w-2 h-2 rounded-full ${ocrBusy ? 'bg-yellow-400' : 'bg-emerald-400'} animate-pulse`} />
                        : <span className="w-2 h-2 rounded-full bg-white/50" />
                      }
                      <span className="text-white/80 text-xs font-medium tracking-widest uppercase">
                        {!ocrLoopRunning && pfrInput ? 'Found — confirm below' : ocrBusy ? 'Reading…' : 'Scanning'}
                      </span>
                    </div>
                  </div>
                </div>
                <canvas ref={pfrCanvasRef} className="hidden" />

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                    <Camera size={12} />
                    {ocrLoopRunning ? 'Auto-detecting — edit if needed' : 'Detected PFR broj — confirm or edit'}
                  </label>
                  <input
                    value={pfrInput}
                    onChange={e => setPfrInput(e.target.value.toUpperCase())}
                    placeholder="Scanning… XXXXXXXX-XXXXXXXX-XXXX"
                    spellCheck={false} autoCorrect="off" autoCapitalize="characters"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm font-mono bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex gap-2">
                  {!ocrLoopRunning && (
                    <button onClick={restartOcrLoop}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium">
                      <RotateCcw size={14} /> Scan again
                    </button>
                  )}
                  <button
                    onClick={() => { stopPfr(); handleSufUrl(pfrToUrl(pfrInput)) }}
                    disabled={!isPfrBroj(pfrInput)}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-semibold transition-colors ${!ocrLoopRunning ? 'flex-1' : 'w-full'}`}>
                    <Check size={16} /> Use this PFR
                  </button>
                </div>

                <CameraControls />
                <p className="text-xs text-gray-400 text-center">
                  {ocrLoopRunning
                    ? 'Keep the PFR text inside the box · stops when recognised'
                    : 'Stopped · edit the box or tap Scan again'}
                </p>
              </div>
            )}
          </div>

          {/* PFR manual entry */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
            <div className="flex items-center gap-1.5 mb-1">
              <Hash size={13} className="text-gray-400" />
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Or type PFR broj manually (printed above QR code)
              </label>
            </div>
            <input
              value={manualPfr}
              onChange={e => setManualPfr(e.target.value.toUpperCase())}
              placeholder="ABCD1234-EFGH5678-IJ90"
              spellCheck={false} autoCorrect="off" autoCapitalize="characters"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 tracking-wider"
            />
            <button
              onClick={() => handleSufUrl(pfrToUrl(manualPfr))}
              disabled={!isPfrBroj(manualPfr) || loading}
              className="w-full bg-gray-800 dark:bg-gray-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              {loading ? 'Looking up…' : 'Look Up Receipt'}
            </button>
          </div>

          {/* URL paste */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Or paste the receipt URL
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
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">Expense type</label>
            <div className="grid grid-cols-2 gap-2">
              {(['personal', 'business'] as const).map(t => (
                <button key={t} onClick={() => setExpenseType(t)}
                  className={`py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${
                    expenseType === t
                      ? t === 'personal' ? 'bg-red-600 text-white border-red-600' : 'bg-purple-600 text-white border-purple-600'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
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
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700">
            Continue → Categorize
          </button>
          <button
            onClick={() => { setParsed(null); setManualUrl(''); setManualPfr('') }}
            className="w-full border border-gray-300 dark:border-gray-600 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            Scan Another
          </button>
        </div>
      )}
    </div>
  )
}
