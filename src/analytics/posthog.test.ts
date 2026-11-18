import posthog from 'posthog-js'
import type { CaptureResult } from 'posthog-js'
import { posthogOptions, scrubEvent } from './analytics'

/**
 * Runs the real posthog-js SDK with the app's settings, but swaps the network for a list,
 * so the test sees exactly what would have left the browser.
 */
function realSdk() {
  const sent: CaptureResult[] = []
  const app = [posthogOptions.before_send ?? []].flat() // whatever the app does to events before sending
  const client = posthog.init(
    'phc_test_key',
    {
      ...posthogOptions,
      api_host: 'http://localhost:9',
      persistence: 'localStorage',
      advanced_disable_flags: true,
      disable_surveys: true,
      before_send: [
        ...app,
        (event) => {
          sent.push(event)
          return null // nothing is sent
        },
      ],
    },
    `test-${Math.random()}`
  )
  return { client, sent }
}

describe('what the real PostHog SDK would send', () => {
  it('never includes the query string or hash of the page address', () => {
    window.history.pushState({}, '', '/orders?search=secret-term#details')
    const { client, sent } = realSdk()

    client.identify('2', { role: 'editor' })
    client.capture('$pageview', { $pathname: '/orders' })
    client.capture('order_opened', { status: 'pending' })

    expect(sent.map((e) => e.event)).toEqual(expect.arrayContaining(['$identify', '$pageview', 'order_opened']))
    const everything = JSON.stringify(sent)
    expect(everything).not.toContain('secret-term')
    expect(everything).not.toContain('details')
    expect(sent.find((e) => e.event === '$pageview')?.properties.$current_url).toBe(`${window.location.origin}/orders`)
  })

  it('trims only web addresses and keeps everything else as it was', () => {
    const when = new Date()
    const event = {
      uuid: 'u',
      event: 'x',
      properties: { $referrer: '$direct', note: 'what?', rows: 3, nested: { url: 'https://a.dev/x?y=1#z' }, list: ['http://b.dev/?q=1'] },
      timestamp: when,
    } as unknown as CaptureResult

    const clean = scrubEvent(event)

    expect(clean.properties).toEqual({ $referrer: '$direct', note: 'what?', rows: 3, nested: { url: 'https://a.dev/x' }, list: ['http://b.dev/'] })
    expect(clean.timestamp).toBe(when) // still the same Date, not an empty object
  })
})
