'use client'
import { useEffect, useRef, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  X, Zap, ZapOff, ZoomIn, ZoomOut,
  ScanText, Check, RotateCcw, ClipboardPaste, Link2, QrCode,
} from 'lucide-react'

// ── Helpers ────────────────────────────────────────────────────────────────

function isPfrBroj(text: string): boolean {
  return /^[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+$/i.test(text.trim())
}
function pfrToUrl(pfr: string): string {
  return `https://suf.purs.gov.rs/v/?vl=${btoa(pfr.trim())}`
}
function isSufUrl(s: string): boolean {
  return s.includes('suf.purs.gov.rs')
}
function extractPfr(rawText: string): string | null {
  const text = rawText.toUpperCase()
  const direct = text.match(/[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+/)
  if (direct) return direct[0]
  const collapsed = text.replace(/([A-Z0-9]) ([A-Z0-9])/g, '$1$2')
  const retry = collapsed.match(/[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+/)
  return retry ? retry[0] : null
}

type Parsed = {
  merchantName: string | null
  merchantPib: string | null
  total: number | null
  date: string | null
  sufUrl: string
  pfrRef?: string
  warning?: string | null
}

// ── Inner component (needs useSearchParams) ────────────────────────────────

function ScanInner() {
  const router     = useRouter()
  const params     = useSearchParams()

  const qrVideoRef   = useRef<HTMLVideoElement>(null)
  const qrStreamRef  = useRef<MediaStream | null>(null)
  const qrActiveRef  = useRef(false)
  const trackRef     = useRef<MediaStreamTrack | null>(null)
  const pfrVideoRef  = useRef<HTMLVideoElement>(null)
  const pfrCanvasRef = useRef<HTMLCanvasElement>(null)
  const pfrStreamRef = useRef<MediaStream | null>(null)
  const tesseractRef = useRef<any>(null)
  const ocrActiveRef = useRef(false)

  type Mode = 'idle' | 'qr' | 'pfr'
  const [mode,           setMode]           = useState<Mode>('idle')
  const [manualUrl,      setManualUrl]      = useState('')
  const [clipboardUrl,   setClipboardUrl]   = useState<string | null>(null)
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
  const [qrFound,        setQrFound]        = useState(false)
  const [pfrInput,       setPfrInput]       = useState('')
  const [ocrBusy,        setOcrBusy]        = useState(false)
  const [ocrDone,        setOcrDone]        = useState(false)

  // ── Parse receipt URL ──────────────────────────────────────────────────────

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

  // ── Share Target / URL param on load ──────────────────────────────────────

  useEffect(() => {
    // Handles ?url= from PWA Share Target (Safari Share → Life OS)
    // Also handles ?text= which Safari sometimes sends instead
    const sharedUrl  = params.get('url') || params.get('text') || ''
    if (sharedUrl && isSufUrl(sharedUrl)) {
      handleSufUrl(sharedUrl.trim())
    }
  }, [params, handleSufUrl])

  // ── Clipboard auto-detect ─────────────────────────────────────────────────
  // When user copies the URL from Safari and switches back to Life OS, detect it.

  const checkClipboard = useCallback(async () => {
    if (!navigator.clipboard?.readText) return
    try {
      const text = await navigator.clipboard.readText()
      if (text && isSufUrl(text) && !parsed && !loading) {
        setClipboardUrl(text.trim())
      }
    } catch {}
  }, [parsed, loading])

  useEffect(() => {
    // Check on mount and whenever the page regains focus (user switches back from Safari)
    checkClipboard()
    const onFocus = () => checkClipboard()
    const onVisible = () => { if (document.visibilityState === 'visible') checkClipboard() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [checkClipboard])

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

  // ── QR scanner ─────────────────────────────────────────────────────────────

  const stopQr = useCallback(async () => {
    qrActiveRef.current = false
    qrStreamRef.current?.getTracks().forEach(t => t.stop())
    qrStreamRef.current = null
    resetCamState(); setMode('idle'); setQrFound(false)
  }, [])

  const startQr = () => {
    setError(''); setQrFound(false); setMode('qr')
    void initQr()
  }

  const initQr = async () => {
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
                setQrFound(true)
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
            const file = new File([blob], 'f.jpg', { type: 'image/jpeg' })
            const text = await (Html5Qrcode as any).scanFile(file, false)
            if (text) {
              setQrFound(true); stopQr()
              handleSufUrl(text.startsWith('http') ? text : pfrToUrl(text))
              return
            }
          } catch {}
        }
        await new Promise(r => setTimeout(r, 200))
      }
    }
  }

  // ── PFR OCR scanner ────────────────────────────────────────────────────────

  const stopPfr = useCallback(async () => {
    ocrActiveRef.current = false
    try { await tesseractRef.current?.terminate() } catch {}
    tesseractRef.current = null
    pfrStreamRef.current?.getTracks().forEach(t => t.stop())
    pfrStreamRef.current = null
    resetCamState(); setMode('idle'); setOcrBusy(false); setOcrDone(false); setPfrInput('')
  }, [])

  const startPfr = async () => {
    setError(''); setPfrInput(''); setOcrDone(false)
    setMode('pfr')
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
    pfrStreamRef.current = stream
    if (pfrVideoRef.current) { pfrVideoRef.current.srcObject = stream; await pfrVideoRef.current.play() }
    applyTrackCaps(stream.getVideoTracks()[0])
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
        if (pfr) { setPfrInput(pfr); ocrActiveRef.current = false; setOcrBusy(false); setOcrDone(true); return }
      } catch {}
      setOcrBusy(false)
      await new Promise(r => setTimeout(r, 300))
    }
    setOcrBusy(false)
  }

  const confirmPfr = async () => {
    await stopPfr()
    setParsed({ merchantName: null, merchantPib: null, total: null, date: null, sufUrl: '',
                pfrRef: pfrInput, warning: 'Enter the amount and merchant — PFR saved as reference.' })
  }

  useEffect(() => () => { stopQr(); stopPfr() }, [stopQr, stopPfr])

  // ── Camera controls ────────────────────────────────────────────────────────

  const CamControls = ({ onStop }: { onStop: () => void }) => (
    <div className="space-y-2">
      {zoomSupported && (
        <div className="flex items-center gap-2">
          <ZoomOut size={14} className="text-gray-400 shrink-0" />
          <input type="range" min={zoomMin} max={zoomMax} step={0.1} value={zoom}
            onChange={e => applyZoom(Number(e.target.value))} className="flex-1 accent-indigo-500" />
          <ZoomIn size={14} className="text-gray-400 shrink-0" />
          <span className="text-xs text-gray-400 w-8 tabular-nums">{zoom.toFixed(1)}×</span>
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

      {/* QR video — always mounted so ref is ready */}
      <video ref={qrVideoRef} playsInline muted autoPlay
        style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                 objectFit: 'cover', zIndex: mode === 'qr' ? 50 : -1,
                 opacity: mode === 'qr' ? 1 : 0, pointerEvents: 'none' }} />

      {/* QR fullscreen UI */}
      {mode === 'qr' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 51, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '52px 20px 16px', background: 'linear-gradient(to bottom,rgba(0,0,0,0.65),transparent)' }}>
            <span style={{ color: 'white', fontWeight: 600, fontSize: 18 }}>Scan QR Code</span>
            <button onClick={stopQr}
              style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
                       border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: 260, height: 260, boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }}>
              {([[[0,'auto'],[0,'auto']],[[0,'auto'],['auto',0]],[['auto',0],[0,'auto']],[['auto',0],['auto',0]]] as any).map(([[t,b],[l,r]]: any, i: number) => (
                <span key={i} style={{ position:'absolute', top:t, bottom:b, left:l, right:r, width:32, height:32,
                  borderTop:    i<2  ? '3px solid white' : undefined, borderBottom: i>=2 ? '3px solid white' : undefined,
                  borderLeft:   i%2===0 ? '3px solid white' : undefined, borderRight: i%2===1 ? '3px solid white' : undefined }} />
              ))}
              {qrFound && (
                <div style={{ position:'absolute', inset:0, border:'2px solid #34d399', background:'rgba(52,211,153,0.2)',
                               display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Check size={48} color="#34d399" strokeWidth={3} />
                </div>
              )}
            </div>
          </div>
          <div style={{ padding:'16px 24px 52px', background:'linear-gradient(to top,rgba(0,0,0,0.65),transparent)', display:'flex', flexDirection:'column', gap:12 }}>
            <p style={{ textAlign:'center', color:'rgba(255,255,255,0.7)', fontSize:14, margin:0 }}>
              {qrFound ? 'Detected — loading…' : 'Point camera at the QR code'}
            </p>
            {zoomSupported && (
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <ZoomOut size={16} color="rgba(255,255,255,0.6)" />
                <input type="range" min={zoomMin} max={zoomMax} step={0.1} value={zoom}
                  onChange={e => applyZoom(Number(e.target.value))} style={{ flex:1, accentColor:'#818cf8' }} />
                <ZoomIn size={16} color="rgba(255,255,255,0.6)" />
                <span style={{ color:'rgba(255,255,255,0.6)', fontSize:12, width:32, textAlign:'right' }}>{zoom.toFixed(1)}×</span>
              </div>
            )}
            {torchSupported && (
              <button onClick={toggleTorch}
                style={{ width:'100%', padding:'12px', borderRadius:16, border:'none', cursor:'pointer',
                         background: torchOn ? '#facc15' : 'rgba(255,255,255,0.15)',
                         color: torchOn ? '#111' : 'white', fontWeight:600, fontSize:14,
                         display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                {torchOn ? <Zap size={16} /> : <ZapOff size={16} />}
                {torchOn ? 'Flash On' : 'Flash Off'}
              </button>
            )}
          </div>
        </div>
      )}

      {!parsed && (
        <div className="space-y-3">

          {/* ── Clipboard auto-detected URL ── */}
          {clipboardUrl && (
            <section className="bg-emerald-50 dark:bg-emerald-950 rounded-2xl border border-emerald-200 dark:border-emerald-800 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ClipboardPaste size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Receipt URL detected in clipboard</p>
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 font-mono truncate">{clipboardUrl}</p>
              <div className="flex gap-2">
                <button onClick={() => { handleSufUrl(clipboardUrl); setClipboardUrl(null) }}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
                  Parse this receipt
                </button>
                <button onClick={() => setClipboardUrl(null)}
                  className="px-4 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm">
                  Dismiss
                </button>
              </div>
            </section>
          )}

          {/* ── Primary: paste URL (+ instructions for iPhone) ── */}
          <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                <Link2 size={14} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Paste receipt URL</p>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  iPhone: open Camera → point at QR → <strong>long-press</strong> the banner → Copy → paste here
                </p>
              </div>
            </div>
            <input
              value={manualUrl}
              onChange={e => {
                setManualUrl(e.target.value)
                // auto-trigger as soon as it looks like a valid URL
                if (isSufUrl(e.target.value.trim())) handleSufUrl(e.target.value.trim())
              }}
              onPaste={e => {
                const text = e.clipboardData.getData('text')
                if (isSufUrl(text.trim())) {
                  e.preventDefault()
                  setManualUrl(text.trim())
                  handleSufUrl(text.trim())
                }
              }}
              placeholder="https://suf.purs.gov.rs/v/?vl=..."
              className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-3 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {manualUrl && !isSufUrl(manualUrl) && (
              <button onClick={() => handleSufUrl(manualUrl.trim())} disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
                {loading ? 'Parsing…' : 'Parse Receipt'}
              </button>
            )}
          </section>

          {/* ── QR camera scanner (desktop / Android, won't work well on iPhone) ── */}
          <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                  <QrCode size={14} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Scan QR with camera</p>
                  <p className="text-[11px] text-gray-400">Works best on Android / desktop</p>
                </div>
              </div>
              {mode !== 'qr' && (
                <button onClick={startQr}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors">
                  Start
                </button>
              )}
              {mode === 'qr' && (
                <button onClick={stopQr}
                  className="px-4 py-1.5 rounded-xl border border-red-200 dark:border-red-900 text-red-500 text-sm font-medium">
                  Stop
                </button>
              )}
            </div>
          </section>

          {/* ── PFR number ── */}
          <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                  <ScanText size={14} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">PFR broj</p>
                  <p className="text-[11px] text-gray-400">Printed above the QR code</p>
                </div>
              </div>
              {mode !== 'pfr' && (
                <button onClick={startPfr}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors">
                  Scan
                </button>
              )}
            </div>

            {mode !== 'pfr' && (
              <div className="flex gap-2">
                <input value={pfrInput} onChange={e => setPfrInput(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && isPfrBroj(pfrInput) && confirmPfr()}
                  placeholder="XXXXXXXX-XXXXXXXX-XXXX" spellCheck={false} autoCorrect="off" autoCapitalize="characters"
                  className="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm font-mono bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                <button onClick={confirmPfr} disabled={!isPfrBroj(pfrInput)}
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
                <input value={pfrInput} onChange={e => setPfrInput(e.target.value.toUpperCase())}
                  placeholder="Detecting… XXXXXXXX-XXXXXXXX-XXXX" spellCheck={false} autoCorrect="off" autoCapitalize="characters"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm font-mono bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                <div className="flex gap-2">
                  {ocrDone && (
                    <button onClick={() => { setPfrInput(''); setOcrDone(false); ocrActiveRef.current = true; runOcrLoop() }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium">
                      <RotateCcw size={13} /> Again
                    </button>
                  )}
                  <button onClick={confirmPfr} disabled={!isPfrBroj(pfrInput)}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-semibold transition-colors ${ocrDone ? 'flex-1' : 'w-full'}`}>
                    <Check size={15} /> Confirm
                  </button>
                </div>
                <CamControls onStop={stopPfr} />
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
            <p className="text-xs text-gray-400">PFR: <span className="font-mono text-gray-600 dark:text-gray-300">{parsed.pfrRef}</span></p>
          )}

          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Merchant</label>
              <input className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={parsed.merchantName ?? ''}
                onChange={e => setParsed(p => p && ({ ...p, merchantName: e.target.value }))}
                placeholder="e.g. Maxi, Lidl, DM…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Amount (RSD)</label>
                <input type="number" className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={parsed.total ?? ''}
                  onChange={e => setParsed(p => p && ({ ...p, total: parseFloat(e.target.value) || null }))}
                  placeholder="0.00" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Date</label>
                <input type="date" className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={parsed.date ? new Date(parsed.date).toISOString().split('T')[0] : ''}
                  onChange={e => setParsed(p => p && ({ ...p, date: e.target.value ? new Date(e.target.value).toISOString() : null }))} />
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
          <button onClick={() => { setParsed(null); setManualUrl('') }}
            className="w-full border border-gray-200 dark:border-gray-700 py-2.5 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
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
