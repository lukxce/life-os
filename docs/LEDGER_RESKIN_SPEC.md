# Ledger v4 — Full Content Reskin Spec

Executable spec for reskinning **all module page content** to the Ledger v4 design
language. The navigation chrome (AppHeader, sidebar, bottom bar, Go sheet, FAB) is
already done — do not touch `src/components/ledger/*` or `src/components/layout/AppShell.tsx`
except where this spec says so. This spec covers everything *inside* the pages.

Production Home (`src/app/page.tsx`) is already fully reskinned — use it as the
living reference for how every pattern should look. The design-lab pages
(`src/app/design/*`) are frozen prototypes: ignore them entirely, do not edit them.

---

## 0. Non-negotiable rules

1. **One saturated color: green.** `ldg-green` is the only accent. No coral, no amber,
   no rose, no plum, no blue, no indigo, no cyan, no purple — anywhere.
2. **Red (`ldg-urgent`) means money owed or negative** — overdue bills, negative deltas,
   expense amounts, priority markers. Never for "pending" or decoration.
3. **No dark panels inside pages.** No `bg-[#1f1815]`-style hero blocks, no gradients
   (`bg-gradient-to-*`), no glow shadows. Cards are white (`bg-ldg-card`) on gray paper
   (`bg-ldg-paper`), in both light and dark mode (tokens handle dark automatically).
4. **Numbers are mono + tabular.** Every numeric value (money, counts, percentages,
   times, dates in data rows): `font-mono tabular-nums`.
5. **Presentation only.** Do not change any data fetching, handlers, state logic,
   API routes, or Prisma anything. If a file's logic and JSX are entangled, restructure
   JSX only.
6. **Verify after every module**: `./node_modules/.bin/tsc --noEmit -p tsconfig.json`
   then `npx next build`. Both must pass before moving to the next module.
   Commit once per module (message: `Reskin <module> to Ledger v4`), push after each.
   There is NO local DB — do not try to run the dev server against real data.

---

## 1. Global token retune (do this first — de-warms ~70% of the app in one step)

### 1a. `src/app/globals.css` — replace the legacy warm values with Ledger values

The legacy tokens stay *named* the same (so no page edits needed) but get cool values:

```css
:root {
  --canvas: 244 244 246;       /* was warm ivory — now = ldg-paper */
  --canvas-alt: 235 235 238;   /* input/well backgrounds, slightly darker than paper */
  --surface: 255 255 255;      /* was warm white — now = ldg-card */
  --ink: 27 27 30;             /* was warm near-black — now = ldg-ink */

  /* Legacy warm accents — ALL remapped to green so old pages cool down instantly */
  --coral:  46 125 79;
  --amber:  46 125 79;
  --rose:   46 125 79;
  --plum:   46 125 79;
  --sage:   38 189 116;   /* mascot only — unchanged */

  /* ldg-* block stays exactly as it is */
}
.dark {
  --canvas: 20 20 22;
  --canvas-alt: 41 41 46;
  --surface: 31 31 35;
  --ink: 234 234 236;

  --coral:  67 163 111;
  --amber:  67 163 111;
  --rose:   67 163 111;
  --plum:   67 163 111;

  /* ldg-* dark block stays exactly as it is */
}
```

Keep everything else in globals.css as is (mascot keyframes, pageIn, overflow-x: clip).

### 1b. Literal warm-color sweep (exact string replacements across `src/`)

These literal values appear inside arbitrary-value Tailwind classes and inline styles.
Replace **exact strings**, all occurrences, in all `.tsx`/`.ts` files under `src/`
EXCEPT `src/app/design/**` (leave the frozen prototypes alone):

