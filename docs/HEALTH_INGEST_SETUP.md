# Apple Health → Life OS

Apple doesn't expose HealthKit data through any cloud API — it lives on your
phone. The only way data gets from your phone to Life OS is your phone
POSTing it there itself. Claude/Anthropic is not involved at runtime in any
way; this doc is the one-time setup, after which your phone talks directly
to `POST /api/health/ingest`.

## 1. Set the shared secret (one-time)

Generate a random secret and add it as a Vercel environment variable:

```
openssl rand -hex 24
```

In the Vercel dashboard → life-os project → Settings → Environment
Variables, add:

```
HEALTH_INGEST_SECRET = <the string you generated>
```

Redeploy (or wait for the next push) so the variable is live. Every request
to the ingest endpoint must send this exact value, either as
`Authorization: Bearer <secret>` or `?token=<secret>` in the URL.

## 2. Recommended: Health Auto Export (paid app, most reliable)

[Health Auto Export](https://apps.apple.com/app/health-auto-export/id1115567069)
can run a fully automatic background sync — no Shortcut scripting, no
manual taps. This is the path worth paying for if you want this to just
work every day.

1. Install Health Auto Export, grant it full Health access.
2. Go to **Automations → REST API**.
3. Set:
   - **URL**: `https://life-os-lukxce.vercel.app/api/health/ingest`
   - **Method**: `POST`
   - **Header**: `Authorization: Bearer <your HEALTH_INGEST_SECRET>`
4. Under **Metrics**, enable at least: Step Count, Active Energy, Resting
   Heart Rate, Heart Rate Variability, Sleep Analysis, Weight Body Mass.
   (Any others are simply ignored by the endpoint — safe to enable more.)
5. Set the aggregation to **Daily** and the schedule to run automatically
   (e.g. every morning). The app sends its own REST-API JSON shape; the
   endpoint understands it natively — no extra config needed.
6. Trigger one manual "Export Now" to confirm — see Testing below.

## 3. Free alternative: manual iOS Shortcut

No paid app, but you have to run it yourself (or automate it with a
Personal Automation in the Shortcuts app, e.g. "Time of Day → 11pm").

Build a new Shortcut named **Sync Health**:

1. **Find Health Samples** — Sample Type: *Steps*, Start Date: *Today at
   Start of Day*, End Date: *Now* → set variable `Steps`.
2. **Calculate Statistics** — Statistic: *Sum*, from `Steps` → `StepsTotal`.
3. Repeat step 1–2 for any other metrics you want (e.g. *Active Energy*,
   sum; *Resting Heart Rate*, average).
4. **Text** action, to build the JSON body:
   ```
   {"metrics":[
     {"metric":"steps","date":"[Current Date, ISO 8601]","value":[StepsTotal]},
     {"metric":"activeEnergy","date":"[Current Date, ISO 8601]","value":[ActiveEnergyTotal]}
   ]}
   ```
   (Use the Shortcuts "Current Date" magic-variable formatted as ISO 8601
   for `[Current Date, ISO 8601]`; drop in your calculated totals for the
   bracketed values.)
5. **Get Contents of URL**:
   - URL: `https://life-os-lukxce.vercel.app/api/health/ingest`
   - Method: `POST`
   - Headers: `Authorization` = `Bearer <your HEALTH_INGEST_SECRET>`,
     `Content-Type` = `application/json`
   - Request Body: *Text* → the JSON from step 4
6. Run it once manually to confirm, then optionally add a Personal
   Automation to run it daily.

## Payload shapes the endpoint accepts

Either of these works — you never need to write both:

**Health Auto Export's native export**:
```json
{ "data": { "metrics": [
  { "name": "step_count", "units": "count", "data": [ { "date": "2026-07-14 00:00:00 +0000", "qty": 8432 } ] }
] } }
```

**Simple custom shape** (for hand-built Shortcuts):
```json
{ "metrics": [ { "metric": "steps", "date": "2026-07-14T00:00:00Z", "value": 8432 } ] }
```

Recognized metric keys: `steps`, `activeEnergy`, `exerciseMin`,
`restingHR`, `hrv`, `sleepHours`, `weight`. Multiple readings for the same
day+metric are combined automatically (steps/energy/sleep sum, heart-rate
metrics average, weight keeps the latest).

## Testing

```bash
curl -X POST https://life-os-lukxce.vercel.app/api/health/ingest \
  -H "Authorization: Bearer <your HEALTH_INGEST_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"metrics":[{"metric":"steps","date":"2026-07-14T00:00:00Z","value":8432}]}'
```

A successful call returns `{"ingested": 1}`. A `401` means the secret
doesn't match what's set in Vercel; a `400` means the JSON body didn't
parse.

## What's next

Data lands in the `HealthMetric` table (one row per day per metric) but
there's no UI reading it yet — that's the planned "Brain" correlation
layer (habit/day-log data crossed with these health metrics). This doc
only covers getting data flowing in.
