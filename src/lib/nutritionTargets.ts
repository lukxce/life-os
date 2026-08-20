// Daily nutrition targets — previously hardcoded separately in
// fitness/page.tsx (KCAL_TARGET/PROTEIN_TARGET) and duplicated as plain text
// in the meal-plan page's banner ("Target: 2,100 kcal..."). One place now,
// consumed by the Today/Overview page, the Meal Plan page, and the vitals
// Recovery calc's sleep-need default lives separately in Settings (DB-backed,
// user-editable) — this stays a static constant since there's no UI for
// editing it yet, same as before.

export const KCAL_TARGET = 2100
export const PROTEIN_TARGET_MIN = 140
export const PROTEIN_TARGET_MAX = 160
export const PROTEIN_TARGET = 150 // single-number target, used where a range doesn't fit
export const EATING_WINDOW = '12:00 – 20:00'
export const EATING_WINDOW_NOTE = '16:8 IF'
