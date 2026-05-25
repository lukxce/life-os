import { GoogleMapsProvider } from '@/components/food/GoogleMapsProvider'
import { FoodShell } from '@/components/layout/FoodShell'

export const metadata = { title: 'Food Map — Life OS' }

export default function FoodLayout({ children }: { children: React.ReactNode }) {
  return (
    <GoogleMapsProvider>
      <FoodShell>{children}</FoodShell>
    </GoogleMapsProvider>
  )
}
