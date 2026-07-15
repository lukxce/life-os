export interface ICSEvent {
  uid: string
  summary: string
  start: string
  end: string
  location?: string
  description?: string
  url?: string
  allDay: boolean
}

const MEET_URL_RE = /https?:\/\/(?:meet\.google\.com|zoom\.us|teams\.microsoft\.com|us\d+\.zoom\.us|meet\.jit\.si|whereby\.com)[^\s<>"]*/i

function extractMeetingUrl(description?: string, url?: string): string | undefined {
  if (url?.trim()) return url.trim()
  if (!description) return undefined
  const m = description.match(MEET_URL_RE)
  return m?.[0]
}

// ── Windows timezone name → IANA mapping ──────────────────────────────────────
// Outlook and Exchange emit Windows timezone names that Intl doesn't recognise.
// Source: CLDR windowsZones.xml (authoritative Windows→IANA mapping).
const WIN_TO_IANA: Record<string, string> = {
  // ── Europe ─────────────────────────────────────────────────────────────────
  'W. Europe Standard Time':            'Europe/Berlin',
  'Central Europe Standard Time':       'Europe/Budapest',
  'Central European Standard Time':     'Europe/Warsaw',
  'Romance Standard Time':              'Europe/Paris',
  'GMT Standard Time':                  'Europe/London',
  'Greenwich Standard Time':            'Atlantic/Reykjavik',
  'GMT+12 Standard Time':               'Etc/GMT-12',
  'GTB Standard Time':                  'Europe/Bucharest',
  'E. Europe Standard Time':            'Asia/Nicosia',
  'Eastern Europe Standard Time':       'Europe/Nicosia',
  'FLE Standard Time':                  'Europe/Helsinki',
  'Turkey Standard Time':               'Europe/Istanbul',
  'Russian Standard Time':              'Europe/Moscow',
  'Russia Standard Time':               'Europe/Moscow',
  'Belarus Standard Time':              'Europe/Minsk',
  'Serbia Standard Time':               'Europe/Belgrade',
  'Kaliningrad Standard Time':          'Europe/Kaliningrad',
  'Astrakhan Standard Time':            'Europe/Astrakhan',
  'Volgograd Standard Time':            'Europe/Volgograd',
  'Saratov Standard Time':              'Europe/Saratov',
  'Russia Time Zone 3':                 'Europe/Samara',
  'Russia Time Zone 9':                 'Asia/Srednekolymsk',
  'Russia Time Zone 10':                'Asia/Magadan',
  'Russia Time Zone 11':                'Asia/Kamchatka',
  // ── Middle East / Africa ───────────────────────────────────────────────────
  'Arab Standard Time':                 'Asia/Riyadh',
  'Arabian Standard Time':              'Asia/Dubai',
  'Arabic Standard Time':               'Asia/Baghdad',
  'Middle East Standard Time':          'Asia/Beirut',
  'Jordan Standard Time':               'Asia/Amman',
  'Syria Standard Time':                'Asia/Damascus',
  'West Bank Standard Time':            'Asia/Hebron',
  'Israel Standard Time':               'Asia/Jerusalem',
  'Iran Standard Time':                 'Asia/Tehran',
  'Afghanistan Standard Time':          'Asia/Kabul',
  'Egypt Standard Time':                'Africa/Cairo',
  'South Africa Standard Time':         'Africa/Johannesburg',
  'E. Africa Standard Time':            'Africa/Nairobi',
  'Sudan Standard Time':                'Africa/Khartoum',
  'Libya Standard Time':                'Africa/Tripoli',
  'Namibia Standard Time':              'Africa/Windhoek',
  'Morocco Standard Time':              'Africa/Casablanca',
  'W. Central Africa Standard Time':    'Africa/Lagos',
  'Sao Tome Standard Time':             'Africa/Sao_Tome',
  // ── Asia ───────────────────────────────────────────────────────────────────
  'India Standard Time':                'Asia/Calcutta',
  'Pakistan Standard Time':             'Asia/Karachi',
  'Bangladesh Standard Time':           'Asia/Dhaka',
  'Sri Lanka Standard Time':            'Asia/Colombo',
  'Nepal Standard Time':                'Asia/Katmandu',
  'Myanmar Standard Time':              'Asia/Rangoon',
  'SE Asia Standard Time':              'Asia/Bangkok',
  'Singapore Standard Time':            'Asia/Singapore',
  'China Standard Time':                'Asia/Shanghai',
  'Taipei Standard Time':               'Asia/Taipei',
  'Tokyo Standard Time':                'Asia/Tokyo',
  'Korea Standard Time':                'Asia/Seoul',
  'Ekaterinburg Standard Time':         'Asia/Yekaterinburg',
  'West Asia Standard Time':            'Asia/Tashkent',
  'Qyzylorda Standard Time':            'Asia/Qyzylorda',
  'Central Asia Standard Time':         'Asia/Almaty',
  'N. Central Asia Standard Time':      'Asia/Novosibirsk',
  'Altai Standard Time':                'Asia/Barnaul',
  'Tomsk Standard Time':                'Asia/Tomsk',
  'North Asia Standard Time':           'Asia/Krasnoyarsk',
  'North Asia East Standard Time':      'Asia/Irkutsk',
  'Transbaikal Standard Time':          'Asia/Chita',
  'Yakutsk Standard Time':              'Asia/Yakutsk',
  'Vladivostok Standard Time':          'Asia/Vladivostok',
  'Magadan Standard Time':              'Asia/Magadan',
  'Kamchatka Standard Time':            'Asia/Kamchatka',
  'Georgian Standard Time':             'Asia/Tbilisi',
  'Caucasus Standard Time':             'Asia/Yerevan',
  'Azerbaijan Standard Time':           'Asia/Baku',
  // ── Pacific / Australia ────────────────────────────────────────────────────
  'AUS Eastern Standard Time':          'Australia/Sydney',
  'E. Australia Standard Time':         'Australia/Brisbane',
  'AUS Central Standard Time':          'Australia/Darwin',
  'Cen. Australia Standard Time':       'Australia/Adelaide',
  'W. Australia Standard Time':         'Australia/Perth',
  'Tasmania Standard Time':             'Australia/Hobart',
  'Lord Howe Standard Time':            'Australia/Lord_Howe',
  'New Zealand Standard Time':          'Pacific/Auckland',
  'Chatham Islands Standard Time':      'Pacific/Chatham',
  'Fiji Standard Time':                 'Pacific/Fiji',
  'Central Pacific Standard Time':      'Pacific/Guadalcanal',
  'West Pacific Standard Time':         'Pacific/Port_Moresby',
  'Bougainville Standard Time':         'Pacific/Bougainville',
  'Tonga Standard Time':                'Pacific/Tongatapu',
  'Samoa Standard Time':                'Pacific/Apia',
  'Line Islands Standard Time':         'Pacific/Kiritimati',
  'Dateline Standard Time':             'Etc/GMT+12',
  'UTC-11':                             'Pacific/Pago_Pago',
  'Marquesas Standard Time':            'Pacific/Marquesas',
  'Easter Island Standard Time':        'Pacific/Easter',
  // ── Americas — North ───────────────────────────────────────────────────────
  'Eastern Standard Time':              'America/New_York',
  'Eastern Standard Time (Mexico)':     'America/Cancun',
  'US Eastern Standard Time':           'America/Indiana/Indianapolis',
  'Haiti Standard Time':                'America/Port-au-Prince',
  'Cuba Standard Time':                 'America/Havana',
  'Turks And Caicos Standard Time':     'America/Grand_Turk',
  'Central Standard Time':              'America/Chicago',
  'Central Standard Time (Mexico)':     'America/Mexico_City',
  'Canada Central Standard Time':       'America/Regina',
  'Central America Standard Time':      'America/Guatemala',
  'Mountain Standard Time':             'America/Denver',
  'Mountain Standard Time (Mexico)':    'America/Chihuahua',
  'Mexico Standard Time':               'America/Mexico_City',
  'Mexico Standard Time 2':             'America/Chihuahua',
  'US Mountain Standard Time':          'America/Phoenix',
  'Pacific Standard Time':              'America/Los_Angeles',
  'Pacific Standard Time (Mexico)':     'America/Santa_Isabel',
  'Alaskan Standard Time':              'America/Anchorage',
  'Aleutian Standard Time':             'America/Adak',
  'Hawaiian Standard Time':             'Pacific/Honolulu',
  'Atlantic Standard Time':             'America/Halifax',
  'Newfoundland Standard Time':         'America/St_Johns',
  'Saint Pierre Standard Time':         'America/Miquelon',
  'Greenland Standard Time':            'America/Godthab',
  // ── Americas — South ───────────────────────────────────────────────────────
  'E. South America Standard Time':     'America/Sao_Paulo',   // Brazil (São Paulo/Rio, UTC-3)
  'SA Eastern Standard Time':           'America/Cayenne',
  'SA Western Standard Time':           'America/La_Paz',
  'SA Pacific Standard Time':           'America/Bogota',
  'Amazon Standard Time':               'America/Manaus',
  'Central Brazilian Standard Time':    'America/Cuiaba',
  'Bahia Standard Time':                'America/Bahia',
  'Tocantins Standard Time':            'America/Araguaina',
  'Argentina Standard Time':            'America/Argentina/Buenos_Aires',
  'Venezuela Standard Time':            'America/Caracas',
  'Paraguay Standard Time':             'America/Asuncion',
  'Montevideo Standard Time':           'America/Montevideo',
  'Chile Standard Time':                'America/Santiago',
  'Magallanes Standard Time':           'America/Punta_Arenas',
  'Colombia Standard Time':             'America/Bogota',
  'Peru Standard Time':                 'America/Lima',
  // ── Atlantic / Other ───────────────────────────────────────────────────────
  'Mid-Atlantic Standard Time':         'Atlantic/South_Georgia',
  'Azores Standard Time':               'Atlantic/Azores',
  'Cape Verde Standard Time':           'Atlantic/Cape_Verde',
  'UTC-02':                             'Etc/GMT+2',
  'UTC+12':                             'Etc/GMT-12',
  'UTC':                                'UTC',
}

/** Resolve a TZID (IANA or Windows) to an IANA name Intl understands. */
function resolveIana(tzid: string): string {
  return WIN_TO_IANA[tzid] ?? tzid
}

// ── VTIMEZONE fallback ─────────────────────────────────────────────────────────
// ICS files always embed a VTIMEZONE block containing the raw UTC offset.
// We parse these as a last-resort fallback so that any unknown/custom TZID
// still converts correctly instead of silently falling through to UTC.
//
// We use the STANDARD component's TZOFFSETTO (the non-DST offset). This is
// not DST-aware but is far better than UTC for an unrecognised timezone.

function parseVtimezoneOffsets(lines: string[]): Record<string, number> {
  const offsets: Record<string, number> = {}
  let inVtz = false
  let inStd = false
  let tzid = ''

  for (const line of lines) {
    if (line === 'BEGIN:VTIMEZONE') { inVtz = true; tzid = ''; continue }
    if (line === 'END:VTIMEZONE')   { inVtz = false;            continue }
    if (!inVtz) continue
    if (line === 'BEGIN:STANDARD')  { inStd = true;             continue }
    if (line === 'END:STANDARD')    { inStd = false;            continue }

    const c = line.indexOf(':')
    if (c < 1) continue
    const k = line.slice(0, c).trim()
    const v = line.slice(c + 1).trim()

    if (k === 'TZID') { tzid = v; continue }

    // Capture the first STANDARD TZOFFSETTO for this TZID
    if (inStd && k === 'TZOFFSETTO' && tzid && !(tzid in offsets)) {
      const sign = v[0] === '-' ? -1 : 1
      const h = parseInt(v.slice(1, 3)) || 0
      const m = parseInt(v.slice(3, 5)) || 0
      offsets[tzid] = sign * (h * 60 + m)
    }
  }

  return offsets
}

/** Convert a wall-clock time in a named timezone to a UTC Date.
 *  Resolution order:
 *  1. WIN_TO_IANA map   → Intl
 *  2. IANA name direct  → Intl
 *  3. vtimezoneOffsets  → raw offset arithmetic
 *  4. UTC fallback      (last resort, logged to console) */
function tzLocalToUTC(
  tzid: string,
  y: number, mo: number, d: number, h: number, mi: number, s: number,
  vtimezoneOffsets?: Record<string, number>,
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
    // Intl didn't recognise the name — try the VTIMEZONE-extracted offset
    if (vtimezoneOffsets && tzid in vtimezoneOffsets) {
      const offsetMins = vtimezoneOffsets[tzid]
      return new Date(Date.UTC(y, mo, d, h, mi, s) - offsetMins * 60_000)
    }
    // Last resort: treat as UTC (and warn so this is visible in logs)
    console.warn(`[ICS] Unrecognised TZID "${tzid}" — treating as UTC. Add it to WIN_TO_IANA or check the VTIMEZONE block.`)
    return new Date(Date.UTC(y, mo, d, h, mi, s))
  }
}

