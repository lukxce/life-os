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

      // Batched updateMany (2 queries) instead of one update() per row —
      // looping individual updates inside a transaction blew past Prisma's
      // default 5s interactive-transaction timeout once there were more
      // than a handful of historical entries (P2028).
      const entries = await tx.expenseEntry.findMany({
        where: { category: 'Food & Groceries', type: old.type },
        select: { id: true, subcategory: true },
      })
      const groceryIds = entries.filter(e => isGroceries(e.subcategory)).map(e => e.id)
      const foodIds = entries.filter(e => !isGroceries(e.subcategory)).map(e => e.id)
      if (groceryIds.length) await tx.expenseEntry.updateMany({ where: { id: { in: groceryIds } }, data: { category: 'Groceries' } })
      if (foodIds.length) await tx.expenseEntry.updateMany({ where: { id: { in: foodIds } }, data: { category: 'Food' } })
      expensesToGroceries += groceryIds.length
      expensesToFood += foodIds.length

      const bills = await tx.bill.findMany({ where: { category: 'Food & Groceries', type: old.type }, select: { id: true, subcategory: true } })
      const billGroceryIds = bills.filter(b => isGroceries(b.subcategory)).map(b => b.id)
      const billFoodIds = bills.filter(b => !isGroceries(b.subcategory)).map(b => b.id)
      if (billGroceryIds.length) await tx.bill.updateMany({ where: { id: { in: billGroceryIds } }, data: { category: 'Groceries' } })
      if (billFoodIds.length) await tx.bill.updateMany({ where: { id: { in: billFoodIds } }, data: { category: 'Food' } })
      billsMigrated += bills.length

      // A budget amount can't be split automatically — move the whole
      // thing to Food and let the user add a separate Groceries budget
      // after if they want one.
      const budgetRes = await tx.budget.updateMany({ where: { category: 'Food & Groceries' }, data: { category: 'Food' } })
      budgetsMigrated += budgetRes.count

      const nicknames = await tx.merchantNickname.findMany({ where: { category: 'Food & Groceries', userId: old.userId }, select: { pib: true, subcategory: true } })
      const nickGroceryPibs = nicknames.filter(n => isGroceries(n.subcategory)).map(n => n.pib)
      const nickFoodPibs = nicknames.filter(n => !isGroceries(n.subcategory)).map(n => n.pib)
      if (nickGroceryPibs.length) await tx.merchantNickname.updateMany({ where: { pib: { in: nickGroceryPibs } }, data: { category: 'Groceries' } })
      if (nickFoodPibs.length) await tx.merchantNickname.updateMany({ where: { pib: { in: nickFoodPibs } }, data: { category: 'Food' } })
      nicknamesMigrated += nicknames.length

      await tx.category.delete({ where: { id: old.id } })
    }

    return { expensesToFood, expensesToGroceries, billsMigrated, budgetsMigrated, nicknamesMigrated }
  }, { timeout: 20000 })

  return NextResponse.json({ done: true, ...result })
}
