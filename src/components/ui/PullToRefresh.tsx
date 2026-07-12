'use client'
import { useRef, useState, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pulling, setPulling] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [pullY, setPullY] = useState(0)
  const startY = useRef(0)
  const threshold = 80

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const el = e.currentTarget as HTMLElement
    if (el.scrollTop > 0) return
    const dy = e.touches[0].clientY - startY.current
    if (dy > 0) {
      setPulling(true)
      setPullY(Math.min(dy, threshold + 20))
    }
  }, [])

  const onTouchEnd = useCallback(async () => {
    if (pullY >= threshold) {
      setRefreshing(true)
      setPulling(false)
      setPullY(0)
      await onRefresh()
      setRefreshing(false)
    } else {
      setPulling(false)
      setPullY(0)
    }
  }, [pullY, onRefresh, threshold])

  return (
    <div className="relative overflow-auto h-full"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {(pulling || refreshing) && (
        <div className="flex justify-center pt-2 pb-1" style={{ marginTop: pulling ? pullY - 40 : 0 }}>
          <RefreshCw size={20} className={`text-ldg-green ${refreshing ? 'animate-spin' : ''}`}
            style={{ transform: pulling ? `rotate(${(pullY / threshold) * 360}deg)` : undefined }} />
        </div>
      )}
      {children}
    </div>
  )
}
