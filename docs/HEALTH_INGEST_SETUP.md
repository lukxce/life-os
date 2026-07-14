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

## 2. Recommended if you want *all* metrics: Health Auto Export

[Health Auto Export](https://apps.apple.com/app/health-auto-export/id1115567069)
can run a fully automatic background sync of every metric HealthKit
exposes — around 90-100 depending on your devices. Hand-wiring that many
in Shortcuts isn't realistic (see §3 below for why), so if you want
comprehensive data, this app's automation feature (paid, gated behind an
in-app purchase) is genuinely the right tool, not a workaround.

1. Install Health Auto Export, grant it full Health access.
2. Go to **Automations → REST API**.
3. Set:
   - **URL**: `https://life-os-lukxce.vercel.app/api/health/ingest`
   - **Method**: `POST`
   - **Header**: `Authorization: Bearer <your HEALTH_INGEST_SECRET>`
4. Under **Metrics**, tap **Select All** — the endpoint accepts every
   metric name HealthKit reports, not a fixed whitelist. Anything it
   doesn't specifically know about is stored under its raw Health Auto
   Export name (e.g. `blood_oxygen_saturation`, `flights_climbed`).
5. Set the aggregation to **Daily** and the schedule to run automatically
   (e.g. every morning).
6. Trigger one manual "Export Now" to confirm — see Testing below.

## 3. Free alternative: manual iOS Shortcut (a handful of metrics only)

Native Shortcuts has no "give me everything" action — each metric needs
its own Find Health Samples + Calculate Statistics pair, so this only
makes sense for a small hand-picked set (steps, active energy, resting
heart rate, HRV, weight, sleep), not "all" of them. If you want
comprehensive coverage, use Health Auto Export instead.

Build a new Shortcut named **Sync Health**, repeating this pattern once
per metric you care about:

1. **Find Health Samples** — Sample Type: pick the metric, Start Date:
   *Today at Start of Day* (skip for Weight — just take the latest reading).
2. **Calculate Statistics** — Statistic: *Sum* for cumulative metrics
   (steps, active energy), *Average* for rate/vitals (resting heart rate,
   HRV), *Most Recent* for weight.
3. **Text** action, to build the JSON body — repeat one object per metric:
   ```
   {"metrics":[
     {"metric":"steps","date":"[Current Date, ISO 8601]","value":[StepsStat]},
     {"metric":"activeEnergy","date":"[Current Date, ISO 8601]","value":[EnergyStat]}
   ]}
   ```
   (Insert the actual "Current Date" and stat-result magic variables via
   the ⓘ button — don't type the bracketed placeholders literally.)
4. **Get Contents of URL**:
   - URL: `https://life-os-lukxce.vercel.app/api/health/ingest`
   - Method: `POST`
   - Headers: `Authorization` = `Bearer <your HEALTH_INGEST_SECRET>`,
     `Content-Type` = `application/json`
   - Request Body: *Text* → the JSON from step 3
5. Run it once manually to confirm, then optionally add a Personal
   Automation (Automation tab → Time of Day) to run it daily.

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

The endpoint accepts **any** metric name — nothing is dropped. A handful
of well-known Health Auto Export names get renamed for readability
(`step_count` → `steps`, `active_energy` → `activeEnergy`,
`resting_heart_rate` → `restingHR`, `heart_rate_variability` → `hrv`,
`weight_body_mass`/`body_mass` → `weight`, `apple_exercise_time` →
`exerciseMin`); everything else is stored under its raw incoming name.
Multi-stage metrics like sleep (which report separate asleep/core/deep/
rem/awake/inBed durations instead of one number) get split into
`sleep_analysis.asleep`, `sleep_analysis.core`, etc. automatically.

Multiple readings landing on the same day+metric are combined
automatically: metric names that look cumulative (counts, distances,
energy, durations) get summed; everything else (rates, percentages,
point-in-time vitals like weight) gets averaged.

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
