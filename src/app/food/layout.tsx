import { APIProvider } from '@vis.gl/react-google-maps'
import { FoodShell } from '@/components/layout/FoodShell'

export const metadata = { title: 'Food Map — Life OS' }

export default function FoodLayout({ children }: { children: React.ReactNode }) {
  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''}>
      <FoodShell>{children}</FoodShell>
    </APIProvider>
  )
}
