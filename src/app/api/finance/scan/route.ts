export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import * as cheerio from 'cheerio'

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'

// ── Date parser ───────────────────────────────────────────────────────────────
function parseReceiptDate(raw: string): Date | null {
  if (!raw) return null
  const dmy = raw.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})\.?\s+(\d{2}):(\d{2})(?::(\d{2}))?/)
  if (dmy) {
    const [, d, m, y, h, min, s = '00'] = dmy
    return new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T${h}:${min}:${s}`)
  }
  const dt = new Date(raw)
  return isNaN(dt.getTime()) ? null : dt
}

// ── Amount parser (Serbian "1.234,56" style) ────────────────────────────────
function parseAmount(raw: string): number | null {
  if (!raw) return null
  const cleaned = raw.replace(/[^\d.,]/g, '').trim()
  if (!cleaned) return null
  if (cleaned.includes(',')) return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'))
  return parseFloat(cleaned.replace(/,/g, ''))
}

// ── Normalize URL-safe base64 ─────────────────────────────────────────────────
// Serbian fiscal QR "vl" params use URL-safe base64 (- and _ instead of + and /)
// with no padding.
function normalizeBase64(b64: string): string {
  let s = b64.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4 !== 0) s += '='
  return s
}

// ── Offline decode of the "vl" binary payload ───────────────────────────────
// Documented format (https://tap.suf.purs.gov.rs/help/view/1055198429/Create-Verification-URL):
// a fixed binary struct, MD5-signed, ending in a 16-byte hash. Offsets 25 (total,
// uint64 LE, /10000 = RSD) and 33 (date, uint64 BE, ms since epoch) give us the
// two fields that matter most — fully offline, no dependency on the portal being
// reachable. Verified against turanjanin/serbian-fiscal-receipts-parser (PHP,
// MIT) and its real receipt test fixtures.
function decodeVlBinary(vl: string): { total: number; date: Date } | null {
  try {
    const bytes = Buffer.from(normalizeBase64(vl), 'base64')
    if (bytes.length < 572 || bytes.length > 848) return null

    const hash = bytes.subarray(bytes.length - 16)
    const encodedData = bytes.subarray(0, bytes.length - 16)
    const computed = crypto.createHash('md5').update(encodedData).digest()
    if (!hash.equals(computed)) return null

    const totalRaw = bytes.readBigUInt64LE(25)
    const dateRaw = bytes.readBigUInt64BE(33)
    const total = Number(totalRaw) / 10_000
    const date = new Date(Number(dateRaw))
    if (!total || isNaN(date.getTime())) return null
    return { total, date }
  } catch {
    return null
  }
}

// ── Parse the server-rendered receipt journal (the <pre> block on the SUF
// verify page — confirmed server-rendered, no JS execution or captcha needed
// for vl= links) ─────────────────────────────────────────────────────────────
function parseJournalText(html: string): {
  merchantName: string | null; merchantPib: string | null
  total: number | null; date: Date | null
} {
  const $ = cheerio.load(html)
  const pre = $('pre').first().text()
  if (!pre) return { merchantName: null, merchantPib: null, total: null, date: null }

  const text = pre.replace(/\r\n/g, '\n')

  let merchantPib: string | null = null
  let merchantName: string | null = null
  const pibMatch = text.match(/ФИСКАЛНИ РАЧУН[^\n]*\n\s*(\d{9})\s*\n/)
  if (pibMatch) {
    merchantPib = pibMatch[1]
    const nameLines: string[] = []
    for (const line of text.slice(pibMatch.index! + pibMatch[0].length).split('\n')) {
      const t = line.trim()
      if (/^\d+-/.test(t)) break
      if (t) nameLines.push(t)
      if (nameLines.length >= 3) break
    }
    merchantName = nameLines.join(' ').trim() || null
  }

  const totalMatch = text.match(/Укупан износ:\s*([\d.,]+)/)
  const total = totalMatch ? parseAmount(totalMatch[1]) : null

  const dateMatch = text.match(/ПФР време:\s*([\d.]+\s+\d{2}:\d{2}:\d{2})/)
  const date = dateMatch ? parseReceiptDate(dateMatch[1]) : null

  return { merchantName, merchantPib, total, date }
}

// ── Route ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { sufUrl } = await req.json()

  if (!sufUrl || !sufUrl.includes('suf.purs.gov.rs')) {
    return NextResponse.json({ error: 'Invalid SUF URL' }, { status: 400 })
  }

  const vl = new URL(sufUrl).searchParams.get('vl') ?? ''

  // A QR that only encodes a short PFR reference number (no embedded receipt
  // data) can't be resolved without the printed QR / full portal URL.
  if (vl) {
    try {
      const decoded = Buffer.from(normalizeBase64(vl), 'base64').toString('utf8')
      if (decoded.length < 60 && /^[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+$/i.test(decoded.trim())) {
        return NextResponse.json({
          merchantName: null, merchantPib: null, total: null, date: null, sufUrl,
          pfrFailed: true,
          warning: 'This QR only contains a reference number, not the full receipt data — rescan the printed QR code on the receipt itself, or use Photo instead.',
        })
      }
    } catch {}
  }

  // Offline, network-independent decode of total + date — reliable even if
  // the portal is slow/unreachable from this server.
  const binary = vl ? decodeVlBinary(vl) : null

  let merchantName: string | null = null
  let merchantPib: string | null = null
  let total: number | null = binary?.total ?? null
  let date: Date | null = binary?.date ?? null

  try {
    const res = await fetch(sufUrl, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      redirect: 'follow',
      signal: AbortSignal.timeout(6000),
      // @ts-ignore
      next: { revalidate: 0 },
    })
    const html = await res.text()
    const parsed = parseJournalText(html)
    merchantName = parsed.merchantName
    merchantPib = parsed.merchantPib
    if (total == null) total = parsed.total
    if (date == null) date = parsed.date
  } catch {
    // Portal unreachable — fall back to whatever the offline decode gave us.
  }

  const allEmpty = !merchantName && total == null && date == null
  return NextResponse.json({
    merchantName,
    merchantPib,
    total,
    date: date?.toISOString() ?? null,
    sufUrl,
    warning: allEmpty
      ? 'Could not read receipt data automatically. Fill in the details below, or use the Photo option instead.'
      : (!merchantName ? 'Merchant name not found — fill in manually.' : null),
  })
}