function parseICSDate(
  keyFull: string,
  value: string,
  vtimezoneOffsets?: Record<string, number>,
): { date: Date; allDay: boolean } {
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
  // DTSTART;TZID="W. Europe Standard Time":20240610T100000  ← Outlook sometimes quotes
  const tzidMatch = keyFull.match(/TZID=["']?([^"';:]+)["']?/)
  if (tzidMatch) {
    return {
      date: tzLocalToUTC(tzidMatch[1].trim(), y, mo, d, h, mi, s, vtimezoneOffsets),
      allDay: false,
    }
  }

  // Floating time — treat as UTC
  return { date: new Date(Date.UTC(y, mo, d, h, mi, s)), allDay: false }
}

// ── RRULE expansion ───────────────────────────────────────────────────────────

/** Parse an RRULE UNTIL value (YYYYMMDD or YYYYMMDDTHHmmssZ). */
function parseRruleDate(s: string): Date {
  const clean = s.replace(/Z$/, '')
  const y   = parseInt(clean.slice(0, 4))
  const mo  = parseInt(clean.slice(4, 6)) - 1
  const d   = parseInt(clean.slice(6, 8))
  if (clean.length <= 8) return new Date(Date.UTC(y, mo, d, 23, 59, 59))
  const h   = parseInt(clean.slice(9, 11))  || 0
  const mi  = parseInt(clean.slice(11, 13)) || 0
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

  // BYDAY: optional nth-weekday prefix (e.g. "+1MO", "-1FR", "2TU") stripped to day name
  const bydayStrs  = params['BYDAY']
    ? params['BYDAY'].split(',').map(s => s.replace(/^[+-]?\d*/, '').trim().toUpperCase())
    : null
  const bymonthday = params['BYMONTHDAY']
    ? params['BYMONTHDAY'].split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
    : null

  const DAY_MAP: Record<string, number> = { SU:0, MO:1, TU:2, WE:3, TH:4, FR:5, SA:6 }
  const bydayNums = bydayStrs
    ?.map(d => DAY_MAP[d])
    .filter((n): n is number => n !== undefined) ?? null

  const effectiveEnd = until
    ? new Date(Math.min(until.getTime(), windowEnd.getTime()))
    : windowEnd

  const results: Date[] = []

  function addIfValid(d: Date) {
    if (d.getTime() < dtstart.getTime())     return
    if (d.getTime() < windowStart.getTime()) return
    if (d.getTime() > effectiveEnd.getTime()) return
    if (results.length >= maxCount)           return
    const dayKey = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
    if (exdateSet.has(dayKey)) return
    results.push(new Date(d))
  }

  if (freq === 'DAILY') {
    let cur = new Date(dtstart); let safety = 0
    while (cur.getTime() <= effectiveEnd.getTime() && results.length < maxCount && safety++ < 800) {
      addIfValid(cur)
      cur = new Date(cur); cur.setUTCDate(cur.getUTCDate() + interval)
    }

  } else if (freq === 'WEEKLY') {
    // Find the Monday (UTC) of dtstart's week, then step by interval weeks
    const startDow = dtstart.getUTCDay()                          // 0=Sun
    const daysToMon = startDow === 0 ? -6 : 1 - startDow
    const weekMonday = new Date(dtstart)
    weekMonday.setUTCDate(dtstart.getUTCDate() + daysToMon)

    let weekStart = new Date(weekMonday); let safety = 0
    while (weekStart.getTime() <= effectiveEnd.getTime() && results.length < maxCount && safety++ < 500) {
      const daysToCheck = bydayNums ?? [startDow === 0 ? 0 : startDow]
      for (const dayNum of [...daysToCheck].sort((a, b) => a - b)) {
        const daysFromMon = dayNum === 0 ? 6 : dayNum - 1
        const candidate = new Date(weekStart)
        candidate.setUTCDate(weekStart.getUTCDate() + daysFromMon)
        addIfValid(candidate)
      }
      weekStart = new Date(weekStart); weekStart.setUTCDate(weekStart.getUTCDate() + 7 * interval)
    }

  } else if (freq === 'MONTHLY') {
    let cur = new Date(dtstart); let safety = 0
    while (cur.getTime() <= effectiveEnd.getTime() && results.length < maxCount && safety++ < 100) {
      const ok = !bymonthday || bymonthday.includes(cur.getUTCDate())
      if (ok) addIfValid(cur)
      cur = new Date(cur); cur.setUTCMonth(cur.getUTCMonth() + interval)
    }

  } else if (freq === 'YEARLY') {
    let cur = new Date(dtstart); let safety = 0
    while (cur.getTime() <= effectiveEnd.getTime() && results.length < maxCount && safety++ < 20) {
      addIfValid(cur)
      cur = new Date(cur); cur.setUTCFullYear(cur.getUTCFullYear() + interval)
    }
  }
  // Unknown FREQ — return empty (safer than looping forever)

  return results
}

