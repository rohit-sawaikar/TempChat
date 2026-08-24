import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Copy, LogOut, Paperclip, SendHorizontal, Shield, TriangleAlert, X, Mic, Timer, ChevronDown } from 'lucide-react'
import ChatMessage from '../components/ChatMessage'
import OnlineUsers from '../components/OnlineUsers'
import ToastStack from '../components/ToastStack'
import TypingOrb from '../components/TypingOrb'
import { socket } from '../lib/socket'
import { getSavedUsername } from '../lib/storage'
import { toDataUrl } from '../utils/format'
import DateSeparator from '../components/DateSeparator'

function ChatRoomPage() {
  
  /* ── Route & Navigation ──────────────────────────────────────────────────── */
  const { roomCode }   = useParams()
  const location       = useLocation()
  const navigate       = useNavigate()
  const username       = useMemo(
    () => location.state?.username || getSavedUsername(),
    [location.state?.username],
  )
  
  /* ── Component State ──────────────────────────────────────────────────── */
  const [messages, setMessages]           = useState([])
  const [showNewMessageButton, setShowNewMessageButton] = useState(false)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [users, setUsers]                 = useState([])
  const [typingUsers, setTypingUsers]     = useState([])
  const [messageInput, setMessageInput]   = useState('')
  const [selectedFile, setSelectedFile]   = useState(null)
  const [error, setError]                 = useState('')
  const [isJoining, setIsJoining]         = useState(true)
  const [toasts, setToasts]               = useState([])
  const [isPrivacyMode, setIsPrivacyMode] = useState(false)
  const [singleUserSeconds, setSingleUserSeconds] = useState(null)
  const [disappearingMode, setDisappearingMode]   = useState('off')
  const [watermarkTime, setWatermarkTime] = useState(Date.now())
  const [screenshotSignals, setScreenshotSignals] = useState([])
  const [filePreview, setFilePreview]     = useState(null)
  const [latestMessageId, setLatestMessageId]     = useState(null)
  const [isUploading, setIsUploading]     = useState(false)
  const [showSidebar, setShowSidebar]     = useState(false)
  // Reply system
  const [replyingTo, setReplyingTo] = useState(null)

  // Room Expiry system
  const [creatorId, setCreatorId] = useState(null)
  const [expiresAt, setExpiresAt] = useState(null)
  const [roomExpiryMode, setRoomExpiryMode] = useState(0)
  const [countdown, setCountdown] = useState(null)
  const [adminCountdown, setAdminCountdown] = useState(null)

  
  /* ── Voice Recording State ──────────────────────────────────────────────────── */
  const [isRecording, setIsRecording]     = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef   = useRef(null)
  const audioChunksRef     = useRef([])
  const recordingIntervalRef = useRef(null)
  const cancelRecordingRef = useRef(false)
  const canvasRef          = useRef(null)
  const audioCtxRef        = useRef(null)
  const animationRef       = useRef(null)

  /* ── References ──────────────────────────────────────────────────── */
  const messageListRef     = useRef(null)
  const shouldAutoScrollRef = useRef(true)
  const hasLoadedHistoryRef = useRef(false)
  const messageInputRef = useRef(null)
  const typingTimeoutRef   = useRef(null)
  const toastTimeoutsRef   = useRef([])

  /* ── Toasts notification ──────────────────────────────────────────────────── */
  const showToast = useCallback((message, type = 'info') => {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev, { id, message, type }])
    const t = setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2400)
    toastTimeoutsRef.current.push(t)
  }, [])

  const blockContextMenu = e => {
    e.preventDefault()
    showToast('Right-click disabled for privacy.')
  }

  /* ── Socket Connection & Events ────────────────────────────────────────────── */
  useEffect(() => {
    if (!username) { navigate(`/room?room=${roomCode}`); return }
    socket.connect()
    socket.emit('room:join', { roomCode, username }, res => {
      if (!res.ok) { setError(res.message); setIsJoining(false); return }
      setError(''); setIsJoining(false)
    })
    socket.on('room:messages',        h  => setMessages(h))
    socket.on('room:message', m => {
      setMessages(p => [...p, m])
      setLatestMessageId(m.id)
    
      if (!shouldAutoScrollRef.current) {
        setShowNewMessageButton(true)
      }
    })
    socket.on('reaction:update', ({ messageId, reactions }) => {
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, reactions } : m
      ))
    })
    socket.on('room:system',          m  => setMessages(p => [...p, m]))
    socket.on('room:message-expired', ({ messageId }) => setMessages(p => p.filter(m => m.id !== messageId)))
    socket.on('room:file-expired',    ({ messageId }) =>
      setMessages(p => p.map(m => m.id === messageId ? { ...m, file: null } : m))
    )
    socket.on('room:settings', s => {
      setCreatorId(s.creatorId)
      setExpiresAt(s.expiresAt)
    })
    socket.on('room-expired', () => {
      showToast('This temporary room has expired.', 'error')
      setTimeout(() => navigate('/room'), 1500)
    })
    socket.on('room:users',                   u  => setUsers(u))
    socket.on('room:single-user-countdown',   ({ remainingSeconds }) => setSingleUserSeconds(remainingSeconds))
    socket.on('room:admin-countdown',         ({ remainingSeconds }) => setAdminCountdown(remainingSeconds))
    socket.on('room:closed',                  ({ message }) => {
      showToast(message || 'Room was deleted.', 'error')
      setTimeout(() => navigate('/room'), 1200)
    })
    socket.on('room:typing',                  t  =>
      setTypingUsers(t.filter(u => u.socketId !== socket.id))
    )
    return () => {
      clearTimeout(typingTimeoutRef.current)
      toastTimeoutsRef.current.forEach(clearTimeout)
      toastTimeoutsRef.current = []

      if (mediaRecorderRef.current?.state === 'recording') {
        cancelRecordingRef.current = true
        mediaRecorderRef.current.stop()
        clearInterval(recordingIntervalRef.current)
      }
      socket.emit('room:leave'); socket.removeAllListeners(); socket.disconnect()
      if (audioCtxRef.current) audioCtxRef.current.close()
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [navigate, roomCode, username, showToast])

  /* ── Privacy Protection
   • Blur on focus loss
   • Dynamic watermark
   • Screenshot detection ─────────────────────────────────────── */
  useEffect(() => {
    const onBlur  = () => setIsPrivacyMode(true)
    const onFocus = () => setIsPrivacyMode(false)
    const onVis   = () => setIsPrivacyMode(document.hidden)
    window.addEventListener('blur', onBlur); window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('blur', onBlur); window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])
  
  useEffect(() => {
    if (!expiresAt) {
      setCountdown(null)
      return
    }
    const updateCountdown = () => {
      const remaining = Math.max(0, expiresAt - Date.now())
      const totalSeconds = Math.floor(remaining / 1000)
      const minutes = Math.floor(totalSeconds / 60)
      const seconds = totalSeconds % 60
      setCountdown(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
    }
    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  useEffect(() => {
    const t = setInterval(() => setWatermarkTime(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => {
    const handler = e => {
      if (e.key !== 'PrintScreen') return
      showToast('Screenshot attempt detected', 'error')
      setScreenshotSignals(p => [...p, Date.now()].slice(-10))
      socket.emit('room:privacy-alert', { alertType: 'screenshot' })
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showToast])

  /* ── Auto Scroll Management ────────────────────────────────────────── */
  useEffect(() => {
    const list = messageListRef.current
  
    if (!list || messages.length === 0) return
  
    // Initial room history
    if (!hasLoadedHistoryRef.current) {
      list.scrollTop = list.scrollHeight
      hasLoadedHistoryRef.current = true
      return
    }
  
    // Live updates
    if (shouldAutoScrollRef.current) {
      list.scrollTo({
        top: list.scrollHeight,
        behavior: 'smooth',
      })
      setShowNewMessageButton(false)
    }
  }, [messages, typingUsers])
  /* ── Focus input after joining ───────────────────────────────── */
useEffect(() => {
  if (!isJoining) {
    messageInputRef.current?.focus()
  }
}, [isJoining])

  /* ── File preview ────────────────────────────────────────────── */
  useEffect(() => {
    if (!selectedFile) { setFilePreview(null); return }
    if (selectedFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(selectedFile)
      setFilePreview(url)
      return () => URL.revokeObjectURL(url)
    }
    setFilePreview(null)
  }, [selectedFile])

  /* ── Typing Indicator  ──────────────────────────────────────────────────── */
  const sendTyping = isTyping => socket.emit('room:typing', { isTyping })
  const handleInputChange = e => {
    setMessageInput(e.target.value)
    sendTyping(true)
    clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => sendTyping(false), 2000)
  }

  /* ── Disappearing Messages ──────────────────────────────────────────────────── */
  const getExpiresInMs = () =>
    disappearingMode === '10s' ? 10000
    : disappearingMode === '30s' ? 30000
    : disappearingMode === '1m'  ? 60000
    : null
  
  
  /* ── Drag & Drop Upload ──────────────────────────────────────────────────── */
    const handleDroppedFile = file => {
      if (!file) return
    
      if (file.size > 50 * 1024 * 1024) {
        showToast('Maximum file size is 50 MB.')
        return
      }
    
      const allowedTypes = ['image/', 'video/', 'audio/']
    
      const isSupported = allowedTypes.some(type =>
        file.type.startsWith(type)
      )
  
      if (!isSupported) {
        showToast('Unsupported file type.')
        return
      }
    
      setSelectedFile(file)
      showToast(`File selected: ${file.name}`)
    }




  /* ── Send Messages ────────────────────────────────────────────────────── */
  const handleSend = async e => {
    if (e) e.preventDefault()
    if (!messageInput.trim() && !selectedFile) return
    let filePayload = null
    if (selectedFile) {
      if (selectedFile.size > 50 * 1024 * 1024) {
        showToast('File too large (max 50 MB).', 'error'); return
      }
      setIsUploading(true)
      try {
        const data = await toDataUrl(selectedFile)
        filePayload = { name: selectedFile.name, data, isAudio: false }
      } catch {
        setIsUploading(false)
        showToast('File upload failed.', 'error'); return
      }
    }
    socket.emit('room:message', {
      userId: socket.id,
      text: messageInput,
      file: filePayload,
      expiresInMs: getExpiresInMs(),
    
      replyTo: replyingTo
        ? {
            id: replyingTo.id,
            username: replyingTo.username,
            text: replyingTo.text
          }
        : null
    })
    setMessageInput(''); setSelectedFile(null);setReplyingTo(null); setIsUploading(false); sendTyping(false);messageInputRef.current?.focus()
  }

  /* ── Voice Recording ───────────────────────────────────────────────────── */
  const blobToBase64 = blob => new Promise(res => {
    const r = new FileReader()
    r.onloadend = () => res(r.result)
    r.readAsDataURL(blob)
  })

  const startRecording = async () => {
    if (isRecording) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []

      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
      const analyser = audioCtxRef.current.createAnalyser()
      const src = audioCtxRef.current.createMediaStreamSource(stream)
      src.connect(analyser)
      analyser.fftSize = 256
      const buf = analyser.frequencyBinCount
      const arr = new Uint8Array(buf)
      const history = []

      const draw = () => {
        if (!canvasRef.current) return
        animationRef.current = requestAnimationFrame(draw)
        analyser.getByteTimeDomainData(arr)
        let sum = 0
        for (let i = 0; i < buf; i++) { const v = (arr[i] - 128) / 128; sum += v * v }
        const vol = Math.max(0.01, Math.sqrt(sum / buf))
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight
        const bw = 3, gap = 2, total = bw + gap
        const maxBars = Math.floor(canvas.width / total)
        history.push(vol)
        if (history.length > maxBars) history.shift()
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        const startX = canvas.width - history.length * total
        history.forEach((v, i) => {
          let h = v * canvas.height * 4
          h = Math.max(2, Math.min(canvas.height - 4, h))
          const x = startX + i * total
          const y = (canvas.height - h) / 2
          ctx.fillStyle = '#22d3ee'
          ctx.beginPath()
          ctx.roundRect(x, y, bw, h, 2)
          ctx.fill()
        })
      }

      mediaRecorderRef.current.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mediaRecorderRef.current.onstop = async () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current)
        if (audioCtxRef.current) audioCtxRef.current.close()
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        stream.getTracks().forEach(t => t.stop())
        if (blob.size > 500 && !cancelRecordingRef.current) {
          const b64 = await blobToBase64(blob)
          socket.emit('room:message', { userId: socket.id,text: '', file: { name: 'Voice Message', data: b64, isAudio: true }, expiresInMs: getExpiresInMs() })
        }
        setIsRecording(false); setRecordingTime(0)
      }

      mediaRecorderRef.current.start()
      setIsRecording(true); setRecordingTime(0); cancelRecordingRef.current = false
      draw()
      recordingIntervalRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000)
    } catch {
      showToast('Microphone access denied.', 'error')
    }
  }

  const stopRecording = (cancel = false) => {
    cancelRecordingRef.current = cancel
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      clearInterval(recordingIntervalRef.current)
    }
  }

  const fmtAudio = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  const getDateLabel = (date) => {
    const d = new Date(date)
    const today = new Date()
    const yesterday = new Date()
  
    yesterday.setDate(today.getDate() - 1)
  
    if (d.toDateString() === today.toDateString())
      return 'Today'
  
    if (d.toDateString() === yesterday.toDateString())
      return 'Yesterday'
  
    return d.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  /* ── Room Actions
   • Invite
   • Leave
   • Panic Exit ─────────────────────────────────────────────────── */
  const copyInvite = async () => {
    const link = `${window.location.origin}/chat/${roomCode.toUpperCase()}`
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(link)
      else {
        const ta = document.createElement('textarea')
        ta.value = link; document.body.appendChild(ta); ta.select()
        document.execCommand('copy'); document.body.removeChild(ta)
      }
      showToast('Invite link copied!')
    } catch { showToast('Could not copy link.', 'error') }
  }

  const leaveRoom = () => {
    socket.emit('room:leave')
    navigate('/room')
  }

  const panicExit = () => {
    socket.emit('room:leave'); socket.disconnect()
    localStorage.clear(); sessionStorage.clear(); navigate('/')
  }

 

  /* ── Loading & Error Screens ──────────────────────────────────── */
  if (isJoining) {
    return (
      <main className="grid min-h-screen place-items-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 rounded-full border-2 border-cyan-400/40 border-t-cyan-400"
            style={{ animation: 'spin 0.8s linear infinite' }}
          />
          <p className="text-[14px]" style={{ color: 'rgba(148,163,184,0.7)' }}>Joining room…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </main>
    )
  }

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center px-4 text-center">
        <div className="glass-panel max-w-sm rounded-2xl p-8">
          <div className="mb-4 text-3xl">🚫</div>
          <h1 className="text-lg font-semibold text-slate-100">Unable to join room</h1>
          <p className="mt-2 text-[13px]" style={{ color: 'var(--clr-rose)' }}>{error}</p>
          <button onClick={() => navigate('/room')} className="btn btn-ghost mt-6 px-5">
            Back to rooms
          </button>
        </div>
      </main>
    )
  }

  /* ── Main Chat Interface ─────────────────────────────────────────────────── */
  return (
    <main
      className="mx-auto flex h-screen w-full max-w-7xl flex-col gap-3 overflow-hidden px-3 py-3 md:px-5 md:py-4"
      onContextMenu={blockContextMenu}
      onDragOver={e => {
        if (isUploading) return
        e.preventDefault()
        setIsDraggingFile(true)
      }}
  
      onDragLeave={e => {
        if (e.currentTarget.contains(e.relatedTarget)) return
        setIsDraggingFile(false)
      }}
  
      onDrop={e => {
        if (isUploading) return
        e.preventDefault()
        setIsDraggingFile(false)
        handleDroppedFile(e.dataTransfer.files?.[0] || null)
      }}
    >

      
      <ToastStack toasts={toasts} />
{/* ── Drag & Drop Overlay ───────────────────────────────────── */}

{replyingTo && (
  <div
    className="mb-2 flex items-center justify-between rounded-xl px-3 py-2"
    style={{
      background:'rgba(34,211,238,0.08)',
      border:'1px solid rgba(34,211,238,0.15)'
    }}
  >
    <div className="text-xs">
      Replying to <b>{replyingTo.username}</b>
      <p className="truncate opacity-60">
        {replyingTo.text}
      </p>
    </div>

    <button
      onClick={() => setReplyingTo(null)}
      type="button"
    >
      <X size={14}/>
    </button>
  </div>
)}
      {isDraggingFile && (
  <div
    className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
    style={{
      background: 'rgba(8,17,31,.72)',
      border: '2px dashed rgba(34,211,238,.45)',
    }}
  >
    <div
      className="rounded-2xl px-8 py-5 text-lg font-semibold"
      style={{
        background: 'rgba(15,23,42,.9)',
        color: 'var(--clr-cyan)',
      }}
    >
      📎 Drop file to upload
    </div>
  </div>
)}

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="glass-panel flex shrink-0 items-center justify-between gap-4 rounded-2xl px-5 py-3">
        {/* Left: room info */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[10px] font-bold"
            style={{ background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.2)', color: 'var(--clr-cyan)' }}
          >
            #
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em]" style={{ color: 'rgba(148,163,184,0.5)' }}>
              Room
            </p>
            <h1 className="font-mono text-[15px] font-bold tracking-wider text-slate-100">
              {roomCode}
            </h1>
          </div>

          {/* Privacy badge */}
          <div
            className="hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium md:inline-flex"
            style={{ background: 'rgba(34,211,238,0.07)', border: '1px solid rgba(34,211,238,0.15)', color: 'rgba(34,211,238,0.8)' }}
          >
            <Shield size={10} /> E2E Private
          </div>
        </div>

        {/* Right: expiry selector + dropdown toggle */}
        <div className="flex shrink-0 items-center gap-2">
          {adminCountdown !== null ? (
            <div className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11.5px] font-medium" style={{ background: 'rgba(251,113,133,0.1)', border: '1px solid rgba(251,113,133,0.3)', color: '#fda4af' }}>
              ⚠️ Admin left. Room expires in {Math.floor(adminCountdown / 60).toString().padStart(2, '0')}:{(adminCountdown % 60).toString().padStart(2, '0')}
            </div>
          ) : countdown ? (
            <div className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11.5px] font-medium" style={{ color: '#cbd5e1' }}>
              ⏳ {countdown}
            </div>
          ) : null}

          {creatorId === socket.id && (
            <div className="flex items-center gap-1.5">
              <select
                value={roomExpiryMode}
                onChange={e => {
                  const val = Number(e.target.value);
                  setRoomExpiryMode(val);
                  socket.emit('room:set-expiry', { durationMs: val });
                }}
                className="rounded-lg border px-2 py-1 text-[11px] outline-none"
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  borderColor: 'rgba(255,255,255,0.1)',
                  color: '#94a3b8',
                  cursor: 'pointer',
                }}
                title="Room Expiry"
              >
                <option value={0}>No Expiry</option>
                <option value={5 * 60000}>5 Minutes</option>
                <option value={30 * 60000}>30 Minutes</option>
                <option value={60 * 60000}>1 Hour</option>
              </select>
            </div>
          )}


          {/* Dropdown toggle — visible on all screen sizes */}
          <button
            className="btn btn-ghost px-2.5"
            onClick={() => setShowSidebar(v => !v)}
            aria-label="Toggle actions menu"
          >
            <ChevronDown size={16} style={{ transform: showSidebar ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }} />
          </button>
        </div>
      </header>

      {/* ── Actions Dropdown Menu (all screen sizes) ─────────── */}
      {showSidebar && (
        <div className="glass-panel flex shrink-0 flex-wrap gap-2 rounded-2xl px-4 py-3">
          <button 
          onClick={copyInvite}
          aria-label="Copy invite link"
           className="btn btn-ghost text-xs flex-1 justify-center">
            <Copy size={13} /> Invite
          </button>
          <button 
          onClick={leaveRoom}
          aria-label="Leave room"
           className="btn btn-danger text-xs flex-1 justify-center">
            <LogOut size={13} /> Leave
          </button>
          <button 
          onClick={panicExit}
          aria-label="Panic exit"
           className="btn btn-warn text-xs flex-1 justify-center">
            <TriangleAlert size={13} /> Panic
          </button>
        </div>
      )}

      {/* ── Body: messages + sidebar ───────────────────────────── */}
      <section className="grid min-h-0 flex-1 gap-3 overflow-hidden md:grid-cols-[1fr_260px]">

        {/* Messages panel */}
        <div className="glass-panel relative flex min-h-0 flex-col overflow-hidden rounded-2xl">
        {showNewMessageButton && (
  <button
    type="button"
    onClick={() => {
      shouldAutoScrollRef.current = true
      messageListRef.current?.scrollTo({
        top: messageListRef.current.scrollHeight,
        behavior: 'smooth',
      })
      setShowNewMessageButton(false)
    }}
    className="absolute bottom-24 left-1/2 z-20 -translate-x-1/2 rounded-full px-4 py-2 text-sm font-medium"
    style={{
      background: 'var(--clr-cyan)',
      color: '#08111f',
      boxShadow: '0 8px 30px rgba(34,211,238,.25)',
    }}
  >
    ↓ New Messages
  </button>
)}
          {/* Watermark */}
          <div
            className="pointer-events-none absolute right-4 top-4 z-10 rounded-lg px-2.5 py-1.5 text-[9px] font-mono"
            style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(148,163,184,0.45)', userSelect: 'none' }}
          >
            {username} · {new Date(watermarkTime).toLocaleTimeString()}
          </div>

          {/* Top bar: online status */}
          <div className="flex shrink-0 items-center gap-2 border-b px-4 py-2.5" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400 status-online" />
            <span className="text-[11px]" style={{ color: 'rgba(148,163,184,0.55)' }}>
              {users.length} online · Privacy high
            </span>
          </div>

          {/* Countdown alert */}
          {singleUserSeconds !== null && (
            <div
              className="mx-4 mt-3 shrink-0 rounded-xl px-4 py-2.5 text-[12px]"
              style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: '#fde68a' }}
            >
              ⏳ Room deletes in <strong>{singleUserSeconds}s</strong> if nobody rejoins.
            </div>
          )}

          {/* Screenshot signal */}
          {screenshotSignals.length > 0 && (
            <div
              className="mx-4 mt-2 shrink-0 rounded-xl px-4 py-2 text-[11px]"
              style={{ background: 'rgba(251,113,133,0.07)', border: '1px solid rgba(251,113,133,0.18)', color: '#fca5a5' }}
            >
              ⚠️ {screenshotSignals.length} screenshot signal{screenshotSignals.length > 1 ? 's' : ''} detected
            </div>
          )}

          {/* Messages list */}
          <div
            ref={messageListRef}
            onScroll={() => {
              const list = messageListRef.current
          
              if (!list) return
          
              const distanceFromBottom =
                list.scrollHeight - list.scrollTop - list.clientHeight
          
                const atBottom = distanceFromBottom <= 80

                shouldAutoScrollRef.current = atBottom
                
                if (atBottom) {
                  setShowNewMessageButton(false)
                }
            }}
            className={`flex-1 overflow-y-auto px-4 py-4 transition-all duration-300 ${
              isPrivacyMode ? 'pointer-events-none select-none blur-md' : ''
            }`}
          >
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <div className="text-4xl opacity-30">💬</div>
                <p className="text-[13px]" style={{ color: 'rgba(148,163,184,0.4)' }}>
                  No messages yet.<br />Start the conversation.
                </p>
              </div>
            )}
            {messages.map((m, index) => {
  const previousMessage = messages[index - 1]
  const nextMessage = messages[index + 1]

  const showDateSeparator =
    !previousMessage ||
    new Date(previousMessage.createdAt).toDateString() !==
      new Date(m.createdAt).toDateString()

  const isGrouped =
    previousMessage &&
    previousMessage.userId === m.userId &&
    new Date(previousMessage.createdAt).toDateString() ===
      new Date(m.createdAt).toDateString()

  const isGroupEnd =
    !nextMessage ||
    nextMessage.userId !== m.userId ||
    new Date(nextMessage.createdAt).toDateString() !==
      new Date(m.createdAt).toDateString()

      console.log('OWNERSHIP DEBUG:', {
        messageUserId: m.userId,
        currentSocketId: socket.id,
        isOwn: m.userId === socket.id,
        text: m.text,
      })
      
  return (
    <div key={m.id}>
      {showDateSeparator && (
        <DateSeparator
          label={getDateLabel(m.createdAt)}
        />
      )}

      <ChatMessage
        message={m}
        isOwnMessage={m.username === username}
        isLatestMessage={m.id === latestMessageId}
        nowTime={watermarkTime}
        onBlockContextMenu={blockContextMenu}
        isGrouped={isGrouped}
        isGroupEnd={isGroupEnd}
        showToast={showToast}
        currentUserId={username}
        onReact={(messageId, emoji) => socket.emit('reaction:add', { messageId, emoji })}
        onRemoveReact={(messageId) => socket.emit('reaction:remove', { messageId })}
        onReply={() => {
          setReplyingTo(m)
          messageInputRef.current?.focus()
        }}
      />
    </div>
  )
})}
          </div>

          {/* Privacy overlay */}
          {isPrivacyMode && (
            <div
              className="mx-4 mb-3 shrink-0 rounded-xl py-2.5 text-center text-[12px]"
              style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(34,211,238,0.15)', color: 'rgba(34,211,238,0.7)' }}
            >
              🔒 Chat hidden — window unfocused
            </div>
          )}

          {/* ── Input area ───────────────────────────────────── */}

          {replyingTo && (
  <div
    className="mb-2 flex items-center justify-between rounded-xl px-3 py-2"
    style={{
      background:'rgba(34,211,238,0.08)',
      border:'1px solid rgba(34,211,238,0.15)'
    }}
  >
    <div className="text-xs">
      Replying to <b>{replyingTo.username}</b>
      <p className="truncate opacity-60">
        {replyingTo.text}
      </p>
    </div>

    <button
      onClick={() => setReplyingTo(null)}
      type="button"
    >
      <X size={14}/>
    </button>
  </div>
)}
          <form
            onSubmit={handleSend}
            className="shrink-0 border-t px-4 pb-4 pt-3"
            style={{ borderColor: 'rgba(255,255,255,0.05)' }}
          >
            {/* File preview */}
            {selectedFile && (
              <div
                className="mb-3 flex w-max max-w-full items-center gap-3 rounded-xl px-3 py-2.5"
                style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {filePreview ? (
                  <img src={filePreview} alt="preview"
                    className="h-11 w-11 rounded-lg object-cover"
                    style={{ border: '1px solid rgba(34,211,238,0.2)' }}
                  />
                ) : (
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.18)', color: 'var(--clr-cyan)' }}
                  >
                    <Paperclip size={18} />
                  </div>
                )}
                <p className="max-w-[160px] truncate text-[12px]" style={{ color: '#94a3b8' }}>
                  {selectedFile.name}
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="ml-1 flex h-6 w-6 items-center justify-center rounded-full transition-colors"
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#64748b' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(251,113,133,0.15)'; e.currentTarget.style.color = '#fb7185' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#64748b' }}
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Recording UI */}
            {isRecording ? (
              <div
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-2.5"
                style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(251,113,133,0.25)' }}
              >
                <button type="button" onClick={() => stopRecording(true)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors"
                  style={{ color: '#94a3b8' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#fb7185'}
                  onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                >
                  <X size={18} />
                </button>

                <div
                  className="recording-dot h-2 w-2 shrink-0 rounded-full"
                  style={{ background: 'var(--clr-rose)' }}
                />

                <span className="w-10 shrink-0 font-mono text-[13px]" style={{ color: 'var(--clr-rose)' }}>
                  {fmtAudio(recordingTime)}
                </span>

                <div className="flex-1 overflow-hidden px-1">
                  <canvas ref={canvasRef} className="block h-8 w-full" />
                </div>

                <button
                  type="button"
                  onClick={() => stopRecording(false)}
                  className="btn btn-primary h-9 w-9 shrink-0 justify-center px-0 py-0 rounded-full"
                >
                  <SendHorizontal size={16} />
                </button>
              </div>
            ) : (
              /* Normal input */
              <div className="relative flex gap-2">
                {/* Typing orb positioned above input */}
                <div className="absolute bottom-full left-0 z-20 mb-2">
                  <TypingOrb users={typingUsers} />
                </div>

                <input
  ref={messageInputRef}
  value={messageInput}
  disabled={isUploading}
  onChange={handleInputChange}
  onKeyDown={e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }}
  maxLength={1000}
  placeholder="Write a message…"
  className="input-field flex-1"
  style={{ borderRadius: '14px' }}
/>

                {/* Attach */}
                <label
  className={`btn btn-ghost shrink-0 px-3 ${
    isUploading ? 'pointer-events-none opacity-50 cursor-not-allowed' : 'cursor-pointer'
  }`}
  style={{ borderRadius: '14px' }}
  title="Attach file"
  aria-label="Attach file"
>
                  <Paperclip size={16} />
                  <input
                    type="file"
                    disabled={isUploading}
                    accept="image/*,video/*,audio/*"
                    className="hidden"
                    onChange={e => {
                      handleDroppedFile(e.target.files?.[0] || null)
                      e.target.value = ''
                    }}
                  />
                </label>

                {/* Send / Mic */}
                {messageInput.trim() || selectedFile ? (
                  <button
                    type="submit"
                    disabled={isUploading}
                    aria-label="Send message"
                    className="btn btn-primary shrink-0 px-4 disabled:opacity-50 disabled:cursor-wait"
                    style={{ borderRadius: '14px' }}
                  >
                    <SendHorizontal size={16} />
                    <span className="hidden md:inline">{isUploading ? 'Sending…' : 'Send'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startRecording}
                    disabled={isUploading}
                    aria-label="Start voice recording"
                    className="btn btn-ghost shrink-0 px-3"
                    style={{ borderRadius: '14px', color: 'var(--clr-cyan)' }}
                    title="Voice message"
                  >
                    <Mic size={17} />
                  </button>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Online users sidebar */}
        <OnlineUsers users={users} />
      </section>
    </main>
  )
}

export default ChatRoomPage
