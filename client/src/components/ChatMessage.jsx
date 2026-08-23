import { useState, useEffect, useRef } from 'react'
import { formatTime } from '../utils/format'
import MessageAttachment from './MessageAttachment'

/* ── Orb styles (injected once) ─────────────────────────────────── */
function injectOrbStyles() {
  if (document.getElementById('tc-orb')) return
  const s = document.createElement('style')
  s.id = 'tc-orb'
  s.textContent = `
    @keyframes orb-peek-top {
      0%   { transform: translateX(-50%) translateY(100%) scale(0.5); opacity: 0; }
      18%  { transform: translateX(-50%) translateY(-55%) scale(1.1);  opacity: 1; }
      55%  { transform: translateX(-50%) translateY(-55%) scale(1);    opacity: 1; }
      82%  { transform: translateX(-50%) translateY(15%)  scale(0.82); opacity: 0.3; }
      100% { transform: translateX(-50%) translateY(100%) scale(0.5);  opacity: 0; }
    }
    .orb-peek-top {
      animation: orb-peek-top 2.6s cubic-bezier(0.34,1.4,0.64,1) forwards;
    }
    .orb-glow {
      box-shadow: 0 0 10px 4px rgba(99,179,237,0.55), 0 0 22px 6px rgba(139,92,246,0.3), inset 0 0 8px rgba(255,255,255,0.25);
    }
  `
  document.head.appendChild(s)
}

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥']

