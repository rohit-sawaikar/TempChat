function GlassCard({ title, subtitle, children, className = '' }) {
  return (
    <section className={`glass-panel rounded-2xl p-6 md:p-8 ${className}`}>
      {title ? (
        <header className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight text-white">{title}</h2>
          {subtitle ? <p className="mt-2 text-sm text-slate-300">{subtitle}</p> : null}
        </header>
      ) : null}
      {children}
    </section>
  )
}

export default GlassCard
