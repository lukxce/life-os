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
  // Americas — North
  'Eastern Standard Time':            'America/New_York',
  'Central Standard Time':            'America/Chicago',
  'Mountain Standard Time':           'America/Denver',
  'Pacific Standard Time':            'America/Los_Angeles',
  'Alaskan Standard Time':            'America/Anchorage',
  'Hawaiian Standard Time':           'Pacific/Honolulu',
  'Atlantic Standard Time':           'America/Halifax',
  'Canada Central Standard Time':     'America/Regina',
  'Central America Standard Time':    'America/Guatemala',
  'Mexico Standard Time':             'America/Mexico_City',
  'Mexico Standard Time 2':           'America/Chihuahua',
  'US Mountain Standard Time':        'America/Phoenix',
  'US Eastern Standard Time':         'America/Indiana/Indianapolis',
  'Greenland Standard Time':          'America/Godthab',
  // Americas — South
  'E. South America Standard Time':   'America/Sao_Paulo',   // Brazil (São Paulo/Rio)
  'SA Eastern Standard Time':         'America/Cayenne',
  'SA Western Standard Time':         'America/La_Paz',
  'SA Pacific Standard Time':         'America/Bogota',
  'Amazon Standard Time':             'America/Manaus',
  'Bahia Standard Time':              'America/Bahia',
  'Argentina Standard Time':          'America/Argentina/Buenos_Aires',
  'Venezuela Standard Time':          'America/Caracas',
  'Paraguay Standard Time':           'America/Asuncion',
  'Montevideo Standard Time':         'America/Montevideo',
  'Chile Standard Time':              'America/Santiago',
  'Colombia Standard Time':           'America/Bogota',
  'Peru Standard Time':               'America/Lima',
  'Mid-Atlantic Standard Time':       'Atlantic/South_Georgia',
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

// ── RRULE expansion ───────────────────────────────────────────────────────────

/** Parse an RRULE UNTIL value (YYYYMMDD or YYYYMMDDTHHmmssZ). */
function parseRruleDate(s: string): Date {
  const clean = s.replace(/Z$/, '')
  const y  = parseInt(clean.slice(0, 4))
  const mo = parseInt(clean.slice(4, 6)) - 1
  const d  = parseInt(clean.slice(6, 8))
  if (clean.length <= 8) return new Date(Date.UTC(y, mo, d, 23, 59, 59))
  const h  = parseInt(clean.slice(9, 11))  || 0
  const mi = parseInt(clean.slice(11, 13)) || 0
  const sec = parseInt(clean.slice(13, 15)) || 0
  return new Date(Date.UTC(y, mo, d, h, mi, sec))
}

/**
 * Expand a recurring event rule (RRULE) into individual occurrence timestamps.
 * Only occurrences within [windowStart, windowEnd] are returned.
 * exdateSet contains UTC-midnight timestamps of excluded dates.
 */
function expandRrule(
  dtstart: Date,
  rruleStr: string,
  exdateSet: Set<number>,
  windowStart: Date,
  windowEnd: Date,
): Date[] {
  const params: Record<string, string> = {}
  for (const part of rruleStr.split(';')) {
    const eq = part.indexOf('=')
    if (eq > 0) params[part.slice(0, eq).toUpperCase()] = part.slice(eq + 1)
  }

  const freq     = params['FREQ'] ?? ''
  const interval = Math.max(1, parseInt(params['INTERVAL'] ?? '1') || 1)
  const maxCount = params['COUNT'] ? parseInt(params['COUNT']) : Infinity
  const until    = params['UNTIL'] ? parseRruleDate(params['UNTIL']) : null

  // BYDAY: comma-separated day names, possibly prefixed with nth-weekday (e.g. "+1MO", "-1FR", "2TU")
  const bydayStrs  = params['BYDAY']
    ? params['BYDAY'].split(',').map(s => s.replace(/^[+-]?\d*/, '').trim().toUpperCase())
    : null
  const bymonthday = params['BYMONTHDAY']
    ? params['BYMONTHDAY'].split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
    : null

  // Map day abbreviation → JS getUTCDay() value
  const DAY_MAP: Record<string, number> = { SU:0, MO:1, TU:2, WE:3, TH:4, FR:5, SA:6 }
  const bydayNums = bydayStrs?.map(d => DAY_MAP[d]).filter(n => n !== undefined) as number[] | null

  const effectiveEnd = until
    ? new Date(Math.min(until.getTime(), windowEnd.getTime()))
    : windowEnd

  const results: Date[] = []

  function addIfValid(d: Date) {
    if (d.getTime() < dtstart.getTime()) return   // before recurrence start
    if (d.getTime() < windowStart.getTime()) return
    if (d.getTime() > effectiveEnd.getTime()) return
    if (results.length >= maxCount) return
    // Exclude by EXDATE (match on UTC calendar date)
    const dayKey = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
    if (exdateSet.has(dayKey)) return
    results.push(new Date(d))
  }

  if (freq === 'DAILY') {
    let cur = new Date(dtstart)
    let safety = 0
    while (cur.getTime() <= effectiveEnd.getTime() && results.length < maxCount && safety++ < 800) {
      addIfValid(cur)
      cur = new Date(cur)
      cur.setUTCDate(cur.getUTCDate() + interval)
    }

  } else if (freq === 'WEEKLY') {
    // Find the Monday (UTC) of the week that dtstart falls in
    const startDayOfWeek = dtstart.getUTCDay()           // 0=Sun
    const daysToMon = startDayOfWeek === 0 ? -6 : 1 - startDayOfWeek
    const weekMonday = new Date(dtstart)
    weekMonday.setUTCDate(dtstart.getUTCDate() + daysToMon)

    let weekStart = new Date(weekMonday)
    let safety = 0
    while (weekStart.getTime() <= effectiveEnd.getTime() && results.length < maxCount && safety++ < 500) {
      // Which days of this week to check: BYDAY list, or just dtstart's weekday
      const daysToCheck = bydayNums ?? [startDayOfWeek === 0 ? 0 : startDayOfWeek]
      for (const dayNum of [...daysToCheck].sort((a, b) => a - b)) {
        const daysFromMon = dayNum === 0 ? 6 : dayNum - 1   // MO=0 offset, SU=6 offset
        const candidate = new Date(weekStart)
        candidate.setUTCDate(weekStart.getUTCDate() + daysFromMon)
        addIfValid(candidate)
      }
      weekStart = new Date(weekStart)
      weekStart.setUTCDate(weekStart.getUTCDate() + 7 * interval)
    }

  } else if (freq === 'MONTHLY') {
    let cur = new Date(dtstart)
    let safety = 0
    while (cur.getTime() <= effectiveEnd.getTime() && results.length < maxCount && safety++ < 100) {
      const dom = cur.getUTCDate()
      const ok = !bymonthday || bymonthday.includes(dom)
      if (ok) addIfValid(cur)
      cur = new Date(cur)
      cur.setUTCMonth(cur.getUTCMonth() + interval)
    }

  } else if (freq === 'YEARLY') {
    let cur = new Date(dtstart)
    let safety = 0
    while (cur.getTime() <= effectiveEnd.getTime() && results.length < maxCount && safety++ < 20) {
      addIfValid(cur)
      cur = new Date(cur)
      cur.setUTCFullYear(cur.getUTCFullYear() + interval)
    }
  }
  // Unknown FREQ — return empty (safer than looping forever)

  return results
}

