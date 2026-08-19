export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// ── Data export — CSV, one entity type per request ───────────────────────
// Everything here lives in one hosted Postgres instance with no other way
// to get it out. This is the minimum viable "download my data": a plain
// CSV per table, no new dependencies (no zip library — one file per type
// instead of a bundled archive), good enough for a personal backup or to
// open in a spreadsheet.

function csvField(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = v instanceof Date ? v.toISOString() : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const header = columns.join(',')
  const body = rows.map(r => columns.map(c => csvField(r[c])).join(',')).join('\n')
  return header + '\n' + body
}

const EXPORTERS: Record<string, { columns: string[]; fetch: () => Promise<Record<string, unknown>[]> }> = {
  expenses: {
    columns: ['date', 'type', 'category', 'subcategory', 'description', 'merchantName', 'amount', 'currency', 'amountRSD', 'accountId', 'notes'],
    fetch: () => prisma.expenseEntry.findMany({ orderBy: { date: 'desc' } }),
  },
  income: {
    columns: ['date', 'type', 'client', 'grossAmount', 'deduction', 'netAmount', 'currency', 'accountId', 'notes'],
    fetch: () => prisma.incomeEntry.findMany({ orderBy: { date: 'desc' } }),
  },
  bills: {
    columns: ['name', 'type', 'amount', 'currency', 'category', 'subcategory', 'dayOfMonth', 'isLoan', 'lender', 'loanEndDate', 'active', 'notes'],
    fetch: () => prisma.bill.findMany({ orderBy: { name: 'asc' } }),
  },
  subscriptions: {
    columns: ['name', 'type', 'billingAmount', 'billingCurrency', 'category', 'subcategory', 'active', 'notes'],
    fetch: () => prisma.subscription.findMany({ orderBy: { name: 'asc' } }),
  },
}

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type') ?? ''
  const exporter = EXPORTERS[type]
  if (!exporter) {
    return NextResponse.json({ error: `Unknown export type. Use one of: ${Object.keys(EXPORTERS).join(', ')}` }, { status: 400 })
  }

  const rows = await exporter.fetch()
  const csv = toCsv(rows, exporter.columns)
  const date = new Date().toISOString().slice(0, 10)

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${type}-${date}.csv"`,
    },
  })
}