// ── Main parser ────────────────────────────────────────────────────────────────

export function parseICS(text: string): ICSEvent[] {
  const lines = text
    .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    .replace(/\n[ \t]/g, '')   // unfold long lines
    .split('\n')

  // First pass: extract VTIMEZONE offsets as fallback for unknown TZIDs
  const vtimezoneOffsets = parseVtimezoneOffsets(lines)

  // Expand events ±1 year from today so all navigable weeks are covered
  const now = new Date()
  const windowStart = new Date(now); windowStart.setFullYear(windowStart.getFullYear() - 1)
  const windowEnd   = new Date(now); windowEnd.setFullYear(windowEnd.getFullYear() + 1)

  // ── Collect raw VEVENT blocks first (don't build events yet) ──────────────
  // We need every block visible before expanding any RRULE, because a
  // recurring master and its RECURRENCE-ID overrides can appear in either
  // order in the feed, and the master must know about overrides to skip
  // that occurrence rather than emitting it twice.
  const blocks: Record<string, string>[] = []
  let inEvent = false
  let raw: Record<string, string> = {}

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { inEvent = true; raw = {}; continue }
    if (line === 'END:VEVENT') { inEvent = false; blocks.push(raw); continue }
    if (!inEvent) continue
    const colon = line.indexOf(':')
    if (colon < 1) continue
    const key = line.slice(0, colon)
    const val = line.slice(colon + 1)

    // Accumulate all EXDATE values (there can be multiple EXDATE lines per event)
    if (key.startsWith('EXDATE')) {
      raw[key] = raw[key] ? raw[key] + ',' + val : val
    } else if (!raw[key]) {
      raw[key] = val
    }
  }

  // ── Google/Outlook calendars emit a modified recurring instance as a
  // separate VEVENT block sharing the master's UID (with RECURRENCE-ID set
  // to the original occurrence date) *in addition to* the master's RRULE
  // still covering that date. Without this, the master's expansion and the
  // override both produce an event for the same day — the "meeting shown
  // twice" bug. Treat each override's date as an implicit EXDATE on its master.
  const overridesByUid = new Map<string, Set<number>>()
  for (const block of blocks) {
    const recurKey = Object.keys(block).find(k => k.startsWith('RECURRENCE-ID'))
    const uid = block['UID']
    if (!recurKey || !uid) continue
    try {
      const { date } = parseICSDate(recurKey, block[recurKey], vtimezoneOffsets)
      const dayKey = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
      if (!overridesByUid.has(uid)) overridesByUid.set(uid, new Set())
      overridesByUid.get(uid)!.add(dayKey)
    } catch { /* skip unparseable RECURRENCE-ID */ }
  }

  const events: ICSEvent[] = []

  for (const raw of blocks) {
    const startKey = Object.keys(raw).find(k => k.startsWith('DTSTART'))
    const endKey   = Object.keys(raw).find(k => k.startsWith('DTEND'))
    if (!startKey) continue

    const { date: startDate, allDay } = parseICSDate(startKey, raw[startKey], vtimezoneOffsets)
    const endDate = endKey
      ? parseICSDate(endKey, raw[endKey], vtimezoneOffsets).date
      : startDate
    const durationMs = endDate.getTime() - startDate.getTime()

    const descriptionRaw = raw['DESCRIPTION']?.replace(/\\n/g, '\n').replace(/\\,/g, ',')
    const baseEvent = {
      uid:         raw['UID'] || `${Date.now()}-${Math.random()}`,
      summary:     (raw['SUMMARY']     || '(No title)').replace(/\\n/g, ' ').replace(/\\,/g, ','),
      location:    raw['LOCATION']?.replace(/\\n/g, ', ').replace(/\\,/g, ',')  || undefined,
      description: descriptionRaw || undefined,
      url:         extractMeetingUrl(descriptionRaw, raw['URL']),
      allDay,
    }

    // ── Recurring event: expand RRULE ──────────────────────────────────────
    const rrule = raw['RRULE']
    if (rrule) {
      // Collect EXDATE entries (may carry TZID params → different raw keys)
      const exdateSet = new Set<number>()
      for (const [k, v] of Object.entries(raw)) {
        if (!k.startsWith('EXDATE')) continue
        for (const val of v.split(',')) {
          const trimmed = val.trim()
          if (!trimmed) continue
          try {
            const { date } = parseICSDate(
              k.replace(/^EXDATE/, 'DTSTART'),
              trimmed,
              vtimezoneOffsets,
            )
            exdateSet.add(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
          } catch { /* skip unparseable EXDATE */ }
        }
      }
      // Dates covered by a separate RECURRENCE-ID override block also get
      // skipped here — the override itself is emitted below as its own event.
      for (const dayKey of Array.from(overridesByUid.get(baseEvent.uid) ?? [])) exdateSet.add(dayKey)

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
      // ── Single (non-recurring) event, or a RECURRENCE-ID override ──────────
      events.push({
        ...baseEvent,
        start: startDate.toISOString(),
        end:   endDate.toISOString(),
      })
    }
  }

  // ── Final safety net: de-dupe identical (title, start, end) pairs. Covers
  // the RECURRENCE-ID case above, plus the same event appearing verbatim
  // across two subscribed calendars (e.g. a meeting on both a personal and
  // work calendar) — a real duplicate is never useful to show twice.
  const seen = new Set<string>()
  const deduped: ICSEvent[] = []
  for (const ev of events) {
    const key = `${ev.summary}|${ev.start}|${ev.end}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(ev)
  }

  return deduped.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
}
