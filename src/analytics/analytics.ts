import type { CaptureResult, PostHogConfig } from 'posthog-js'
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

/** Paths only, never the query string, so search terms typed by users are not collected (see scrubEvent for the address PostHog adds itself). */
export function trackPageview(pathname: string) {
  sink.capture('$pageview', { $pathname: pathname })
}

/** `https://host/orders?search=x#top` becomes `https://host/orders`. Anything that isn't a web address is left alone. */
function withoutQueryAndHash(value: unknown): unknown {
  if (typeof value === 'string') return /^https?:\/\//i.test(value) ? value.split(/[?#]/, 1)[0] : value
  if (Array.isArray(value)) return value.map(withoutQueryAndHash)
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, withoutQueryAndHash(inner)]))
  }
  return value // numbers, booleans, null, dates
}

/**
 * posthog-js adds the full address of the page to every event ($current_url, $session_entry_url,
 * $initial_current_url ...), and in this app the address carries what staff typed in the search
 * box (?search=...). This runs on each event just before it is sent and trims every address to
 * its path, so no search term leaves the browser.
 */
export function scrubEvent(event: CaptureResult): CaptureResult {
  return withoutQueryAndHash(event) as CaptureResult
}

/** PostHog settings that don't depend on the environment. Exported so a test can run the real SDK with them. */
export const posthogOptions: Partial<PostHogConfig> = {
  capture_pageview: false, // sent by <PageviewTracker /> on every route change
  autocapture: false, // only the explicit events above, so the data stays clean
  disable_session_recording: true,
  person_profiles: 'identified_only',
  // This app uses none of PostHog's other features, so they are switched off explicitly
  // and "only the events above are sent" stays true.
  advanced_disable_flags: true,
  disable_surveys: true,
  capture_exceptions: false,
  capture_performance: false,
  capture_heatmaps: false,
  capture_dead_clicks: false,
  before_send: scrubEvent,
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
    ...posthogOptions,
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com',
  })
  setAnalyticsSink({
    capture: (event, properties) => posthog.capture(event, properties),
    identify: (id, properties) => posthog.identify(id, properties),
    reset: () => posthog.reset(),
  })
}
