import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="grid min-h-[60vh] place-items-center text-center">
      <div>
        <p className="text-sm font-semibold text-indigo-600">404</p>
        <h1 className="mt-2 text-2xl font-bold">Page not found</h1>
        <Link to="/" className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline">
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
