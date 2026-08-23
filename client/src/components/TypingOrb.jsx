/**
 * TypingOrb.jsx — Premium typing indicator
 * Floating ghost-white orb with eyes and bouncing dots.
 * All animations via injected CSS — zero external deps.
 */
import { useEffect, useRef, useState } from 'react'

const STYLE_ID = 'tc-typing-orb'
const CSS = `
  @keyframes orb-float {
    0%,100% { transform: translateY(0) rotate(-1deg); }
    35%      { transform: translateY(-5px) rotate(1deg); }
    65%      { transform: translateY(-2.5px) rotate(-0.5deg); }
  }
  @keyframes orb-sway {
    0%,100% { transform: translateX(0); }
    40%     { transform: translateX(2px); }
    70%     { transform: translateX(-1px); }
  }
  @keyframes orb-shadow {
    0%,100% { transform: scaleX(1);    opacity: 0.22; }
    35%     { transform: scaleX(0.72); opacity: 0.10; }
    65%     { transform: scaleX(0.86); opacity: 0.15; }
  }
  @keyframes orb-enter {
    from { opacity:0; transform:scale(0.5) translateY(12px); }
    to   { opacity:1; transform:scale(1)   translateY(0);    }
  }
  @keyframes orb-exit {
    from { opacity:1; transform:scale(1); }
    to   { opacity:0; transform:scale(0.5) translateY(8px); }
  }
  @keyframes blink {
    0%,88%,100% { transform:scaleY(1); }
    94%         { transform:scaleY(0.07); }
  }
  @keyframes pupil-drift {
    0%,60%,100% { transform:translate(0,0); }
    72%         { transform:translate(1px,-0.5px); }
    84%         { transform:translate(-0.5px,-1px); }
  }
  @keyframes dot-bounce {
    0%,80%,100% { transform:translateY(0);   opacity:0.38; }
    40%         { transform:translateY(-6px); opacity:1; }
  }

  .tc-orb-wrap {
    display:inline-flex; flex-direction:column; align-items:center; gap:4px;
    animation: orb-enter 0.36s cubic-bezier(0.34,1.56,0.64,1) forwards;
  }
  .tc-orb-wrap.exiting { animation: orb-exit 0.24s ease-in forwards; }
  .tc-orb-floater {
    animation: orb-float 3.4s ease-in-out infinite;
    will-change:transform;
    display:flex; flex-direction:column; align-items:center; gap:3px;
  }
  .tc-orb-shadow {
    width:22px; height:4px; border-radius:50%;
    background:rgba(0,0,0,0.3); filter:blur(2px);
    animation: orb-shadow 3.4s ease-in-out infinite;
  }
  .tc-orb-sphere {
    width:30px; height:30px; border-radius:50%;
    background: radial-gradient(circle at 33% 28%, rgba(255,255,255,0.97) 0%, #e4e4e4 52%, #c0c0c0 100%);
    box-shadow:
      inset -3px -3px 8px rgba(0,0,0,0.2),
      inset 2px 2px 6px rgba(255,255,255,0.95),
      0 3px 10px rgba(0,0,0,0.32),
      0 1px 3px rgba(0,0,0,0.18);
    position:relative; display:flex; align-items:center; justify-content:center;
    animation: orb-sway 4.8s ease-in-out infinite;
  }
  .tc-orb-sphere::before {
    content:''; position:absolute; top:5px; left:7px;
    width:7px; height:5px; background:rgba(255,255,255,0.72);
    border-radius:50%; transform:rotate(-30deg); filter:blur(1px);
    pointer-events:none;
  }
  .tc-orb-eyes { display:flex; gap:5px; position:relative; z-index:1; margin-top:2px; }
  .tc-orb-eye {
    width:5px; height:7px; background:#111; border-radius:50%;
    position:relative; transform-origin:center bottom;
    animation: blink 4.8s ease-in-out infinite;
  }
  .tc-orb-eye::after {
    content:''; position:absolute; top:1px; left:1px;
    width:2px; height:2px; background:rgba(255,255,255,0.58); border-radius:50%;
    animation: pupil-drift 3s ease-in-out infinite;
  }
  .tc-orb-eye:last-child { animation-delay:0.08s; }

  .tc-orb-dots { display:flex; gap:3px; align-items:center; }
  .tc-orb-dot {
    width:4px; height:4px; border-radius:50%;
    background:rgba(34,211,238,0.65);
    animation: dot-bounce 1.2s ease-in-out infinite;
  }
  .tc-orb-dot:nth-child(2) { animation-delay:0.18s; }
  .tc-orb-dot:nth-child(3) { animation-delay:0.36s; }

  .tc-orb-label {
    font-size:10px; font-family:ui-monospace,'JetBrains Mono',monospace;
    color:rgba(148,163,184,0.65); letter-spacing:0.07em; white-space:nowrap;
  }
`

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return
  const el = document.createElement('style')
  el.id = STYLE_ID; el.textContent = CSS
  document.head.appendChild(el)
}

export default function TypingOrb({ users = [], className = '' }) {
  const [visible, setVisible]   = useState(false)
  const [exiting, setExiting]   = useState(false)
  const exitTimer = useRef(null)

  useEffect(() => { injectStyles() }, [])

  useEffect(() => {
    clearTimeout(exitTimer.current)
    if (users.length > 0) {
      setExiting(false); setVisible(true)
    } else if (visible) {
      setExiting(true)
      exitTimer.current = setTimeout(() => { setVisible(false); setExiting(false) }, 260)
    }
    return () => clearTimeout(exitTimer.current)
  }, [users.length]) // eslint-disable-line

  if (!visible) return null

  const first = users[0]?.username || 'Someone'
  const label = users.length === 1
    ? `${first} typing`
    : users.length === 2
      ? `${first} & 1 other`
      : `${first} & ${users.length - 1} others`

  return (
    <div className={`mb-2 flex items-end gap-3 ${className}`}>
      <div className={`tc-orb-wrap ${exiting ? 'exiting' : ''}`}>
        <div className="tc-orb-floater">
          <div className="tc-orb-sphere">
            <div className="tc-orb-eyes">
              <div className="tc-orb-eye" />
              <div className="tc-orb-eye" />
            </div>
          </div>
          <div className="tc-orb-shadow" />
        </div>
      </div>
      <div className="mb-1 flex flex-col gap-1.5">
        <div className="tc-orb-dots">
          <div className="tc-orb-dot" />
          <div className="tc-orb-dot" />
          <div className="tc-orb-dot" />
        </div>
        <span className="tc-orb-label">{label}…</span>
      </div>
    </div>
  )
}