| Find (exact)          | Replace with            |
|-----------------------|-------------------------|
| `rgb(232,120,90)`     | `rgb(var(--l-green))`   |
| `rgb(212,100,72)`     | `rgb(var(--l-green))`   |
| `rgb(220,161,84)`     | `rgb(var(--l-green))`   |
| `rgb(200,141,64)`     | `rgb(var(--l-green))`   |
| `rgb(217,138,148)`    | `rgb(var(--l-green))`   |
| `rgb(167,120,160)`    | `rgb(var(--l-green))`   |
| `232 120 90`          | `var(--l-green)` — ONLY when inside a `rgb(... / alpha)` pattern; check each hit |
| `#e8785a` `#e8785a`   | `rgb(var(--l-green))` (if any hex variants exist — grep first) |

After the sweep, `grep -rn "232,120\|220,161\|217,138\|167,120" src/ --include="*.tsx"`
must return only hits inside `src/app/design/`.

### 1c. Kill remaining gradients & glows in page content

`grep -rn "bg-gradient-to" src/app src/components --include="*.tsx"` (excluding
`src/app/design/`) — every hit inside module pages gets replaced per the recipes in §2.
Module-icon tile gradients (e.g. old `MODULES`/`APPS` arrays, shell `accent*` strings)
that are no longer rendered can simply be deleted if unused, or left if referenced by
types — but nothing rendered may keep a gradient.

---

## 2. Component recipes — the only allowed patterns

Import from `@/components/ledger/primitives`: `Card`, `Label`, `SolidBtn`, `GhostBtn`.
Do not re-invent these locally. Exact class recipes for everything else:

| Element | Recipe |
|---|---|
| **Page section card** | `<Card className="p-5">` — white card, hairline border. Never nested cards. |
| **Section label** | `<Label>Section name</Label>` (11px, uppercase, tracked, 55% ink) |
| **Big figure** | `font-mono text-[26px] tabular-nums tracking-tight leading-none` (+ `text-ldg-ink/55` for the denominator part) |
| **Hero figure** (net worth etc.) | `font-mono text-[32px] tabular-nums tracking-tight leading-none` |
| **List row** | `flex items-center gap-3 py-2.5 border-t border-ldg-ink/[0.07]` — hairline rules INSIDE cards, first row gets the top border too (matches Home) |
| **Row main text** | `text-[14px] text-ldg-ink` |
| **Row secondary/mono detail** | `font-mono text-[12px] text-ldg-ink/55` |
| **Primary button** | `SolidBtn` (green, white text) |
| **Secondary button** | `GhostBtn` (bordered, faint) |
| **Destructive/confirm-delete button** | like SolidBtn but `bg-ldg-urgent` |
| **Text input / select / textarea** | `rounded-lg px-3 py-2 text-[14px] bg-ldg-paper border border-ldg-ink/10 focus:outline-none text-ldg-ink` (in dark this is automatically the dark paper) |
| **Segmented filter pills** (Today/Week/Month, All/Morning/Noon/Night) | container `flex gap-2 overflow-x-auto`; inactive: `text-[13px] font-medium px-3 py-1.5 rounded-lg border border-ldg-ink/10 text-ldg-ink/55`; active: `text-[13px] font-semibold px-3 py-1.5 rounded-lg bg-ldg-green/10 text-ldg-green border border-ldg-green/30` |
| **Checkbox circle** | `w-[18px] h-[18px] rounded-full border-2` — unchecked `border-ldg-ink/25`, checked `border-ldg-green bg-ldg-green` with white `Check size={11} strokeWidth={3.5}` |
| **Progress bar** | track `h-[6px] rounded-full bg-ldg-ink/[0.07] overflow-hidden`, fill `bg-ldg-green` (use `bg-ldg-urgent` only for over-budget) |
| **Positive money / delta** | `text-ldg-green font-mono tabular-nums` |
| **Negative money / expense amount** | `text-ldg-urgent font-mono tabular-nums` |
| **Neutral badge/tag** | `text-[10px] font-bold uppercase px-2 py-0.5 rounded tracking-wide text-ldg-ink/55 bg-ldg-ink/[0.06]` |
| **Urgent badge** | same but `text-ldg-urgent bg-ldg-urgent/[0.08]` |
| **Green badge** (done/paid) | same but `text-ldg-green bg-ldg-green/10` |
| **Empty state** | `font-mono text-[12px] text-ldg-ink/55` line, e.g. `nothing logged yet` |
| **Icon color** | `text-ldg-ink/55` default; `text-ldg-green` when the row is the module's action; NEVER blue/cyan/indigo/orange (fitness "non-negotiables" icons currently blue/cyan/indigo → all become `text-ldg-ink/55`) |
| **Ring/donut charts (recharts)** | see §3 palette |
| **Emoji** | Emoji stored as user data (habit.icon, goal.emoji, contact.emoji) may render in rows. Hardcoded decorative emoji in headers/labels/buttons must be removed or replaced with a lucide icon at `text-ldg-ink/55`. |

