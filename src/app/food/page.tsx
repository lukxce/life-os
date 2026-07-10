'use client'
import dynamic from 'next/dynamic'
import { useEffect, useState, useCallback } from 'react'
import { Place } from '@/components/food/constants'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

const FoodMapView = dynamic(
  () => import('@/components/food/FoodMapView').then(m => m.FoodMapView),
  { ssr: false, loading: () => <div className="w-full h-full bg-gray-100 dark:bg-gray-900 animate-pulse" /> }
)

export default function FoodMapPage() {
  const [places, setPlaces] = useState<Place[]>([])

  const load = useCallback(async () => {
    const res = await fetch('/api/food/places')
    if (res.ok) setPlaces(await res.json())
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <ErrorBoundary fallback={
      <div className="w-full h-full flex items-center justify-center text-sm text-gray-400 p-6 text-center">
        Map couldn't load — check the Google Maps API key/restrictions in Google Cloud Console.
      </div>
    }>
      <FoodMapView places={places} onReload={load} />
    </ErrorBoundary>
  )
}
