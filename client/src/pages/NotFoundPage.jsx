import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <section className="glass-panel max-w-md rounded-2xl p-8 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">404</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Page not found</h1>
        <p className="mt-3 text-sm text-slate-300">
          This temporary route disappeared, but TempChat rooms only vanish after everyone leaves.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-xl border border-cyan-300/50 px-5 py-2 text-sm font-semibold text-cyan-100"
        >
          Go Home
        </Link>
      </section>
    </main>
  )
}

export default NotFoundPage