**Radii:** cards `rounded-2xl`, buttons/inputs `rounded-lg`, pills `rounded-lg`,
sheets `rounded-t-3xl`. Nothing else.

**Typography:** UI text is the system sans already configured; sizes 14px body,
12px mono detail, 11px labels. Page titles inside content: `text-[1.6rem] font-bold tracking-tight`
(only where a page needs its own title — most get a `<Label>` instead).

---

## 3. Chart palette (recharts donuts/bars/lines)

Replace every chart color array (grep for `Cell`, `fill=`, `COLORS`, `stroke=` in
finance + analytics pages) with:

```ts
export const CHART_COLORS = [
  '#2e7d4f', // green (primary)
  '#8fb8a0', // sage tint
  '#54555c', // graphite
  '#a6a7ae', // gray
  '#3d6650', // deep green
  '#c9cad0', // light gray
  '#6f9080', // muted green-gray
  '#84858c', // mid gray
]
```

(Consider putting it in `src/components/ledger/primitives.tsx` as an export and
importing everywhere.) Line/area charts: primary series `#2e7d4f`, comparison series
`#a6a7ae`. Negative bars `rgb(var(--l-urgent))`. Grid lines `rgba(27,27,30,0.07)`.
Axis/tick text 11px `rgba(27,27,30,0.55)`. In `ScoreRing`/`TrendBars`/`Delta`/`grade()`
(`src/components/ui/synth.tsx`): ring/positive = `#2e7d4f` on track `rgba(27,27,30,0.08)`;
`Delta` positive green / negative `rgb(var(--l-urgent))`; `grade()` buckets: ≥80 green,
40–79 `rgba(27,27,30,0.55)`, <40 urgent. Dark mode: since these take hex props, prefer
`rgb(var(--l-green))` / CSS-var strings over hex wherever the prop lands in CSS
(inline styles accept them); recharts SVG `fill` also accepts CSS variables.

---

## 4. The three custom dark heroes (hand-rework — tokens can't fix these)

### 4a. `src/app/finance/page.tsx` — Finance dashboard

Delete the dark hero block entirely (`bg-[#...]` panel with NET WORTH). Replace with:

```
<Card className="p-5">
  <Label>Net worth</Label>
  <p class: hero figure (32px mono)>€61.608,60</p>
  <p class: mono 12 faint>7.231.386,42 RSD</p>
  <div class="mt-4 grid grid-cols-3 border-t border-ldg-ink/[0.07] pt-3">
    Personal  → label 11px faint + mono 15px semibold value
    Company   → same
    Out · month → same but value text-ldg-urgent
  </div>
  <p class: mono 11 faint mt-3>EUR/RSD live 117.38 · manual 117.36</p>
</Card>
```

- Period filter row (Today / This Week / This Month / Last Month / YTD / All Time):
  segmented pills per §2 (active = green tint, NOT solid orange).
