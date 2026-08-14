import { GeistSans } from 'geist/font/sans'

// Scoped to /beta only — the real app keeps its system-font stack. Nothing
// outside this subtree is affected.
export default function BetaLayout({ children }: { children: React.ReactNode }) {
  return <div className={GeistSans.className}>{children}</div>
}
