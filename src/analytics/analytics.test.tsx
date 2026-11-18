import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '@/test/render'
import { db } from '@/mocks/db'
import { setAnalyticsSink, track, type AnalyticsSink } from './analytics'

type Call = { type: 'capture' | 'identify' | 'reset'; name?: string; props?: Record<string, unknown> }

function recordingSink() {
  const calls: Call[] = []
  const sink: AnalyticsSink = {
    capture: (name, props) => calls.push({ type: 'capture', name, props }),
    identify: (name, props) => calls.push({ type: 'identify', name, props }),
    reset: () => calls.push({ type: 'reset' }),
  }
  const events = (name: string) => calls.filter((c) => c.type === 'capture' && c.name === name)
  return { calls, sink, events }
}

let recorder: ReturnType<typeof recordingSink>

beforeEach(() => {
  recorder = recordingSink()
  setAnalyticsSink(recorder.sink)
})
afterEach(() => setAnalyticsSink(null))

describe('analytics', () => {
  it('does nothing without a sink', () => {
    setAnalyticsSink(null)
    expect(() => track('product_deleted')).not.toThrow()
  })

  it('identifies a user by id and role only, without name or email', async () => {
    const user = userEvent.setup()
    renderApp('/login')

    await user.type(await screen.findByLabelText('Email'), 'editor@panelx.dev')
    await user.type(screen.getByLabelText('Password'), 'demo1234')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    await screen.findByRole('heading', { name: 'Dashboard' })

    const identify = recorder.calls.find((c) => c.type === 'identify')
    expect(identify).toEqual({ type: 'identify', name: '2', props: { role: 'editor' } })
    expect(recorder.events('logged_in')).toEqual([{ type: 'capture', name: 'logged_in', props: { role: 'editor' } }])
  })

  it('sends pageviews with the path but not the query string', async () => {
    renderApp('/orders?search=secret-term', 'viewer')
    await screen.findByRole('heading', { name: 'Orders' })

    const pageviews = recorder.events('$pageview').map((c) => c.props?.$pathname)
    expect(pageviews).toContain('/orders')
    expect(JSON.stringify(recorder.calls)).not.toContain('secret-term')
  })

  it('tracks an order status change with the old and new status', async () => {
    const user = userEvent.setup()
    const order = db.orders.find((o) => o.status === 'pending')!
    renderApp(`/orders?search=${encodeURIComponent(order.number)}`, 'editor')

    await user.click(await screen.findByText(order.number))
    expect(recorder.events('order_opened')).toHaveLength(1)

    const dialog = await screen.findByRole('dialog')
    await user.selectOptions(within(dialog).getByLabelText('Status'), 'shipped')

    await waitFor(() =>
      expect(recorder.events('order_status_changed')).toEqual([
        { type: 'capture', name: 'order_status_changed', props: { from: 'pending', to: 'shipped' } },
      ])
    )
  })

  it('tracks dashboard range changes but not clicks on the selected range', async () => {
    const user = userEvent.setup()
    renderApp('/', 'viewer')

    await user.click(await screen.findByRole('button', { name: '30 days' }))
    await user.click(screen.getByRole('button', { name: '7 days' }))

    expect(recorder.events('dashboard_range_changed').map((c) => c.props)).toEqual([{ days: 7 }])
  })
})
