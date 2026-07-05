import { redirect } from 'next/navigation'

// Body metrics moved to the Fitness app
export default function LifeBodyRedirect() {
  redirect('/fitness/body')
}
