'use client'
import { useState } from 'react'

function formatDisplay(raw: string): string {
  if (!raw) return ''
  const [int, dec] = raw.split('.')
  const formatted = parseInt(int || '0', 10).toLocaleString('en')
  return dec !== undefined ? `${formatted}.${dec}` : formatted
}

function strip(s: string): string {
  return s.replace(/,/g, '')
}

interface NumberInputProps {
  value: string
  onChange: (raw: string) => void
  placeholder?: string
  className?: string
  step?: string
}

/**
 * Controlled number input that formats with thousand-separators on blur.
 * While focused the raw digits are shown directly (no commas) so cursor
 * position is never disturbed by reformatting mid-type.
 */
export function NumberInput({ value, onChange, placeholder, className }: NumberInputProps) {
  const [focused, setFocused] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = strip(e.target.value)
    if (raw !== '' && !/^\d*\.?\d*$/.test(raw)) return
    onChange(raw)
  }

  // While typing: show raw digits (no commas → no cursor-jump issues)
  // While blurred: show formatted number with thousand-separators
  const displayValue = focused ? value : formatDisplay(value)

  return (
    <input
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder={placeholder}
      className={className}
    />
  )
}
