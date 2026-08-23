import { Link } from 'react-router-dom'
import { ArrowLeft, Shield, MessageSquare } from 'lucide-react'

const steps = [
  {
    number: '01',
    title: 'Create a chat room',
    image: '/how-it-works/step-1.jpg',
  },
  {
    number: '02',
    title: 'Enter Desired Username and Create ',
    image: '/how-it-works/step-2.jpg',
  },
  {
    number: '03',
    title: 'Share the Room Code',
    image: '/how-it-works/step-3.jpg',
  },
  {
    number: '04',
    title: 'Tell Your Friends to join',
    image: '/how-it-works/step-4.jpg',
  },
  {
    number: '05',
    title: 'Enter Desired Username and RoomCode ',
    image: '/how-it-works/step-5.jpg',
  },
  {
    number: '06',
    title: 'Chat Sneakely',
    image: '/how-it-works/step-6.jpg',
  },
]

function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm font-semibold text-white/80 transition hover:text-white"
          >
            <ArrowLeft size={18} />
            Back to home
          </Link>

          <img
  src="/logo/tempchat-logo.png"
  alt="TempChat"
  className="h-22 w-auto object-contain"
/>
        </div>
      </header>

      {/* Main */}
      <main>
        {/* Hero */}
        <section className="mx-auto max-w-4xl px-6 pb-20 pt-20 text-center md:pt-28">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70">
            <Shield size={16} />
            Simple. Private. Temporary.
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            How TempChat works
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-white/60 sm:text-lg">
            Create a temporary room, invite your friends, chat, share files,
            and let your conversations disappear when you're done.
          </p>
        </section>

        {/* Steps */}
        <section className="mx-auto max-w-7xl px-6 pb-24">
          <div className="space-y-24 md:space-y-32">
            {steps.map((step) => (
              <article key={step.number}>
                {/* Step title */}
                <div className="mb-6 flex items-center gap-4">
                  <span className="text-sm font-bold tracking-widest text-white/30">
                    {step.number}
                  </span>

                  <div className="h-px w-12 bg-white/15" />

                  <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    {step.title}
                  </h2>
                </div>

                {/* Large screenshot */}
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-2xl">
                  <img
                    src={step.image}
                    alt={step.title}
                    className="block h-auto w-full"
                  />
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="border-t border-white/10">
          <div className="mx-auto max-w-4xl px-6 py-24 text-center">
            <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5">
              <MessageSquare size={20} />
            </div>

            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to start chatting?
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-white/55">
              Create a temporary room and start a conversation without
              accounts, profiles, or unnecessary setup.
            </p>

            <Link
              to="/"
              className="btn btn-primary mt-8 inline-flex px-7 py-3 font-semibold"
            >
              Start chatting
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}

export default HowItWorksPage