/* ── Main ChatMessage ────────────────────────────────────────────── */
function ChatMessage({
  message,
  isOwnMessage,
  nowTime,
  onBlockContextMenu,
  isLatestMessage,
  isGrouped,
  isGroupEnd,
  showToast,
  currentUserId,
  onReact,
  onRemoveReact,
}) {
  const [orbKey, setOrbKey] = useState(0)
  const [showOrb, setShowOrb] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const pickerRef = useRef(null)
  const triggerRef = useRef(null)
  const longPressTimer = useRef(null)

  useEffect(() => { injectOrbStyles() }, [])

  useEffect(() => {
    if (!isLatestMessage) { setShowOrb(false); return }
    setOrbKey(k => k + 1)
    setShowOrb(true)
    const t = setTimeout(() => setShowOrb(false), 2700)
    return () => clearTimeout(t)
  }, [isLatestMessage])

  // Close picker on outside click or Escape
  useEffect(() => {
    if (!showReactionPicker) return
    const onKey = e => { if (e.key === 'Escape') setShowReactionPicker(false) }
    const onClick = e => {
      if (
        pickerRef.current && !pickerRef.current.contains(e.target) &&
        triggerRef.current && !triggerRef.current.contains(e.target)
      ) {
        setShowReactionPicker(false)
      }
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('touchstart', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('touchstart', onClick)
    }
  }, [showReactionPicker])

  const fileSecondsLeft = message.file?.expiresAt
    ? Math.max(0, Math.ceil((message.file.expiresAt - nowTime) / 1000))
    : null

  const isMedia = message.file?.isAudio
    || message.file?.data?.startsWith('data:video/')
    || message.file?.data?.startsWith('data:audio/')
  const showBurnTimer = fileSecondsLeft !== null && fileSecondsLeft > 0 && !isMedia

  /* ── Reactions data ────────────────────────────────────────────── */
  const reactions = message.reactions || {}
  const reactionEntries = Object.entries(reactions).filter(([, users]) => {
    const arr = Array.isArray(users) ? users : []
    return arr.length > 0
  })
  const hasReactions = reactionEntries.length > 0

  // Find current user's reaction emoji (if any)
  const myReactionEmoji = (() => {
    for (const [emoji, users] of reactionEntries) {
      if (Array.isArray(users) && users.includes(currentUserId)) return emoji
    }
    return null
  })()

  const handleReact = (emoji) => {
    if (myReactionEmoji === emoji) {
      onRemoveReact?.(message.id)
    } else {
      onReact?.(message.id, emoji)
    }
    setShowReactionPicker(false)
  }

  const handleBadgeClick = (emoji) => {
    const users = reactions[emoji]
    const isMine = Array.isArray(users) && users.includes(currentUserId)
    if (isMine) {
      onRemoveReact?.(message.id)
    } else {
      onReact?.(message.id, emoji)
    }
  }

  /* ── Long press for mobile ────────────────────────────────────── */
  const onTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      setShowReactionPicker(true)
    }, 500)
  }
  const onTouchEnd = () => {
    clearTimeout(longPressTimer.current)
  }

  /* System message */
  if (message.type === 'system') {
    return (
      <div className="my-4 flex items-center gap-3 px-2">
        <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <span className="text-[11px] font-medium tracking-wide" style={{ color: 'rgba(148,163,184,0.6)' }}>
          {message.text} · {formatTime(message.createdAt)}
        </span>
        <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.05)' }} />
      </div>
    )
  }

  const ownBubbleStyle = {
    background: 'linear-gradient(135deg, #0f1e38 0%, #0d1a30 100%)',
    border: '1px solid rgba(34,211,238,0.2)',
    boxShadow: '0 0 0 0.5px rgba(34,211,238,0.1), 0 4px 16px rgba(0,0,0,0.35)',
  }
  const otherBubbleStyle = {
    background: 'rgba(17,20,34,0.7)',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
  }

  return (
    <article
      className={`msg-animate relative flex ${
        isOwnMessage ? 'justify-end' : 'justify-start'
      } 
      ${isLatestMessage ? 'latest-message' : ''}
      ${isGrouped ? 'mb-1' : 'mb-3'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false) }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      {/* Avatar for others */}
      {!isOwnMessage && !isGrouped && (
        <div
          className="mr-2.5 mt-1 flex h-7 w-7 shrink-0 items-center justify-center self-end rounded-full text-[10px] font-bold"
          style={{
            background: `hsl(${(message.username?.charCodeAt(0) * 37) % 360}, 45%, 22%)`,
            border: '1px solid rgba(255,255,255,0.08)',
            color: `hsl(${(message.username?.charCodeAt(0) * 37) % 360}, 70%, 70%)`,
          }}
        >
          {message.username?.[0]?.toUpperCase() || '?'}
        </div>
      )}

      {/* Bubble + reactions wrapper */}
      <div
        className={`flex max-w-[78%] flex-col ${
          isOwnMessage ? 'items-end' : 'items-start'
        }`}
      >
        {/* Message bubble */}
        <div
          className="relative w-fit rounded-2xl px-3 py-2 transition-all duration-200"
          style={{
            transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
            boxShadow: isHovered
              ? '0 10px 28px rgba(0,0,0,.38)'
              : isOwnMessage
                ? ownBubbleStyle.boxShadow
                : otherBubbleStyle.boxShadow,
            isolation: 'isolate',
            ...(isOwnMessage ? ownBubbleStyle : otherBubbleStyle),
            borderRadius: isOwnMessage
              ? (isGroupEnd ? '20px 20px 6px 20px' : '20px 20px 10px 20px')
              : (isGroupEnd ? '20px 20px 20px 6px' : '20px 20px 20px 10px'),
          }}
        >
          {/* Orb peek */}
          {showOrb && (
            <span
              key={orbKey}
              aria-hidden="true"
              className="orb-peek-top orb-glow pointer-events-none absolute left-1/2 top-0 z-0 h-5 w-5 rounded-full"
              style={{
                background: 'radial-gradient(circle at 35% 35%, rgba(186,230,255,0.95), rgba(99,179,237,0.85) 45%, rgba(139,92,246,0.65) 80%)',
              }}
            />
          )}

          <div className="relative z-10">
            {/* Reaction trigger button */}
            <button
              ref={triggerRef}
              type="button"
              aria-label="React to message"
              className="reaction-trigger"
              style={{
                opacity: isHovered || showReactionPicker ? 1 : 0,
                pointerEvents: isHovered || showReactionPicker ? 'auto' : 'none',
                position: 'absolute',
                top: '-8px',
                ...(isOwnMessage ? { left: '-12px' } : { right: '-12px' }),
                zIndex: 20,
              }}
              onClick={() => setShowReactionPicker(v => !v)}
            >
              😊
            </button>

            {/* Emoji picker */}
            {showReactionPicker && (
              <div
                ref={pickerRef}
                className="reaction-picker reaction-pop"
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  ...(isOwnMessage ? { right: 0 } : { left: 0 }),
                  marginBottom: '8px',
                  zIndex: 30,
                }}
              >
                {REACTION_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    className={`reaction-picker-emoji ${myReactionEmoji === emoji ? 'reaction-picker-emoji--active' : ''}`}
                    onClick={() => handleReact(emoji)}
                    aria-label={`React with ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {/* Header row */}
            {!isGrouped && (
              <div className="mb-1.5 flex items-baseline gap-2">
                <span
                  className="text-[12px] font-semibold"
                  style={{
                    color: isOwnMessage ? 'var(--clr-cyan)' : 'var(--clr-indigo)',
                  }}
                >
                  {message.username}
                </span>
                <span
                  className="text-[10px]"
                  style={{ color: 'rgba(148,163,184,0.5)' }}
                >
                  {formatTime(message.createdAt)}
                </span>
              </div>
            )}

            {/* Replied message preview */}
            {message.replyTo && (
              <div
                className="mb-2 rounded-lg px-2.5 py-2"
                style={{
                  background: 'rgba(34,211,238,0.07)',
                  borderLeft: '3px solid rgba(34,211,238,0.6)',
                }}
              >
                <p
                  className="text-[10px] font-semibold"
                  style={{ color: 'rgba(34,211,238,0.9)' }}
                >
                  {message.replyTo.username}
                </p>
                <p
                  className="mt-0.5 truncate text-[11px]"
                  style={{ color: 'rgba(148,163,184,0.7)' }}
                >
                  {message.replyTo.text
                    ? message.replyTo.text.replace(/```/g, '').trim()
                    : 'Attachment'}
                </p>
              </div>
            )}

            {/* Text */}
            {message.text ? (
              <p className="break-words text-[14px] leading-relaxed" style={{ color: '#e2e8f0' }}>
                {message.text}
              </p>
            ) : null}

            <MessageAttachment
              message={message}
              isOwnMessage={isOwnMessage}
              showBurnTimer={showBurnTimer}
              fileSecondsLeft={fileSecondsLeft}
              onBlockContextMenu={onBlockContextMenu}
            />
          </div>
        </div>

        {/* Reaction badges */}
        {hasReactions && (
          <div
            className="mt-1 flex flex-wrap gap-1"
            style={{ ...(isOwnMessage ? { justifyContent: 'flex-end' } : {}) }}
          >
            {reactionEntries.map(([emoji, users]) => {
              const count = Array.isArray(users) ? users.length : 0
              const isMine = Array.isArray(users) && users.includes(currentUserId)
              return (
                <button
                  key={emoji}
                  type="button"
                  className={`reaction-badge ${isMine ? 'reaction-badge--active' : ''}`}
                  onClick={() => handleBadgeClick(emoji)}
                  title={isMine ? 'Remove your reaction' : `React with ${emoji}`}
                >
                  {emoji} {count}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </article>
  )
}

export default ChatMessage
