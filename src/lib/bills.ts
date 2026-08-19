// ── Shared bill due-date math ────────────────────────────────────────────
// Previously duplicated THREE times (finance Signals, the mascot's nudge
// popup, and the Bills & Loans page itself), each its own independent
// implementation. Two things this fixes by becoming the one shared version:
//
// 1. The three could (and did) disagree about the same bill — nudges used a
//    plain day-of-month comparison, Signals and the Bills page each rolled
//    the due date forward with `new Date(...); if (due < now) +1 month`.
//
// 2. That rollover was a real, live bug in both of the latter two: it
//    compares against the exact current TIMESTAMP, not the calendar date —
//    so a bill due earlier this month (or literally today, after midnight)
//    always looks "in the past" relative to right-now and gets bumped to
//    NEXT month, landing ~30 days out. An overdue bill would silently stop
//    showing as overdue (or due-today) and sort/display as if it were
//    nearly a month away. No rollover needed here at all: callers already
//    filter out bills paid this month before asking how many days until
//    the current month's occurrence, so this only ever needs to answer
//    that one question — negative means overdue, 0 means due today.
export function daysUntilBillDue(dayOfMonth: number, now: Date): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const due = new Date(now.getFullYear(), now.getMonth(), dayOfMonth)
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function isBillPaidThisMonth(payments: { paidDate: Date }[], now: Date): boolean {
  if (!payments?.length) return false
  const last = payments[0].paidDate
  return last.getMonth() === now.getMonth() && last.getFullYear() === now.getFullYear()
}