- **Accounts strip**: each account = white `Card` `p-4` (NOT coral): name as `<Label>`,
  value `font-mono text-[15px] font-semibold tabular-nums`, EUR sub-line mono 12 faint.
  "+7 more hidden" line: mono 12 faint. "See all →" link: `font-mono text-[12px] underline underline-offset-2 text-ldg-ink/55`.
- **Recent activity**: list rows per §2. Direction icon circle: `bg-ldg-ink/[0.06]` with
  arrow `text-ldg-urgent` (out) / `text-ldg-green` (in). Amounts: negative
  `text-ldg-urgent`, positive `text-ldg-green`, both mono.
- **Spending donuts**: CHART_COLORS from §3; legend rows = list rows with 8px dot,
  category 14px, amount mono 14 right-aligned.

### 4b. `src/app/life/page.tsx` — Habits Today

Delete the dark hero panel. Replace with ONE white `Card p-5` containing:

- Row 1: `<Label>{date}</Label>` + greeting `text-[17px] font-semibold` (pencil edit
  button keeps working, icon `text-ldg-ink/55`).
- Row 2 (grid-cols-3, mono figures per §2 "big figure"): **Today %** (e.g. `9%`),
  **Week** (`11%` + delta: green if ≥0 / urgent if <0, `10/88 this week` mono 12 faint),
  **Done** (`1/11`, `so far today` faint). Best-streak line beneath as mono 12 faint
  with `Flame size={13} className="text-ldg-green"` (drop the emoji).
- If the ring component is kept instead of the plain % figure: stroke `#2e7d4f`
  (or `rgb(var(--l-green))`), track `rgba(27,27,30,0.08)`, center number mono.
- **Last-14-days strip**: same pattern as Home's week strip — per day a 4px
  `rounded-full` track `bg-ldg-ink/[0.07]` with fill `bg-ldg-green` when 100% /
  `bg-ldg-ink` otherwise, width = pct. No amber/gold pills.
- **Date selector** (MO 6 … TDY 12): pills — inactive `text-ldg-ink/55`, selected
  `bg-ldg-green/10 text-ldg-green border border-ldg-green/30 rounded-lg`; keep the
  chevron paging buttons, `text-ldg-ink/55`.
- **Time-filter pills** (All/Morning/Noon/Night/All Day): segmented pills per §2 —
  the purple "All" pill becomes the standard active style.
- **Section headers** (MORNING / NIGHT …): `<Label>` + lucide icon
  (`Sun`/`SunMedium`/`Moon`/`Clock` at 12px `text-ldg-ink/55`) — remove the emoji.
  "6 left" count: mono 12 faint, right-aligned.
- **Habit rows**: keep grouping cards but restyle: `Card` per group (or one Card,
  hairline rows). Row = habit emoji (user data, keep) + name 14px + category mono 11
  faint + checkbox circle per §2. Quantity habits (Water 0/2,000ml): value mono
  (`0 / 2,000 ml`), progress bar per §2, percentage `text-ldg-green` mono 12 (currently
  blue — must change). The +/- quantity step buttons if present: GhostBtn small.

### 4c. `src/app/fitness/page.tsx` — Fitness Today

Delete the dark hero (`bg-[#1f1815]` + radial gradients). Replace with `Card p-5`:

- `<Label>{date}</Label>`, plan title `text-[17px] font-semibold` (drop the emoji or
  keep — plan emoji is config data; prefer replacing with `Dumbbell`/`Bike`/`Moon`
  lucide at `text-ldg-ink/55`), desc mono 12 faint.
- "✓ Done" chip → green badge per §2; "Log it" → `SolidBtn` as `<Link>` styles.
- `ScoreRing` (kcal): green/track per §3; center kcal mono.
- `HeroStat` rows: label = `<Label>`, values mono 15 semibold; protein target color:
  on-target `text-ldg-green`, under `text-ldg-ink/55` (NOT amber); weight delta via
  `Delta` (§3 colors); eating window mono.
