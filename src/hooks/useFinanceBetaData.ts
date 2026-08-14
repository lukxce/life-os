'use client'
import { useEffect, useState } from 'react'

// Shared data fetch for the finance dashboard redesign betas — same real
// numbers (net worth, accounts, spend by category, income, pace/signals)
// feeding three different visual styles, so the comparison is honest.
export function useFinanceBetaData() {
  const [dashboard, setDashboard] = useState<any>(null)
  const [signals, setSignals] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    Promise.all([
      fetch(`/api/finance/dashboard?period=month&date=${today}`).then(r => r.json()),
      fetch('/api/finance/signals').then(r => r.json()),
    ]).then(([d, s]) => { setDashboard(d); setSignals(s); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  return { dashboard, signals, loading }
}
