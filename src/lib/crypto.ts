import { prisma } from './prisma'

export const GECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', BNB: 'binancecoin', SOL: 'solana',
  XRP: 'ripple', ADA: 'cardano', DOGE: 'dogecoin', TRX: 'tron',
  DOT: 'polkadot', MATIC: 'matic-network', AVAX: 'avalanche-2',
  LINK: 'chainlink', UNI: 'uniswap', LTC: 'litecoin', ATOM: 'cosmos',
  USDT: 'tether', USDC: 'usd-coin',
}

const CACHE_MS = 6 * 60 * 60 * 1000 // 6 hours
let priceCache: { data: Record<string, { eur: number; eur_24h_change: number }>; at: number } | null = null

export async function getCryptoPrices(symbols: string[]): Promise<Record<string, { eur: number; eur_24h_change: number }>> {
  const ids = symbols.map(s => GECKO_IDS[s]).filter(Boolean).join(',')
  if (!ids) return {}

  if (priceCache && Date.now() - priceCache.at < CACHE_MS) return priceCache.data

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=eur&include_24hr_change=true`,
      { cache: 'no-store' }
    )
    if (!res.ok) return priceCache?.data ?? {}
    const raw = await res.json()
    const data: Record<string, { eur: number; eur_24h_change: number }> = {}
    for (const symbol of symbols) {
      const geckoId = GECKO_IDS[symbol]
      if (geckoId && raw[geckoId]) {
        data[symbol] = { eur: raw[geckoId].eur, eur_24h_change: raw[geckoId].eur_24h_change }
      }
    }
    priceCache = { data, at: Date.now() }
    return data
  } catch {
    return priceCache?.data ?? {}
  }
}

export async function computeCryptoPortfolioEUR(): Promise<number> {
  const holdings = await prisma.cryptoHolding.findMany()
  if (!holdings.length) return 0
  const symbols = [...new Set(holdings.map(h => h.symbol))]
  const prices = await getCryptoPrices(symbols)
  return holdings.reduce((sum, h) => sum + h.quantity * (prices[h.symbol]?.eur ?? 0), 0)
}
