import { Link } from 'react-router-dom'
import { MessageSquareText, Shield, Zap, Clock } from 'lucide-react'

const features = [
  {
    icon: Zap,
    title: 'Instant rooms',
    desc: 'One click to create a private room and share the code with anyone.',
  },
  {
    icon: Shield,
    title: 'Zero traces',
    desc: 'Messages, files, and rooms are gone the moment everyone leaves.',
  },
  {
    icon: Clock,
    title: 'Disappearing messages',
    desc: 'Set auto-expiry for individual messages: 10s, 30s, or 1 minute.',
  },
]

function LandingPage() {
  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center px-6 py-16">
      {/* Logo */}
      <div className="absolute -top-2 -left-64 md:-top-2 md:-left-64 z-50">
        <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <img src="/logo/tempchat-logo.png" alt="TempChat Logo" className="h-24 md:h-32 w-auto object-contain drop-shadow-md" />
        </Link>
      </div>

      {/* Ambient orbs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[600px] -translate-x-1/2 -translate-y-1/3 rounded-full opacity-30"
        style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.35) 0%, transparent 70%)', filter: 'blur(48px)' }}
      />

      {/* Badge */}
      <span
        className="mb-8 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]"
        style={{
          background: 'rgba(34,211,238,0.07)',
          border: '1px solid rgba(34,211,238,0.22)',
          color: 'var(--clr-cyan)',
        }}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 status-online" />
        Realtime · Private · Ephemeral
      </span>

      {/* Headline */}
      <h1
        className="mb-6 text-center text-5xl font-bold leading-[1.08] tracking-tight md:text-7xl"
        style={{
          background: 'linear-gradient(160deg, #f8fafc 30%, rgba(148,163,184,0.7) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        Chat that vanishes<br />
        <span style={{
          background: 'linear-gradient(90deg, var(--clr-cyan), var(--clr-indigo))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          when you leave.
        </span>
      </h1>

      <p className="mb-10 max-w-xl text-center text-base leading-relaxed md:text-lg" style={{ color: 'rgba(148,163,184,0.75)' }}>
        TempChat creates private rooms that auto-delete when everyone's gone.
        No accounts, no logs, no permanent history.
      </p>

      {/* CTAs */}
      <div className="mb-16 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/room"
          className="btn btn-primary text-sm px-7 py-3 font-semibold"
          style={{ fontSize: '14px' }}
        >
          <MessageSquareText size={16} />
          Start Chatting
        </Link>
        <Link
          to="/how-it-works"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost text-sm px-7 py-3 font-semibold"
          style={{ fontSize: '14px' }}
        >
          See how it works
        </Link>
      </div>

      {/* Feature cards */}
      <div id="features" className="grid w-full gap-4 md:grid-cols-3">
        {features.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="glass-panel rounded-2xl p-5 transition-all duration-200"
            style={{ cursor: 'default' }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.13)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = ''
              e.currentTarget.style.transform = ''
            }}
          >
            <div
              className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.18)', color: 'var(--clr-cyan)' }}
            >
              <Icon size={17} />
            </div>
            <h3 className="mb-1.5 text-[14px] font-semibold text-slate-100">{title}</h3>
            <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(148,163,184,0.7)' }}>{desc}</p>
          </div>
        ))}
      </div>
    </main>
  )
}

export default LandingPage
