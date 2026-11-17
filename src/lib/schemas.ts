import { z } from 'zod'
import { CATEGORIES } from '@/api/types'

/** Shared by the product form and the mock API, so both validate the same way. */
export const productSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  sku: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}-\d{4}$/, 'SKU must look like ABC-1234'),
  category: z.enum(CATEGORIES, { message: 'Choose a category' }),
  price: z.number({ message: 'Enter a price' }).positive('Price must be greater than 0').max(100_000),
  stock: z.number({ message: 'Enter a stock amount' }).int('Stock must be a whole number').min(0, 'Stock cannot be negative'),
  status: z.enum(['active', 'draft']),
})

export type ProductInput = z.infer<typeof productSchema>
