function DateSeparator({ label }) {
    return (
      <div className="my-5 flex items-center gap-3">
        <div
          className="h-px flex-1"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        />
  
        <span
          className="rounded-full px-3 py-1 text-[11px] font-medium"
          style={{
            background: 'rgba(255,255,255,0.05)',
            color: '#94a3b8',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {label}
        </span>
  
        <div
          className="h-px flex-1"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        />
      </div>
    )
  }
  
  export default DateSeparator