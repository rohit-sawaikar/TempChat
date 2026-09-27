import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

const EXPIRY_OPTIONS = [
  { label: 'No Expiry', value: 0 },
  { label: '5 Minutes', value: 5 * 60000 },
  { label: '30 Minutes', value: 30 * 60000 },
  { label: '1 Hour', value: 60 * 60000 },
]

export default function ExpirySelector({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
  const containerRef = useRef(null)
  const buttonRef = useRef(null)

  const selectedOption = EXPIRY_OPTIONS.find(opt => opt.value === value) || EXPIRY_OPTIONS[0]

  useEffect(() => {
    const handleClickOutside = event => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleToggle = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      // If less than 160px below, open upward
      setOpenUpward(spaceBelow < 160)
    }
    setIsOpen(prev => !prev)
  }

  const handleSelect = optionValue => {
    onChange(optionValue)
    setIsOpen(false)
  }

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium outline-none transition-all duration-150 select-none"
        style={{
          background: isOpen ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.35)',
          borderColor: isOpen ? 'rgba(34,211,238,0.35)' : 'rgba(255,255,255,0.1)',
          color: isOpen ? '#f1f5f9' : '#94a3b8',
          cursor: 'pointer',
        }}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        title="Room Expiry"
      >
        <span>{selectedOption.label}</span>
        <ChevronDown
          size={12}
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-cyan-400' : 'text-slate-400'}`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 ${
            openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } z-50 min-w-32 rounded-lg border py-1 shadow-2xl transition-all duration-150 msg-animate`}
          style={{
            background: 'rgba(13, 15, 26, 0.96)',
            borderColor: 'rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          }}
          role="listbox"
        >
          {EXPIRY_OPTIONS.map(opt => {
            const isSelected = opt.value === value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className="flex w-full items-center justify-between px-3 py-1.5 text-left text-[11px] transition-colors duration-150"
                style={{
                  color: isSelected ? 'var(--clr-cyan, #22d3ee)' : '#cbd5e1',
                  background: isSelected ? 'rgba(34, 211, 238, 0.12)' : 'transparent',
                  fontWeight: isSelected ? '600' : '400',
                }}
                onMouseEnter={e => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
                    e.currentTarget.style.color = '#f8fafc'
                  }
                }}
                onMouseLeave={e => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = '#cbd5e1'
                  }
                }}
                role="option"
                aria-selected={isSelected}
              >
                <span>{opt.label}</span>
                {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

