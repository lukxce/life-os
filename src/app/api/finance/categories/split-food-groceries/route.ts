export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// ── One-time split: "Food & Groceries" → "Food" + "Groceries" ──────────────
// Historical rule: anything whose subcategory reads as a grocery run
// (Supermarket, Cleaning Supplies, …) moves to Groceries; everything else
// (Restaurant, Takeaway, Bakery, Other, unset) moves to Food. Subcategory
// values are preserved as-is — only the parent category changes. Safe to
// call more than once: it's a no-op once "Food & Groceries" is gone.

const FOOD_SUBCATEGORIES = ['Restaurant', 'Takeaway', 'Bakery', 'Snacks', 'Other']
const GROCERIES_SUBCATEGORIES = ['Supermarket', 'Cleaning Supplies', 'Other']

function isGroceries(subcategory: string | null | undefined): boolean {
  if (!subcategory) return false
  const s = subcategory.toLowerCase()
  return s.includes('supermarket') || s.includes('cleaning') || s.includes('groceries') || s.includes('grocery')
}

export async function POST() {
  const oldCategories = await prisma.category.findMany({ where: { name: 'Food & Groceries' } })
  if (oldCategories.length === 0) {
    return NextResponse.json({ alreadyDone: true })
  }

  const result = await prisma.$transaction(async tx => {
    let expensesToFood = 0, expensesToGroceries = 0
    let billsMigrated = 0, budgetsMigrated = 0, nicknamesMigrated = 0

    for (const old of oldCategories) {
      await tx.category.upsert({
        where: { userId_name_type: { userId: old.userId, name: 'Food', type: old.type } },
        update: {},
        create: { userId: old.userId, name: 'Food', type: old.type, subcategories: FOOD_SUBCATEGORIES },
      })
      await tx.category.upsert({
        where: { userId_name_type: { userId: old.userId, name: 'Groceries', type: old.type } },
        update: {},
        create: { userId: old.userId, name: 'Groceries', type: old.type, subcategories: GROCERIES_SUBCATEGORIES },
      })

      const entries = await tx.expenseEntry.findMany({
        where: { category: 'Food & Groceries', type: old.type },
        select: { id: true, subcategory: true },
      })
      for (const e of entries) {
        const target = isGroceries(e.subcategory) ? 'Groceries' : 'Food'
        await tx.expenseEntry.update({ where: { id: e.id }, data: { category: target } })
        target === 'Groceries' ? expensesToGroceries++ : expensesToFood++
      }

      const bills = await tx.bill.findMany({ where: { category: 'Food & Groceries', type: old.type } })
      for (const b of bills) {
        await tx.bill.update({ where: { id: b.id }, data: { category: isGroceries(b.subcategory) ? 'Groceries' : 'Food' } })
        billsMigrated++
      }

      const budgets = await tx.budget.findMany({ where: { category: 'Food & Groceries' } })
      for (const b of budgets) {
        // A budget amount can't be split automatically — move the whole
        // thing to Food (the larger/more variable of the two historically)
        // and let the user add a separate Groceries budget if they want one.
        await tx.budget.update({ where: { id: b.id }, data: { category: 'Food' } })
        budgetsMigrated++
      }

      const nicknames = await tx.merchantNickname.findMany({ where: { category: 'Food & Groceries', userId: old.userId } })
      for (const n of nicknames) {
        await tx.merchantNickname.update({ where: { pib: n.pib }, data: { category: isGroceries(n.subcategory) ? 'Groceries' : 'Food' } })
        nicknamesMigrated++
      }

      await tx.category.delete({ where: { id: old.id } })
    }

    return { expensesToFood, expensesToGroceries, billsMigrated, budgetsMigrated, nicknamesMigrated }
  })

  return NextResponse.json({ done: true, ...result })
}
