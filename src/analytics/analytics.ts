import type { OrderStatus, Role, User } from '@/api/types'

/**
 * Every product event the app sends, with its properties.
 * Keeping the catalog in one typed map means a typo in an event name or a
 * missing property is a compile error, and the list doubles as documentation
 * for building funnels and dashboards in PostHog.
 */
export interface AnalyticsEvents {
  logged_in: { role: Role }
  logged_out: Record<string, never>
  dashboard_range_changed: { days: number }
  order_opened: { status: OrderStatus }
  order_status_changed: { from: OrderStatus; to: OrderStatus }
  orders_exported: { rows: number; status_filter: OrderStatus | 'all' }
  product_created: { category: string }
  product_updated: { category: string }
  product_deleted: Record<string, never>
  team_role_changed: { to: Role }
}

export type EventName = keyof AnalyticsEvents

/** Where events go. PostHog in production, an in-memory list in tests, nothing when disabled. */
export interface AnalyticsSink {
  capture(event: string, properties?: Record<string, unknown>): void
  identify(id: string, properties: Record<string, unknown>): void
  reset(): void
}

const noopSink: AnalyticsSink = { capture() {}, identify() {}, reset() {} }

let sink: AnalyticsSink = noopSink

export function setAnalyticsSink(next: AnalyticsSink | null) {
  sink = next ?? noopSink
}

export function track<E extends EventName>(
  event: E,
  ...[properties]: AnalyticsEvents[E] extends Record<string, never> ? [] : [AnalyticsEvents[E]]
) {
  sink.capture(event, properties)
}

/**
 * Links events to a person. Only the id and role are sent: names and emails
 * are personal data that product analytics doesn't need.
 */
export function identify(user: User) {
  sink.identify(String(user.id), { role: user.role })
}

export function resetIdentity() {
  sink.reset()
}

/** Paths only, never the query string, so search terms typed by users are not collected. */
export function trackPageview(pathname: string) {
  sink.capture('$pageview', { $pathname: pathname })
}

/**
 * Starts PostHog when VITE_POSTHOG_KEY is set. Without a key (local development,
 * tests, forks) analytics is a no-op. The SDK is loaded lazily so it doesn't
 * add to the initial bundle.
 */
export async function initAnalytics() {
  const key = import.meta.env.VITE_POSTHOG_KEY
  if (!key) return

  const { default: posthog } = await import('posthog-js')
  posthog.init(key, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com',
    capture_pageview: false, // sent by <PageviewTracker /> on every route change
    autocapture: false, // only the explicit events above, so the data stays clean
    disable_session_recording: true,
    person_profiles: 'identified_only',
  })
  setAnalyticsSink({
    capture: (event, properties) => posthog.capture(event, properties),
    identify: (id, properties) => posthog.identify(id, properties),
    reset: () => posthog.reset(),
  })
}
