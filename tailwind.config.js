/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'SF Pro Display',
          'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif',
        ],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      transitionTimingFunction: {
        apple: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      },
      colors: {
        canvas:     'rgb(var(--canvas) / <alpha-value>)',
        'canvas-alt': 'rgb(var(--canvas-alt) / <alpha-value>)',
        surface:    'rgb(var(--surface) / <alpha-value>)',
        ink:        'rgb(var(--ink) / <alpha-value>)',
        coral:      'rgb(var(--coral) / <alpha-value>)',
        amber2:     'rgb(var(--amber) / <alpha-value>)',
        rose:       'rgb(var(--rose) / <alpha-value>)',
        plum:       'rgb(var(--plum) / <alpha-value>)',
        // Ledger — the decided app-wide language. "ldg-" not "l-": a single
        // letter collides with Tailwind's own border-l-/rounded-l-
        // directional shorthand (border-l-ink is ambiguous — left-border
        // width, or border color "ink"?). ldg- can't collide with anything.
        'ldg-paper':  'rgb(var(--l-paper) / <alpha-value>)',
        'ldg-card':   'rgb(var(--l-card) / <alpha-value>)',
        'ldg-ink':    'rgb(var(--l-ink) / <alpha-value>)',
        'ldg-green':  'rgb(var(--l-green) / <alpha-value>)',
        'ldg-urgent': 'rgb(var(--l-urgent) / <alpha-value>)',
      },
    },
  },
  plugins: [],
}