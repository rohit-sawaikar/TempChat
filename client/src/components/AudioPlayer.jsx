/* ── Premium Audio Player ───────────────────────────────────────── */
import { useState, useEffect, useRef } from 'react'
import { Play, Pause } from 'lucide-react'
function AudioPlayer({ src, isOwn }) {
    const [isPlaying, setIsPlaying] = useState(false)
    const [progress, setProgress] = useState(0)
    const [duration, setDuration] = useState(0)
    const audioRef = useRef(null)
  
    const [bars] = useState(() =>
      Array.from({ length: 40 }, () => 18 + Math.random() * 82)
    )
  
    useEffect(() => {
      const audio = audioRef.current
      if (!audio) return
      const onMeta = () => {
        if (audio.duration === Infinity) {
          audio.currentTime = 1e101
          setTimeout(() => { audio.currentTime = 0; setDuration(audio.duration) }, 100)
        } else { setDuration(audio.duration) }
      }
      const onTime = () => setProgress((audio.currentTime / audio.duration) * 100 || 0)
      const onEnd  = () => { setIsPlaying(false); setProgress(0); audio.currentTime = 0 }
      audio.addEventListener('loadedmetadata', onMeta)
      audio.addEventListener('timeupdate', onTime)
      audio.addEventListener('ended', onEnd)
      return () => {
        audio.removeEventListener('loadedmetadata', onMeta)
        audio.removeEventListener('timeupdate', onTime)
        audio.removeEventListener('ended', onEnd)
      }
    }, [])
  
    const togglePlay = () => {
      if (!audioRef.current) return
      if (isPlaying) audioRef.current.pause()
      else audioRef.current.play()
      setIsPlaying(!isPlaying)
    }
  
    const fmtTime = (s) => {
      if (!s || isNaN(s) || s === Infinity) return '0:00'
      return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
    }
  
    const seek = (e) => {
      if (!audioRef.current || !duration || duration === Infinity) return
      const r = e.currentTarget.getBoundingClientRect()
      const pct = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))
      audioRef.current.currentTime = pct * duration
    }
  
    const accentFill = isOwn ? 'rgba(34,211,238,0.9)'  : 'rgba(129,140,248,0.9)'
    const trackFill  = isOwn ? 'rgba(34,211,238,0.12)' : 'rgba(129,140,248,0.12)'
  
    return (
      <div className="mt-2 flex w-60 max-w-full items-center gap-3 rounded-2xl px-3 py-2.5"
        style={{
          background: 'rgba(0,0,0,0.25)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Play button */}
        <button
          onClick={togglePlay}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-150"
          style={{
            background: isOwn ? 'rgba(34,211,238,0.15)' : 'rgba(129,140,248,0.15)',
            border: `1px solid ${isOwn ? 'rgba(34,211,238,0.3)' : 'rgba(129,140,248,0.3)'}`,
            color: isOwn ? 'var(--clr-cyan)' : 'var(--clr-indigo)',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          {isPlaying
            ? <Pause size={15} fill="currentColor" />
            : <Play  size={15} fill="currentColor" className="ml-0.5" />
          }
        </button>
  
        {/* Waveform + times */}
        <div className="flex flex-1 flex-col gap-1.5 overflow-hidden">
          {/* Bars */}
          <div
            className="flex h-7 cursor-pointer items-center gap-[1.5px]"
            onClick={seek}
          >
            {bars.map((h, i) => {
              const played = (i / bars.length) * 100 <= progress
              return (
                <div
                  key={i}
                  className="rounded-full transition-colors duration-75"
                  style={{
                    width: '2.5px',
                    height: `${h}%`,
                    background: played ? accentFill : trackFill,
                  }}
                />
              )
            })}
          </div>
  
          {/* Time row */}
          <div className="flex justify-between font-mono text-[9px] text-slate-500">
            <span>{fmtTime(audioRef.current?.currentTime)}</span>
            <span>{fmtTime(duration)}</span>
          </div>
        </div>
  
        <audio ref={audioRef} src={src} preload="metadata" />
      </div>
    )
  }
  export default AudioPlayer