import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { tokenStorage } from '@/api/client'
import { db } from '@/mocks/db'
import { server } from '@/mocks/server'
import { renderApp } from '@/test/render'

describe('login', () => {
  it('redirects to login, signs in and shows the dashboard', async () => {
    const user = userEvent.setup()
    renderApp('/orders')

    expect(await screen.findByRole('heading', { name: 'Sign in to PanelX' })).toBeInTheDocument()

    await user.type(screen.getByLabelText('Email'), 'editor@panelx.dev')
    await user.type(screen.getByLabelText('Password'), 'demo1234')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    // Goes back to the page the user originally asked for
    expect(await screen.findByRole('heading', { name: 'Orders' })).toBeInTheDocument()
  })

  it('shows an error for a wrong password', async () => {
    const user = userEvent.setup()
    renderApp('/login')

    await user.type(await screen.findByLabelText('Email'), 'admin@panelx.dev')
    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password')
  })
})

describe('expired sessions', () => {
  it('sends a visitor with an unknown token to the login page', async () => {
    tokenStorage.set('mock-token-999') // no such user
    renderApp('/orders')

    expect(await screen.findByRole('heading', { name: 'Sign in to PanelX' })).toBeInTheDocument()
    expect(tokenStorage.get()).toBeNull()
  })

  it('signs the user out when the API answers 401 during use', async () => {
    server.use(http.get('/api/orders', () => HttpResponse.json({ message: 'Your session has expired.' }, { status: 401 })))
    renderApp('/orders', 'viewer')

    expect(await screen.findByRole('heading', { name: 'Sign in to PanelX' })).toBeInTheDocument()
    expect(tokenStorage.get()).toBeNull()
  })
})

describe('orders', () => {
  it('filters by status and searches', async () => {
    const user = userEvent.setup()
    renderApp('/orders', 'viewer')

    const table = await screen.findByRole('table')
    await waitFor(() => expect(within(table).getAllByRole('row').length).toBeGreaterThan(1))

    await user.selectOptions(screen.getByLabelText('Filter by status'), 'cancelled')
    await waitFor(() => {
      const statuses = within(table).getAllByRole('row').slice(1).map((row) => row.textContent)
      expect(statuses.every((text) => text?.includes('Cancelled'))).toBe(true)
    })

    const order = db.orders.find((o) => o.status === 'cancelled')!
    await user.type(screen.getByLabelText('Search order, customer or city'), order.number)
    expect(await within(table).findByText(order.number)).toBeInTheDocument()
    await waitFor(() => expect(within(table).getAllByRole('row')).toHaveLength(2))
  })

  it('empties the search box when the filter is reset from outside', async () => {
    const user = userEvent.setup()
    renderApp('/orders?search=no-such-order', 'viewer')

    const input = await screen.findByLabelText('Search order, customer or city')
    expect(input).toHaveValue('no-such-order')
    expect(await screen.findByText('No orders found')).toBeInTheDocument()

    // The sidebar link opens /orders without any filter
    await user.click(screen.getByRole('link', { name: 'Orders' }))

    await waitFor(() => expect(input).toHaveValue(''))
    await waitFor(() => expect(screen.queryByText('No orders found')).not.toBeInTheDocument())
  })

  it('lets an editor change the status of an order', async () => {
    const user = userEvent.setup()
    const order = db.orders.find((o) => o.status === 'pending')!
    renderApp(`/orders?search=${encodeURIComponent(order.number)}`, 'editor')

    await user.click(await screen.findByText(order.number))
    const dialog = await screen.findByRole('dialog')
    await user.selectOptions(within(dialog).getByLabelText('Status'), 'shipped')

    await waitFor(() => expect(db.orders.find((o) => o.id === order.id)?.status).toBe('shipped'))
  })

  it('opens an order from the keyboard', async () => {
    const user = userEvent.setup()
    const order = db.orders.find((o) => o.status === 'pending')!
    renderApp(`/orders?search=${encodeURIComponent(order.number)}`, 'viewer')

    const row = (await screen.findByText(order.number)).closest('tr')!
    row.focus()
    await user.keyboard('{Enter}')

    expect(await screen.findByRole('dialog')).toHaveTextContent(`Order ${order.number}`)
  })

  it('does not let a viewer change orders or export', async () => {
    const user = userEvent.setup()
    const order = db.orders.find((o) => o.status === 'pending')!
    renderApp(`/orders?search=${encodeURIComponent(order.number)}`, 'viewer')

    expect(screen.queryByRole('button', { name: /export csv/i })).not.toBeInTheDocument()
    await user.click(await screen.findByText(order.number))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).queryByRole('combobox')).not.toBeInTheDocument()
    expect(within(dialog).getByText(/can view orders but not change them/)).toBeInTheDocument()
  })
})

describe('products', () => {
  it('validates the form and creates a product', async () => {
    const user = userEvent.setup()
    renderApp('/products', 'editor')

    await user.click(await screen.findByRole('button', { name: /add product/i }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(await within(dialog).findByText('Name must be at least 2 characters')).toBeInTheDocument()
    expect(within(dialog).getByText('SKU must look like ABC-1234')).toBeInTheDocument()

    await user.type(within(dialog).getByLabelText('Name'), 'Desk Organizer')
    await user.type(within(dialog).getByLabelText('SKU'), 'hom-9999')
    await user.selectOptions(within(dialog).getByLabelText('Category'), 'Home')
    await user.clear(within(dialog).getByLabelText('Price (₺)'))
    await user.type(within(dialog).getByLabelText('Price (₺)'), '249.90')
    await user.clear(within(dialog).getByLabelText('Stock'))
    await user.type(within(dialog).getByLabelText('Stock'), '15')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(db.products.some((p) => p.sku === 'HOM-9999' && p.price === 249.9)).toBe(true))
  })

  it('hides delete for editors and shows it for admins', async () => {
    renderApp('/products', 'editor')
    await screen.findAllByRole('button', { name: /^Edit / })
    expect(screen.queryByRole('button', { name: /^Delete / })).not.toBeInTheDocument()
  })
})

describe('team', () => {
  it('is only reachable for admins', async () => {
    renderApp('/team', 'editor')
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Team' })).not.toBeInTheDocument()
  })

  it('lets an admin change a role but not their own', async () => {
    const user = userEvent.setup()
    renderApp('/team', 'admin')

    expect(await screen.findByLabelText('Role of Sude Erdağı')).toBeDisabled()
    await user.selectOptions(screen.getByLabelText('Role of Zeynep Arslan'), 'editor')
    await waitFor(() => expect(db.users.find((u) => u.id === 3)?.role).toBe('editor'))
  })

  it('rolls the role back when the API refuses the change', async () => {
    const user = userEvent.setup()
    // The refetch after the failed update fails too, so only the rollback can bring the old value back
    let reads = 0
    server.use(
      http.patch('/api/users/:id', () => HttpResponse.json({ message: 'Server is busy' }, { status: 500 })),
      http.get('/api/users', () => (++reads === 1 ? HttpResponse.json(db.users) : HttpResponse.json({ message: 'Down' }, { status: 500 })))
    )
    renderApp('/team', 'admin')

    const select = await screen.findByLabelText('Role of Zeynep Arslan')
    expect(select).toHaveValue('viewer')
    await user.selectOptions(select, 'editor')

    expect(await screen.findByText('Server is busy')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText('Role of Zeynep Arslan')).toHaveValue('viewer'))
    expect(db.users.find((u) => u.id === 3)?.role).toBe('viewer')
  })
})
