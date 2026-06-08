'use client'
import Link from 'next/link'
import { CalendarDays, ExternalLink } from 'lucide-react'

export default function LifeSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Habits & Fitness preferences</p>
      </div>

      {/* Calendar settings moved to Schedule */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Calendars</h2>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
              <CalendarDays size={18} className="text-indigo-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Connected calendars</p>
              <p className="text-xs text-gray-400 mt-0.5">Manage your ICS calendars, sharing links, location and meeting link from the Schedule settings.</p>
              <Link
                href="/schedule/settings"
                className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                Open Schedule settings <ExternalLink size={11} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
