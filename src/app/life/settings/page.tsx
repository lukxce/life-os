import { redirect } from 'next/navigation'

// Calendar settings live under /schedule/settings
export default function LifeSettingsRedirect() {
  redirect('/schedule/settings')
}
