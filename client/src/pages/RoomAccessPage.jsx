import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Shuffle, Plus, ArrowRight } from 'lucide-react'
import { getSavedUsername, saveUsername } from '../lib/storage'
import { generateUsername } from '../utils/generateUsername'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

function RoomAccessPage() {
  const [username, setUsername] = useState(getSavedUsername())
  const [searchParams] = useSearchParams()
  const [roomCode, setRoomCode] = useState(searchParams.get('room') || '')
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [createdRoomCode, setCreatedRoomCode] = useState('')
  const [error, setError] = useState('')

  const navigate = useNavigate()

  const normalizedCode = useMemo(
    () => roomCode.trim().toUpperCase(),
    [roomCode]
  )

  const useAnonymousNickname = () => {
    setUsername(generateUsername(true))
  }

  const goToRoom = (code) => {
    saveUsername(username.trim())
    navigate(`/chat/${code}`, {
      state: {
        username: username.trim(),
      },
    })
  }

  const handleCreate = async () => {
    if (!username.trim()) {
      setError('Please enter a username first.')
      return
    }

    setError('')
    setCreatedRoomCode('')
    setIsCreating(true)

    try {
      const res = await fetch(`${API_BASE_URL}/api/rooms`, {
        method: 'POST',
      })

      if (!res.ok) throw new Error()

      const data = await res.json()

      if (!data?.roomCode) throw new Error()

      setCreatedRoomCode(data.roomCode)

      try {
        await navigator.clipboard.writeText(data.roomCode)
      } catch {}

      goToRoom(data.roomCode)
    } catch {
      setError('Failed to create room. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoin = async () => {
    if (!username.trim() || !normalizedCode) {
      setError('Username and room code are required.')
      return
    }

    setError('')
    setIsJoining(true)

    try {
      const res = await fetch(`${API_BASE_URL}/api/rooms/${normalizedCode}`)

      if (!res.ok) throw new Error()

      const data = await res.json()

      if (!data.exists) {
        setError('Room not found. Check the code or request a new invite.')
        return
      }

      goToRoom(normalizedCode)
    } catch {
      setError('Unable to verify room right now.')
    } finally {
      setIsJoining(false)
    }
  }

  const isCreateDisabled =
    isCreating || roomCode.trim().length > 0

  const isJoinDisabled =
    isJoining ||
    !username.trim() ||
    normalizedCode.length !== 8

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg items-center px-6 py-12">
      <div className="glass-elevated w-full rounded-2xl p-8">
        {/* Header */}
        <div className="mb-7">
          <h1 className="text-[22px] font-bold tracking-tight text-slate-50">
            Join or Create a Room
          </h1>

          <p
            className="mt-1.5 text-[13px]"
            style={{ color: 'rgba(148,163,184,0.65)' }}
          >
            Rooms self-destruct when everyone leaves.
          </p>
        </div>

        {/* Username */}
        <div className="mb-4">
          <label
            htmlFor="username"
            className="mb-1.5 block text-[12px] font-medium"
            style={{ color: 'rgba(148,163,184,0.8)' }}
          >
            Your name
          </label>

          <div className="flex gap-2">
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={20}
              autoComplete="nickname"
              className="input-field flex-1"
              placeholder="e.g. Aryan"
            />

            <button
              type="button"
              onClick={useAnonymousNickname}
              title="Random nickname"
              aria-label="Generate random nickname"
              className="btn btn-ghost px-3"
              style={{ flexShrink: 0 }}
            >
              <Shuffle size={15} />
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="relative my-5 flex items-center gap-3">
          <div
            className="h-px flex-1"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          />
          <span
            className="text-[11px]"
            style={{ color: 'rgba(148,163,184,0.4)' }}
          >
            or join existing
          </span>
          <div
            className="h-px flex-1"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          />
        </div>

        {/* Room Code */}
        <div className="mb-5">
          <label
            htmlFor="room-code"
            className="mb-1.5 block text-[12px] font-medium"
            style={{ color: 'rgba(148,163,184,0.8)' }}
          >
            Room Code
          </label>

          <div className="flex gap-2">
            <input
              id="room-code"
              value={roomCode}
              onChange={(e) =>
                setRoomCode(e.target.value.toUpperCase())
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isJoinDisabled) {
                  handleJoin()
                }
              }}
              maxLength={8}
              autoComplete="off"
              className="input-field flex-1 font-mono uppercase tracking-widest"
              placeholder="ROOM CODE"
            />

            <button
              type="button"
              onClick={handleJoin}
              disabled={isJoinDisabled}
              aria-label="Join room"
              className="btn btn-ghost px-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isJoining ? 'Joining...' : <ArrowRight size={16} />}
            </button>
          </div>
        </div>

        {/* Create Button */}
        <button
          type="button"
          onClick={handleCreate}
          disabled={isCreateDisabled}
          className="btn btn-primary w-full justify-center py-3 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus size={16} />
          {isCreating ? 'Creating...' : 'Create New Room'}
        </button>

        {/* Feedback */}
        {createdRoomCode && (
          <p
            className="mt-3 text-center text-[12px]"
            style={{ color: 'rgba(34,211,238,0.8)' }}
          >
            Room{' '}
            <span className="font-mono font-bold">
              {createdRoomCode}
            </span>{' '}
            created — code copied!
          </p>
        )}

        {error && (
          <p
            className="mt-3 text-center text-[13px]"
            style={{ color: 'var(--clr-rose)' }}
          >
            {error}
          </p>
        )}
      </div>
    </main>
  )
}

export default RoomAccessPage