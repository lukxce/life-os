'use client'
import { useState } from 'react'
import { X, Plane } from 'lucide-react'

interface Props {
  onClose: () => void
}

type Step = 'question' | 'yes' | 'no'

export function ReentryModal({ onClose }: Props) {
  const [step, setStep] = useState<Step>('question')

  function answer(yes: boolean) {
    const log = { timestamp: new Date().toISOString(), restartedHomeMode: yes }
    const prev = JSON.parse(localStorage.getItem('reentryLogs') ?? '[]')
    localStorage.setItem('reentryLogs', JSON.stringify([log, ...prev].slice(0, 20)))
    setStep(yes ? 'yes' : 'no')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface/90 dark:bg-surface/70 rounded-2xl w-full max-w-sm p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Plane size={18} className="text-indigo-500" />
            <span className="font-semibold text-sm">Back from a trip</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
            <X size={16} />
          </button>
        </div>

        {step === 'question' && (
          <>
            <p className="text-gray-700 dark:text-gray-300 font-medium mb-6">
              Did you restart home mode the first morning back?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => answer(true)}
                className="flex-1 py-2.5 rounded-xl bg-green-500 text-white font-semibold text-sm hover:bg-green-600 transition-colors"
              >
                Yes ✓
              </button>
              <button
                onClick={() => answer(false)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Not yet
              </button>
            </div>
          </>
        )}

        {step === 'yes' && (
          <div className="text-center py-2">
            <div className="text-4xl mb-3">🏠</div>
            <p className="font-semibold text-gray-800 dark:text-gray-200">Back in the groove.</p>
            <p className="text-sm text-gray-400 mt-1">Home mode is on. Keep the streak going.</p>
            <button onClick={onClose} className="mt-4 w-full py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors">
              Let's go
            </button>
          </div>
        )}

        {step === 'no' && (
          <div className="text-center py-2">
            <div className="text-4xl mb-3">⏰</div>
            <p className="font-semibold text-gray-800 dark:text-gray-200 italic">
              "Start tomorrow morning. No grace period."
            </p>
            <p className="text-sm text-gray-400 mt-2">Set an alarm. First morning sets the tone.</p>
            <button onClick={onClose} className="mt-4 w-full py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              Got it
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
