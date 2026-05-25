import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  if (!q || q.length < 2) return NextResponse.json([])

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!key) return NextResponse.json([])

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.addressComponents',
    },
    body: JSON.stringify({ textQuery: q, maxResultCount: 5 }),
  })

  if (!res.ok) return NextResponse.json([])

  const data = await res.json()
  const places = (data.places ?? []).map((p: Record<string, unknown>) => {
    const components = (p.addressComponents as Record<string, unknown>[] | undefined) ?? []
    const city = components.find((c: Record<string, unknown>) => (c.types as string[])?.includes('locality'))?.longText ?? ''
    const country = components.find((c: Record<string, unknown>) => (c.types as string[])?.includes('country'))?.longText ?? ''
    const loc = p.location as { latitude: number; longitude: number } | undefined
    const displayName = p.displayName as { text?: string } | undefined
    return {
      placeId: p.id,
      name: displayName?.text ?? '',
      address: p.formattedAddress ?? '',
      latitude: loc?.latitude ?? 0,
      longitude: loc?.longitude ?? 0,
      city,
      country,
    }
  })

  return NextResponse.json(places)
}
