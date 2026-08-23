import { useState } from 'react'
import { Paperclip } from 'lucide-react'

import AudioPlayer from './AudioPlayer'
import ImageViewer from './ImageViewer'

function MessageAttachment({
  message,
  isOwnMessage,
  showBurnTimer,
  fileSecondsLeft,
  onBlockContextMenu,
}) {
  const [isViewerOpen, setIsViewerOpen] = useState(false)

  if (!message.file) return null

  return (
    <>
      {message.file.isAudio || message.file.data?.startsWith('data:audio/') ? (
        <AudioPlayer
          src={message.file.data}
          isOwn={isOwnMessage}
        />
      ) : message.file.data?.startsWith('data:video/') ? (
        <div className="mt-2.5 flex flex-col gap-1">
          <video
            src={message.file.data}
            controls
            controlsList="nodownload"
            onContextMenu={onBlockContextMenu}
            className="max-h-[280px] max-w-full rounded-xl object-contain"
            style={{
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          />

          <span
            className="truncate px-0.5 text-[10px]"
            style={{ color: 'rgba(148,163,184,0.6)' }}
          >
            {message.file.name}
          </span>
        </div>
      ) : message.file.data?.startsWith('data:image/') ? (
        <div className="mt-2.5 flex flex-col gap-1.5">
          <div
            className="overflow-hidden rounded-xl"
            style={{
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <img
              src={message.file.data}
              alt="attachment"
              className="max-h-[280px] max-w-full cursor-zoom-in object-contain transition-transform duration-200 hover:scale-[1.02]"
              onContextMenu={onBlockContextMenu}
              onClick={() => setIsViewerOpen(true)}
            />
          </div>

          <div className="flex items-center justify-between px-0.5">
            <span
              className="truncate text-[10px]"
              style={{ color: 'rgba(148,163,184,0.55)' }}
            >
              {message.file.name}
            </span>

            {showBurnTimer && (
              <span
                className="ml-2 shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
                style={{
                  background: 'rgba(251,191,36,0.1)',
                  color: 'var(--clr-amber)',
                  border: '1px solid rgba(251,191,36,0.2)',
                }}
              >
                🔥 {fileSecondsLeft}s
              </span>
            )}
          </div>

          {isViewerOpen && (
            <ImageViewer
              src={message.file.data}
              onClose={() => setIsViewerOpen(false)}
              onBlockContextMenu={onBlockContextMenu}
            />
          )}
        </div>
      ) : (
        <a
          href={message.file.data}
          target="_blank"
          rel="noreferrer"
          onContextMenu={onBlockContextMenu}
          className="mt-2.5 flex items-center gap-3 rounded-xl p-3 transition-colors"
          style={{
            background: 'rgba(0,0,0,0.2)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#e2e8f0',
            textDecoration: 'none',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background =
              'rgba(34,211,238,0.05)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background =
              'rgba(0,0,0,0.2)'
          }}
        >
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{
              background: 'rgba(34,211,238,0.1)',
              border: '1px solid rgba(34,211,238,0.2)',
              color: 'var(--clr-cyan)',
            }}
          >
            <Paperclip size={16} />
          </div>

          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[13px] font-medium">
              {message.file.name}
            </span>

            {showBurnTimer && (
              <span
                className="mt-0.5 text-[9px] uppercase tracking-wider"
                style={{ color: 'var(--clr-amber)' }}
              >
                🔥 Burns in {fileSecondsLeft}s
              </span>
            )}
          </div>
        </a>
      )}
    </>
  )
}

export default MessageAttachment