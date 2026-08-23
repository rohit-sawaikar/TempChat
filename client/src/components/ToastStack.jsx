function ToastStack({ toasts }) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(92vw,340px)] flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast-enter flex items-start gap-3 rounded-xl px-4 py-3 text-sm backdrop-blur-xl ${
            toast.type === 'error'
              ? 'border border-rose-400/20 bg-rose-950/80 text-rose-200 shadow-[0_8px_32px_rgba(251,113,133,0.2)]'
              : 'border border-white/10 bg-slate-900/90 text-slate-200 shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
          }`}
        >
          <span
            className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${
              toast.type === 'error' ? 'bg-rose-400' : 'bg-cyan-400'
            }`}
            style={{ marginTop: '5px' }}
          />
          {toast.message}
        </div>
      ))}
    </div>
  )
}

export default ToastStack
