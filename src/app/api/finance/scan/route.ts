export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Try selectors in order; return the first non-empty text found.
 */
function pick($: ReturnType<typeof cheerio.load>, ...selectors: string[]): string | null {
  for (const sel of selectors) {
    const t = $(sel).first().text().trim()
    if (t) return t
  }
  return null
}

/**
 * Visit the portal base URL to collect any session/CSRF cookies,
 * then return them as a Cookie header string.
 */
async function getPortalCookies(): Promise<string> {
  try {
    const res = await fetch('https://suf.purs.gov.rs/', {
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'sr-RS,sr;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
      // @ts-ignore — Node 18 fetch supports this
      next: { revalidate: 0 },
    })
    const raw = res.headers.get('set-cookie') ?? ''
    if (!raw) return ''
    // Parse out name=value from each Set-Cookie directive
    return raw
      .split(/,(?=[^ ].*?=)/)           // split on comma-separated directives
      .map(c => c.split(';')[0].trim())  // keep only name=value
      .filter(Boolean)
      .join('; ')
  } catch {
    return ''
  }
}

/**
 * Parse a receipt date string. Handles:
 *   - ISO 8601 / RFC 2822 (new Date handles these)
 *   - Serbian DD.MM.YYYY HH:MM:SS
 *   - Serbian DD.MM.YYYY (date only)
 */
function parseReceiptDate(raw: string): Date | null {
  if (!raw) return null

  // DD.MM.YYYY HH:MM:SS  or  DD.MM.YYYY HH:MM
  const dmy = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?/)
  if (dmy) {
    const [, d, m, y, h, min, s = '00'] = dmy
    return new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T${h}:${min}:${s}`)
  }

  // DD.MM.YYYY
  const dmyOnly = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/)
  if (dmyOnly) {
    const [, d, m, y] = dmyOnly
    return new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`)
  }

  // Fallback — let JS parse ISO / RFC dates
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d
}

/**
 * Parse a Serbian-formatted number string to float.
 * Handles both "1.234,56" (Serbian) and "1234.56" (standard).
 */
function parseAmount(raw: string): number | null {
  if (!raw) return null
  // Remove currency symbols, whitespace
  const cleaned = raw.replace(/[^\d.,]/g, '').trim()
  if (!cleaned) return null

  // If contains comma: assume Serbian — dot is thousands separator, comma is decimal
  if (cleaned.includes(',')) {
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'))
  }
  // Otherwise standard float
  return parseFloat(cleaned.replace(/,/g, ''))
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { sufUrl } = await req.json()

  if (!sufUrl || !sufUrl.includes('suf.purs.gov.rs')) {
    return NextResponse.json({ error: 'Invalid SUF URL' }, { status: 400 })
  }

  try {
    // Grab session cookie first — portal returns 400 without it
    const cookies = await getPortalCookies()

    const headers: Record<string, string> = {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'sr-RS,sr;q=0.9,en-US;q=0.8,en;q=0.7',
      'Referer': 'https://suf.purs.gov.rs/',
      'Cache-Control': 'no-cache',
    }
    if (cookies) headers['Cookie'] = cookies

    const res = await fetch(sufUrl, {
      headers,
      redirect: 'follow',
      // @ts-ignore
      next: { revalidate: 0 },
    })

    if (!res.ok) {
      console.error('[scan] Portal responded', res.status, 'for', sufUrl)
      return NextResponse.json(
        { error: `Receipt portal returned ${res.status}` },
        { status: 502 },
      )
    }

    const html = await res.text()
    const $    = cheerio.load(html)

    // Merchant name — try several selector variants the PURS portal has used
    const merchantName = pick($,
      '#shopFullNameLabel',
      '.shop-full-name',
      '[class*="shopFullName"]',
      '[id*="shopFullName"]',
      '[class*="merchant-name"]',
      '[class*="companyName"]',
    )

    // PIB (Tax ID)
    const merchantPib = pick($,
      '#tinLabel',
      '.tin-label',
      '[id*="tin"]',
      '[class*="tin"]',
      '[id*="pib"]',
      '[class*="pib"]',
    )

    // Date / time
    const dateText = pick($,
      '#sdcDateTimeLabel',
      '[id*="sdcDateTime"]',
      '[class*="dateTime"]',
      '[class*="date-time"]',
      '[id*="dateTime"]',
    )

    // Total amount
    const totalText = pick($,
      '#totalAmountLabel',
      '[id*="totalAmount"]',
      '[class*="totalAmount"]',
      '[class*="total-amount"]',
      '[id*="total"]',
    )

    const total = parseAmount(totalText ?? '')
    const date  = parseReceiptDate(dateText ?? '')

    return NextResponse.json({
      merchantName,
      merchantPib,
      total,
      date: date ? date.toISOString() : null,
      sufUrl,
    })
  } catch (err) {
    console.error('[scan] Error:', err)
    return NextResponse.json({ error: 'Failed to fetch receipt' }, { status: 500 })
  }
}
