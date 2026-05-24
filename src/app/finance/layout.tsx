import { FinanceShell } from '@/components/layout/FinanceShell'

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return <FinanceShell>{children}</FinanceShell>
}
