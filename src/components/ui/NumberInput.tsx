'use client'
import { useState, useEffect } from 'react'

interface NumberInputProps {
  value: string
  onChange: (raw: string) => void
  placeholder?: string
  className?: string
  step?: string
}

function format(raw: string): string {
  if (!raw) return ''
  const [int, dec] = raw.split('.')
  const formatted = parseInt(int || '0', 10).toLocaleString('en')
  return dec !== undefined ? `${formatted}.${dec}` : formatted
}

function strip(display: string): string {
  return display.replace(/,/g, '')
}

export function NumberInput({ value, onChange, placeholder, className, step }: NumberInputProps) {
  const [display, setDisplay] = useState(format(value))

  useEffect(() => {
    setDisplay(format(value))
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = strip(e.target.value)
    if (raw !== '' && !/^\d*\.?\d*$/.test(raw)) return
    onChange(raw)
    setDisplay(format(raw))
  }

  const handleBlur = () => {
    setDisplay(format(value))
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      step={step}
      className={className}
    />
  )
}
