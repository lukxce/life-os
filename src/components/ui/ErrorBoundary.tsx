'use client'
import { Component, ReactNode } from 'react'

interface Props { children: ReactNode; fallback: ReactNode }
interface State { hasError: boolean }

// A third-party embed (Maps, an external widget, anything with its own
// script/network dependency) can fail for reasons entirely outside this
// app's control — a misconfigured API key, a quota limit, a network blip.
// Without a boundary, that failure throws during render and takes down
// the whole page, not just the section that actually broke.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error: unknown) { console.error('[ErrorBoundary]', error) }
  render() { return this.state.hasError ? this.props.fallback : this.props.children }
}
