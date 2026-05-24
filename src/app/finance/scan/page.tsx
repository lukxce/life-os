'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, X, Zap, ZapOff, ZoomIn, ZoomOut } from 'lucide-react'

export default function ScanPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const detectorRef = useRef<any>(null)

  const [scanning, setScanning] = useState(false)
  const [manualUrl, setManualUrl] = useState('')
  const [parsed, setParsed] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expenseType, setExpenseType] = useState<'personal' | 'business'>('personal')
  const [torchOn, setTorchOn] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [zoomSupported, setZoomSupported] = useState(false)
  const [zoomMin, setZoomMin] = useState(1)
  const [zoomMax, setZoomMax] = useState(3)

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

  const stopScanner = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    detectorRef.current = null
    setScanning(false)
    setTorchOn(false)
    setTorchSupported(false)
    setZoomSupported(false)
  }, [])

  const startScanner = async () => {
    setError('')
    setScanning(true)
    setTorchOn(false)
    setZoom(1)

    // Build detector: native BarcodeDetector first, ZXing fallback
    let detector: any
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
      } catch {}
    }
    if (!detector) {
      const { BrowserQRCodeReader } = await import('@zxing/browser')
      detector = { _zxing: new BrowserQRCodeReader(), _isZxing: true }
    }
    detectorRef.current = detector

    // Start camera
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { exact: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          // @ts-ignore
          focusMode: 'continuous',
        },
        audio: false,
      })
    } catch {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        })
      } catch {
        setError('Camera access denied. Try pasting the URL below.')
        setScanning(false)
        return
      }
    }

    streamRef.current = stream
    const video = videoRef.current!
    video.srcObject = stream
    await video.play()

    // Expose torch + zoom controls
    const track = stream.getVideoTracks()[0]
    const caps = track.getCapabilities() as any
    if (caps?.torch) setTorchSupported(true)
    if (caps?.zoom) {
      setZoomSupported(true)
      setZoomMin(caps.zoom.min ?? 1)
      setZoomMax(caps.zoom.max ?? 3)
    }

    // Detection loop via rAF — runs every frame the browser paints
    let lastDetect = 0
    const INTERVAL_MS = 80 // ~12 fps detection, smooth preview

    const tick = async (now: number) => {
      if (!streamRef.current) return
      if (now - lastDetect >= INTERVAL_MS) {
        lastDetect = now
        try {
          let result: string | null = null

          if (detector._isZxing) {
            // ZXing path
            const canvas = document.createElement('canvas')
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            canvas.getContext('2d')!.drawImage(video, 0, 0)
            try {
              const r = await detector._zxing.decodeFromCanvas(canvas)
              result = r?.getText() ?? null
            } catch {}
          } else {
            // Native BarcodeDetector path
            const barcodes = await detector.detect(video)
            result = barcodes[0]?.rawValue ?? null
          }

          if (result) {
            stopScanner()
            handleSufUrl(result)
            return
          }
        } catch {}
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
  }

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn } as any] })
      setTorchOn(v => !v)
    } catch {
      setError('Flash not available on this camera')
    }
  }

  const applyZoom = async (newZoom: number) => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    try {
      await track.applyConstraints({ advanced: [{ zoom: newZoom } as any] })
      setZoom(newZoom)
    } catch {}
  }

  useEffect(() => () => stopScanner(), [stopScanner])

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Scan Receipt</h2>

      {!parsed && (
        <>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
            {!scanning ? (
              <button onClick={startScanner}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700">
                <Camera size={18} /> Open Camera
              </button>
            ) : (
              <div className="space-y-3">
                <div className="relative rounded-lg overflow-hidden bg-black aspect-square">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Targeting overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-3/4 h-3/4 relative">
                      {/* Corner brackets */}
                      {[
                        'top-0 left-0 border-t-2 border-l-2 rounded-tl-md',
                        'top-0 right-0 border-t-2 border-r-2 rounded-tr-md',
                        'bottom-0 left-0 border-b-2 border-l-2 rounded-bl-md',
                        'bottom-0 right-0 border-b-2 border-r-2 rounded-br-md',
                      ].map((cls, i) => (
                        <div key={i} className={`absolute w-8 h-8 border-white ${cls}`} />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {torchSupported && (
                    <button onClick={toggleTorch}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${torchOn ? 'bg-yellow-500 text-white' : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}>
                      {torchOn ? <Zap size={16} /> : <ZapOff size={16} />}
                      {torchOn ? 'Flash on' : 'Flash off'}
                    </button>
                  )}
                  <button onClick={stopScanner}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-2 rounded-lg text-sm font-medium">
                    <X size={16} /> Stop
                  </button>
                </div>

                {zoomSupported && (
                  <div className="flex items-center gap-2">
                    <ZoomOut size={16} className="text-gray-500" />
                    <input type="range" min={zoomMin} max={zoomMax} step={0.1} value={zoom}
                      onChange={e => applyZoom(+e.target.value)} className="flex-1" />
                    <ZoomIn size={16} className="text-gray-500" />
                    <span className="text-xs text-gray-500 w-10 text-right">{zoom.toFixed(1)}×</span>
                  </div>
                )}

                <p className="text-xs text-gray-400 text-center">
                  Aim at the QR code — detected instantly
                </p>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Or paste the receipt URL manually</label>
            <input value={manualUrl} onChange={e => setManualUrl(e.target.value)}
              placeholder="https://suf.purs.gov.rs/v/?vl=..."
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100" />
            <button onClick={() => handleSufUrl(manualUrl)} disabled={!manualUrl || loading}
              className="w-full bg-gray-800 dark:bg-gray-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              {loading ? 'Parsing...' : 'Parse Receipt'}
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
              <span className="text-gray-700 dark:text-gray-300">{parsed.date ? new Date(parsed.date).toLocaleString('sr-RS') : '—'}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
              <span className="text-gray-700 dark:text-gray-300 font-medium">Total</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">{parsed.total?.toLocaleString('sr-RS')} RSD</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">Expense type</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setExpenseType('personal')}
                className={`py-2 rounded-lg text-sm font-medium border transition-colors ${expenseType === 'personal' ? 'bg-red-600 text-white border-red-600' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                Personal
              </button>
              <button onClick={() => setExpenseType('business')}
                className={`py-2 rounded-lg text-sm font-medium border transition-colors ${expenseType === 'business' ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                Business
              </button>
            </div>
          </div>

          <button onClick={() => {
            const params = new URLSearchParams({
              merchantName: parsed.merchantName || '',
              merchantPib: parsed.merchantPib || '',
              sufUrl: parsed.sufUrl || '',
              amount: String(parsed.total || ''),
              date: parsed.date ? new Date(parsed.date).toISOString().split('T')[0] : '',
            })
            router.push(`/finance/expenses/${expenseType}?${params.toString()}`)
          }} className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700">
            Continue → Categorize
          </button>
          <button onClick={() => { setParsed(null); setManualUrl('') }}
            className="w-full border border-gray-300 dark:border-gray-600 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            Scan Another
          </button>
        </div>
      )}
    </div>
  )
}
