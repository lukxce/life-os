export interface ICSEvent {
  uid: string
  summary: string
  start: string
  end: string
  location?: string
  description?: string
  allDay: boolean
}

/** Convert a "local wall-clock" time in a named IANA timezone to a UTC Date.
 *  Uses the Intl offset trick: format a trial UTC date in the target timezone,
 *  measure the gap, then correct. Falls back to treating the time as UTC if the
 *  timezone name is unrecognised (e.g. Windows-style "W. Europe Standard Time"). */
function tzLocalToUTC(
  tzid: string, y: number, mo: number, d: number, h: number, mi: number, s: number
): Date {
  try {
    const trial = new Date(Date.UTC(y, mo, d, h, mi, s))
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: tzid,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    })
    const parts = fmt.formatToParts(trial)
    const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value ?? '0')
    const tzH = get('hour') % 24 // hour12:false can return 24 for midnight
    const diff =
      Date.UTC(y, mo, d, h, mi, s) -
      Date.UTC(get('year'), get('month') - 1, get('day'), tzH, get('minute'), get('second'))
    return new Date(trial.getTime() + diff)
  } catch {
    // Unknown timezone — treat the value as UTC so at least it's consistently wrong
    return new Date(Date.UTC(y, mo, d, h, mi, s))
  }
}

function parseICSDate(keyFull: string, value: string): { date: Date; allDay: boolean } {
  const isAllDay = keyFull.includes('VALUE=DATE') || /^\d{8}$/.test(value)
  if (isAllDay) {
    const y = parseInt(value.slice(0, 4))
    const mo = parseInt(value.slice(4, 6)) - 1
    const d = parseInt(value.slice(6, 8))
    return { date: new Date(y, mo, d), allDay: true }
  }
  const isUTC = value.endsWith('Z')
  const clean = value.replace('Z', '')
  const y = parseInt(clean.slice(0, 4))
  const mo = parseInt(clean.slice(4, 6)) - 1
  const d = parseInt(clean.slice(6, 8))
  const h = parseInt(clean.slice(9, 11)) || 0
  const mi = parseInt(clean.slice(11, 13)) || 0
  const s = parseInt(clean.slice(13, 15)) || 0

  if (isUTC) return { date: new Date(Date.UTC(y, mo, d, h, mi, s)), allDay: false }

  // DTSTART;TZID=Europe/Amsterdam:20240610T100000 — convert timezone-aware local → UTC
  const tzidMatch = keyFull.match(/TZID=([^;:]+)/)
  if (tzidMatch) return { date: tzLocalToUTC(tzidMatch[1].trim(), y, mo, d, h, mi, s), allDay: false }

  // Floating time (no Z, no TZID) — treat as UTC
  return { date: new Date(Date.UTC(y, mo, d, h, mi, s)), allDay: false }
}

export function parseICS(text: string): ICSEvent[] {
  const lines = text
    .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    .replace(/\n[ \t]/g, '')
    .split('\n')

  const events: ICSEvent[] = []
  let inEvent = false
  let raw: Record<string, string> = {}

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { inEvent = true; raw = {}; continue }
    if (line === 'END:VEVENT') {
      inEvent = false
      const startKey = Object.keys(raw).find(k => k.startsWith('DTSTART'))
      const endKey = Object.keys(raw).find(k => k.startsWith('DTEND'))
      if (!startKey) continue
      const { date: start, allDay } = parseICSDate(startKey, raw[startKey])
      const end = endKey ? parseICSDate(endKey, raw[endKey]).date : start
      events.push({
        uid: raw['UID'] || `${Date.now()}-${Math.random()}`,
        summary: (raw['SUMMARY'] || '(No title)').replace(/\\n/g, ' ').replace(/\\,/g, ','),
        start: start.toISOString(),
        end: end.toISOString(),
        location: raw['LOCATION']?.replace(/\\n/g, ', ').replace(/\\,/g, ',') || undefined,
        description: raw['DESCRIPTION']?.replace(/\\n/g, '\n').replace(/\\,/g, ',') || undefined,
        allDay,
      })
      continue
    }
    if (!inEvent) continue
    const colon = line.indexOf(':')
    if (colon < 1) continue
    const key = line.slice(0, colon)
    const val = line.slice(colon + 1)
    if (!raw[key]) raw[key] = val
  }

  return events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
}
