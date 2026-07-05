import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Metadata } from 'next'
import Link from 'next/link'

const CATEGORY_LABEL: Record<string, string> = {
  been: 'Visited',
  want_to_go: 'Want to visit',
  regular: 'Regular',
}

const CATEGORY_COLOR: Record<string, string> = {
  been: 'bg-green-100 text-green-700',
  want_to_go: 'bg-blue-100 text-blue-700',
  regular: 'bg-amber-100 text-amber-700',
}

const PRICE_LABEL: Record<string, string> = {
  budget: '€',
  mid: '€€',
  upscale: '€€€',
}

interface Props {
  params: { city: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const city = decodeURIComponent(params.city)
  return {
    title: `${city} — Food Guide`,
    description: `My favourite spots in ${city}`,
  }
}

export default async function CityGuidePage({ params }: Props) {
  const city = decodeURIComponent(params.city)

  const places = await prisma.place.findMany({
    where: { city: { equals: city, mode: 'insensitive' } },
    orderBy: [{ category: 'asc' }, { myRating: 'desc' }, { name: 'asc' }],
  })

  if (places.length === 0) {
    notFound()
  }

  const beenPlaces    = places.filter(p => p.category === 'been' || p.category === 'regular')
  const wantPlaces    = places.filter(p => p.category === 'want_to_go')
  const cuisines      = Array.from(new Set(places.map(p => p.cuisine).filter(Boolean)))
  const country       = places[0]?.country

  return (
    <main className="min-h-screen bg-[#f5f5f7] dark:bg-gray-950">
      {/* Hero */}
      <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-red-500 text-white px-5 pt-14 pb-10">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs font-semibold tracking-widest text-white/60 uppercase mb-2">Food Guide</p>
          <h1 className="text-4xl font-bold mb-1">{city}</h1>
          {country && <p className="text-white/70 text-sm">{country}</p>}
          <div className="flex flex-wrap gap-3 mt-5">
            <span className="bg-white/20 rounded-full px-3 py-1 text-sm">{places.length} spot{places.length !== 1 ? 's' : ''}</span>
            {cuisines.slice(0, 4).map(c => (
              <span key={c} className="bg-white/20 rounded-full px-3 py-1 text-sm">{c}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Visited */}
        {beenPlaces.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">✅ My Picks</h2>
            <div className="space-y-3">
              {beenPlaces.map(place => (
                <PlaceCard key={place.id} place={place} />
              ))}
            </div>
          </section>
        )}

        {/* Want to go */}
        {wantPlaces.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">🔖 Also Check Out</h2>
            <div className="space-y-3">
              {wantPlaces.map(place => (
                <PlaceCard key={place.id} place={place} />
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 pt-4 border-t border-black/5 dark:border-white/5">
          Curated guide · Made with{' '}
          <Link href="/" className="text-orange-500 hover:underline">Life OS</Link>
        </div>
      </div>
    </main>
  )
}

function PlaceCard({ place }: { place: any }) {
  return (
    <div className="bg-white/85 dark:bg-gray-900/70 rounded-2xl border border-black/5 dark:border-white/5 overflow-hidden">
      {/* Photo */}
      {place.photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={place.photoUrl}
          alt={place.name}
          className="w-full h-48 object-cover"
        />
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{place.name}</h3>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              {place.cuisine && (
                <span className="text-xs text-gray-500 dark:text-gray-400">{place.cuisine}</span>
              )}
              {place.cuisine && place.priceRange && (
                <span className="text-gray-300 dark:text-gray-600">·</span>
              )}
              {place.priceRange && (
                <span className="text-xs text-gray-500 dark:text-gray-400">{PRICE_LABEL[place.priceRange] ?? place.priceRange}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {place.myRating != null && (
              <span className="bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 text-sm font-bold px-2.5 py-0.5 rounded-full">
                {place.myRating}/10
              </span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLOR[place.category] ?? 'bg-gray-100 text-gray-600'}`}>
              {CATEGORY_LABEL[place.category] ?? place.category}
            </span>
          </div>
        </div>

        {place.mustOrder && (
          <div className="mt-2.5 flex items-start gap-1.5">
            <span className="text-sm">🍽️</span>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <span className="font-medium">Must order:</span> {place.mustOrder}
            </p>
          </div>
        )}

        {place.notes && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">{place.notes}</p>
        )}

        {place.address && (
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(place.name + ' ' + place.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-2.5 text-xs text-orange-500 hover:underline"
          >
            📍 {place.address}
          </a>
        )}
      </div>
    </div>
  )
}
