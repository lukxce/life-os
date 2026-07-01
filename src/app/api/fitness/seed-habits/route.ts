export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const HABITS = [
  {
    name: 'PT Session',
    category: 'Fitness',
    type: 'boolean',
    icon: '🏋️',
    color: '#8b5cf6',
    frequency: 'specific',
    frequencyDays: [1, 3, 5], // Mon, Wed, Fri
    timeOfDay: 'all_day',
    active: true,
    paused: false,
    order: 10,
  },
  {
    name: 'Bike Ride',
    category: 'Fitness',
    type: 'boolean',
    icon: '🚴',
    color: '#3b82f6',
    frequency: 'specific',
    frequencyDays: [2, 6], // Tue, Sat
    timeOfDay: 'all_day',
    active: true,
    paused: false,
    order: 11,
  },
  {
    name: 'Morning Bodyweight Circuit',
    category: 'Fitness',
    type: 'boolean',
    icon: '💪',
    color: '#10b981',
    frequency: 'specific',
    frequencyDays: [1, 2, 3, 4, 5, 6], // Mon–Sat (skip Sun)
    timeOfDay: 'morning',
    active: true,
    paused: false,
    order: 12,
  },
  {
    name: 'Bend App',
    category: 'Fitness',
    type: 'boolean',
    icon: '🧘',
    color: '#f59e0b',
    frequency: 'daily',
    frequencyDays: [],
    timeOfDay: 'morning',
    active: true,
    paused: false,
    order: 13,
  },
]

export async function GET() {
  const created = []
  for (const h of HABITS) {
    const existing = await prisma.habit.findFirst({ where: { name: h.name } })
    if (existing) {
      created.push({ name: h.name, status: 'already exists' })
      continue
    }
    const hab = await prisma.habit.create({ data: h })
    created.push({ name: hab.name, status: 'created', id: hab.id })
  }
  return NextResponse.json({ ok: true, habits: created })
}