- "Today's meals" & "Daily non-negotiables" cards: already white — retune to `Card`,
  rows per §2, icon colors `text-ldg-ink/55` (steps/water/sleep icons are currently
  blue/cyan/indigo — change), meal emoji may stay (data-ish) or become `text-ldg-ink/55`
  lucide `Utensils`; kcal/protein figures mono — kcal `text-ldg-ink`, protein
  `text-ldg-ink/55` (drop orange/red).
- Logged-meal "You ate" block: `bg-ldg-green/[0.07] border border-ldg-green/20 rounded-xl`,
  label `text-ldg-green`.

---

## 5. Module-by-module checklist (work in this order, commit each)

For EVERY page: replace local card divs with `Card`, headers with `Label`, buttons
with `SolidBtn`/`GhostBtn`, inputs/pills/rows/badges/bars per §2, charts per §3.
The token retune (§1) already fixed backgrounds/text on most of them — the per-page
work is mostly: kill remaining hardcoded grays with warm tints, gradient/dark blocks,
non-green accent classes (`text-blue-*`, `text-orange-*`, `text-red-*` decorative,
`bg-green-50 dark:bg-green-950` banners → `bg-ldg-green/[0.07] border-ldg-green/20`),
and emoji in chrome.

1. **Finance** (§4a first, then): accounts, bills, budgets (progress bars per §2,
   over-budget fill `bg-ldg-urgent`), expenses/[type], income, subscriptions,
   transfers, conversions, crypto, goals, planner, purchases, insights, summaries,
   merchants, warranties, categories, settings, scan.
2. **Life/Habits** (§4b first, then): weekly, analytics (charts §3), history, habits
   (manage), goals, ics, contacts-redirect pages.
3. **Fitness** (§4c first, then): meal-plan (green banner per above; day cards →
   `Card`; DAY_EMOJI column may stay as data), meal-history, workouts, body (charts §3).
4. **Schedule**: main grid page — keep the grid architecture; recolor: block colors
   are user data (keep), chrome/gridlines/headers per §2; settings page.
5. **Journal** + settings.
6. **Food**: map page is full-bleed (leave map itself), restyle overlays/legend/buttons;
   list page.
7. **Personal**: contacts, documents.
8. **Watchlist** + books.
9. **Login** page: single centered `Card` on `bg-ldg-paper`, `SolidBtn`.
10. **Shared components**: `GlobalSearch` (button + overlay panel → Card-style, ldg
    tokens), `FloatingMascot` popup (mostly token-driven already — verify, swap any
    remaining `rgb(var(--coral))` which is now green anyway, checkbox/button recipes),
    `synth.tsx` (§3), `ErrorBoundary` fallbacks (text `text-ldg-ink/55`).

### Also in this pass
- `src/components/layout/AppShell.tsx`: change the sidebar `bg-ldg-card` →
  `bg-transparent` (it currently reads as a detached white slab; on paper it should
  blend, keeping only `border-r border-ldg-ink/10`).
- Delete now-unused legacy fields **only if** truly unreferenced after the sweep
  (`accentActive/accentText/accentFab/glow`, `tabs` in ModuleConfig + all shell
  configs). If anything still references them, leave them — no refactors beyond skin.

---

## 6. Definition of done

- `grep -rn "bg-gradient-to\|#1f1815\|232,120,90\|220,161,84\|217,138,148\|167,120,160" src/app src/components --include="*.tsx"` → hits only in `src/app/design/**`.
- `grep -rn "text-blue-\|text-cyan-\|text-indigo-\|text-orange-\|text-purple-\|bg-orange-\|bg-blue-" src/app src/components --include="*.tsx"` (excluding design/) → zero hits (schedule user-data block colors and map category dots exempt — they are data).
- `tsc --noEmit` clean, `next build` clean.
- Every module opened in both light and dark reads as ONE product: gray paper, white
  cards, hairline rules, mono numbers, green-only accent, red only on money-negative.
