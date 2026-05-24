export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const GECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'binancecoin',
  SOL: 'solana',
  XRP: 'ripple',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  TRX: 'tron',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  AVAX: 'avalanche-2',
  LINK: 'chainlink',
  UNI: 'uniswap',
  LTC: 'litecoin',
  ATOM: 'cosmos',
  USDT: 'tether',
  USDC: 'usd-coin',
}

let cache: { data: any; at: number } | null = null
const CACHE_MS = 5 * 60 * 1000

export async function GET() {
  const holdings = await prisma.cryptoHolding.findMany()
  const symbols = Array.from(new Set(holdings.map(h => h.symbol)))
  const ids = symbols.map(s => GECKO_IDS[s]).filter(Boolean).join(',')

  if (!ids) return NextResponse.json({})

  if (cache && Date.now() - cache.at < CACHE_MS) {
    return NextResponse.json(cache.data)
  }

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=eur&include_24hr_change=true`,
      { next: { revalidate: 300 } }
    )
    const raw = await res.json()
    const data: Record<string, { eur: number; eur_24h_change: number }> = {}
    for (const symbol of symbols) {
      const geckoId = GECKO_IDS[symbol]
      if (geckoId && raw[geckoId]) {
        data[symbol] = { eur: raw[geckoId].eur, eur_24h_change: raw[geckoId].eur_24h_change }
      }
    }
    cache = { data, at: Date.now() }
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(cache?.data ?? {})
  }
}
