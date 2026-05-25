export const CATEGORY_CONFIG = {
  been:       { label: 'Been',       color: '#22c55e' },
  want_to_go: { label: 'Want to go', color: '#3b82f6' },
  regular:    { label: 'Regular',    color: '#f59e0b' },
} as const

export const CUISINES = [
  'Serbian', 'Italian', 'Japanese', 'Chinese', 'Indian',
  'Mexican', 'Greek', 'French', 'Thai', 'American',
  'Mediterranean', 'Turkish', 'Korean', 'Vietnamese',
  'Spanish', 'Lebanese', 'Burger', 'Pizza', 'Seafood', 'Other',
]

export interface Place {
  id: string
  name: string
  city: string
  country: string
  cuisine: string
  category: string
  myRating: number | null
  notes: string | null
  mustOrder: string | null
  priceRange: string | null
  latitude: number
  longitude: number
  address: string | null
  visitedAt: string | null
  googlePlaceId: string | null
  createdAt: string
}

export interface SearchResult {
  placeId: string
  name: string
  address: string
  latitude: number
  longitude: number
  city: string
  country: string
}
