import { Plus_Jakarta_Sans } from 'next/font/google'

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] })

// Scoped to this one beta route only — doesn't touch the other betas'
// Geist font or the main app's system stack.
export default function FinanceGlassLayout({ children }: { children: React.ReactNode }) {
  return <div className={jakarta.className}>{children}</div>
}
