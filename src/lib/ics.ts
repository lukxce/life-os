export interface ICSEvent {
  uid: string
  summary: string
  start: string
  end: string
  location?: string
  description?: string
  allDay: boolean
}

// ── Windows timezone name → IANA mapping ──────────────────────────────────────
// Outlook and Exchange emit Windows timezone names which Intl doesn't recognise.
const WIN_TO_IANA: Record<string, string> = {
  // Europe
  'W. Europe Standard Time':          'Europe/Berlin',
  'Central Europe Standard Time':     'Europe/Budapest',
  'Central European Standard Time':   'Europe/Warsaw',
  'Romance Standard Time':            'Europe/Paris',
  'GMT Standard Time':                'Europe/London',
  'Greenwich Standard Time':          'Atlantic/Reykjavik',
  'GTB Standard Time':                'Europe/Bucharest',
  'E. Europe Standard Time':          'Asia/Nicosia',
  'Eastern Europe Standard Time':     'Europe/Nicosia',
  'FLE Standard Time':                'Europe/Helsinki',
  'Turkey Standard Time':             'Europe/Istanbul',
  'Russian Standard Time':            'Europe/Moscow',
  'Belarus Standard Time':            'Europe/Minsk',
  'Serbia Standard Time':             'Europe/Belgrade',
  // Middle East / Africa
  'Arab Standard Time':               'Asia/Riyadh',
  'Arabian Standard Time':            'Asia/Dubai',
  'Arabic Standard Time':             'Asia/Baghdad',
  'Israel Standard Time':             'Asia/Jerusalem',
  'Egypt Standard Time':              'Africa/Cairo',
  'South Africa Standard Time':       'Africa/Johannesburg',
  'E. Africa Standard Time':          'Africa/Nairobi',
  // Asia-Pacific
  'India Standard Time':              'Asia/Calcutta',
  'Pakistan Standard Time':           'Asia/Karachi',
  'Bangladesh Standard Time':         'Asia/Dhaka',
  'SE Asia Standard Time':            'Asia/Bangkok',
  'China Standard Time':              'Asia/Shanghai',
  'Tokyo Standard Time':              'Asia/Tokyo',
  'Korea Standard Time':              'Asia/Seoul',
  'AUS Eastern Standard Time':        'Australia/Sydney',
  // Americas
  'Eastern Standard Time':            'America/New_York',
  'Central Standard Time':            'America/Chicago',
  'Mountain Standard Time':           'America/Denver',
  'Pacific Standard Time':            'America/Los_Angeles',
  'UTC-02':                           'Etc/GMT+2',
  'UTC+12':                           'Etc/GMT-12',
  'UTC':                              'UTC',
}

/** Resolve a TZID (IANA or Windows) to an IANA name Intl understands. */
function resolveIana(tzid: string): string {
  return WIN_TO_IANA[tzid] ?? tzid
}

/** Convert a wall-clock time in a named timezone to a UTC Date.
 *  Handles both IANA names and Windows timezone names (via mapping). */
function tzLocalToUTC(
  tzid: string, y: number, mo: number, d: number, h: number, mi: number, s: number
): Date {
  const iana = resolveIana(tzid)
  try {
    const trial = new Date(Date.UTC(y, mo, d, h, mi, s))
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: iana,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    })
    const parts = fmt.formatToParts(trial)
    const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value ?? '0')
    const tzH = get('hour') % 24
    const diff =
      Date.UTC(y, mo, d, h, mi, s) -
      Date.UTC(get('year'), get('month') - 1, get('day'), tzH, get('minute'), get('second'))
    return new Date(trial.getTime() + diff)
  } catch {
    // Still unrecognised — fall back to UTC (better than a wrong local shift)
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
  const y  = parseInt(clean.slice(0, 4))
  const mo = parseInt(clean.slice(4, 6)) - 1
  const d  = parseInt(clean.slice(6, 8))
  const h  = parseInt(clean.slice(9, 11))  || 0
  const mi = parseInt(clean.slice(11, 13)) || 0
  const s  = parseInt(clean.slice(13, 15)) || 0

  if (isUTC) return { date: new Date(Date.UTC(y, mo, d, h, mi, s)), allDay: false }

  // DTSTART;TZID=W. Europe Standard Time:20240610T100000
  // DTSTART;TZID="W. Europe Standard Time":20240610T100000  ← Outlook sometimes quotes the name
  const tzidMatch = keyFull.match(/TZID=["']?([^"';:]+)["']?/)
  if (tzidMatch) {
    return { date: tzLocalToUTC(tzidMatch[1].trim(), y, mo, d, h, mi, s), allDay: false }
  }

  // Floating time — treat as UTC
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
      const endKey   = Object.keys(raw).find(k => k.startsWith('DTEND'))
      if (!startKey) continue
      const { date: start, allDay } = parseICSDate(startKey, raw[startKey])
      const end = endKey ? parseICSDate(endKey, raw[endKey]).date : start
      events.push({
        uid:         raw['UID'] || `${Date.now()}-${Math.random()}`,
        summary:     (raw['SUMMARY']     || '(No title)').replace(/\\n/g, ' ').replace(/\\,/g, ','),
        start:       start.toISOString(),
        end:         end.toISOString(),
        location:    raw['LOCATION']?.replace(/\\n/g, ', ').replace(/\\,/g, ',')  || undefined,
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