// ── Main parser ────────────────────────────────────────────────────────────────

export function parseICS(text: string): ICSEvent[] {
  const lines = text
    .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    .replace(/\n[ \t]/g, '')  // unfold long lines
    .split('\n')

  // Expand events 1 year back → 1 year forward so all navigable weeks are covered
  const now = new Date()
  const windowStart = new Date(now)
  windowStart.setFullYear(windowStart.getFullYear() - 1)
  const windowEnd = new Date(now)
  windowEnd.setFullYear(windowEnd.getFullYear() + 1)

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

      const { date: startDate, allDay } = parseICSDate(startKey, raw[startKey])
      const endDate = endKey ? parseICSDate(endKey, raw[endKey]).date : startDate
      const durationMs = endDate.getTime() - startDate.getTime()

      const baseEvent = {
        uid:         raw['UID'] || `${Date.now()}-${Math.random()}`,
        summary:     (raw['SUMMARY']     || '(No title)').replace(/\\n/g, ' ').replace(/\\,/g, ','),
        location:    raw['LOCATION']?.replace(/\\n/g, ', ').replace(/\\,/g, ',')  || undefined,
        description: raw['DESCRIPTION']?.replace(/\\n/g, '\n').replace(/\\,/g, ',') || undefined,
        allDay,
      }

      // ── Recurring event: expand RRULE ─────────────────────────────────────
      const rrule = raw['RRULE']
      if (rrule) {
        // Collect EXDATE entries (may have TZID params → different raw keys)
        const exdateSet = new Set<number>()
        for (const [k, v] of Object.entries(raw)) {
          if (!k.startsWith('EXDATE')) continue
          for (const val of v.split(',')) {
            const trimmed = val.trim()
            if (!trimmed) continue
            try {
              const { date } = parseICSDate(k.replace(/^EXDATE/, 'DTSTART'), trimmed)
              exdateSet.add(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
            } catch { /* skip unparseable EXDATE */ }
          }
        }

        const occurrences = expandRrule(startDate, rrule, exdateSet, windowStart, windowEnd)
        for (const occ of occurrences) {
          const occEnd = new Date(occ.getTime() + durationMs)
          events.push({
            ...baseEvent,
            uid:   baseEvent.uid + '-' + occ.toISOString(),
            start: occ.toISOString(),
            end:   occEnd.toISOString(),
          })
        }
      } else {
        // ── Single (non-recurring) event ─────────────────────────────────────
        events.push({
          ...baseEvent,
          start: startDate.toISOString(),
          end:   endDate.toISOString(),
        })
      }

      continue
    }

    if (!inEvent) continue
    const colon = line.indexOf(':')
    if (colon < 1) continue
    const key = line.slice(0, colon)
    const val = line.slice(colon + 1)

    // Accumulate all EXDATE values (there can be multiple EXDATE lines)
    if (key.startsWith('EXDATE')) {
      raw[key] = raw[key] ? raw[key] + ',' + val : val
    } else if (!raw[key]) {
      raw[key] = val
    }
  }

  return events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
}
