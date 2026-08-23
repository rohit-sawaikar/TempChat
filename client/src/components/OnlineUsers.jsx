function OnlineUsers({ users }) {
  return (
    <aside className="glass-panel flex flex-col rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <h3
            className="text-[11px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: 'var(--clr-cyan)' }}
          >
            Online
          </h3>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={{
              background: 'var(--clr-cyan-dim)',
              color: 'var(--clr-cyan)',
              border: '1px solid rgba(34,211,238,0.2)',
            }}
          >
            {users.length}
          </span>
        </div>
      </div>

      {/* User list */}
      <ul className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {users.length === 0 && (
          <li className="px-2 py-3 text-center text-[12px] text-slate-500">
            No users yet
          </li>
        )}
        {users.map((user, i) => (
          <li
            key={user.socketId}
            className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors"
            style={{ animationDelay: `${i * 40}ms` }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
            onMouseLeave={e => e.currentTarget.style.background = ''}
          >
            {/* Avatar */}
            <div
              className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
              style={{
                background: `hsl(${(user.username.charCodeAt(0) * 37) % 360}, 50%, 25%)`,
                border: '1px solid rgba(255,255,255,0.1)',
                color: `hsl(${(user.username.charCodeAt(0) * 37) % 360}, 80%, 75%)`,
              }}
            >
              {user.username[0]?.toUpperCase() || '?'}
              {/* Status dot */}
              <span
                className="status-online absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2"
                style={{
                  background: '#22c55e',
                  borderColor: 'var(--clr-surface-1)',
                }}
              />
            </div>

            <span className="truncate text-[13px] font-medium text-slate-300 group-hover:text-slate-100 transition-colors">
              {user.username}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  )
}

export default OnlineUsers
