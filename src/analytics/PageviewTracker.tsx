import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { trackPageview } from './analytics'

/** Sends a pageview whenever the route changes (the app is a SPA, so the browser never reloads). */
export function PageviewTracker() {
  const { pathname } = useLocation()
  useEffect(() => trackPageview(pathname), [pathname])
  return null
}
