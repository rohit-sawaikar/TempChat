# TempChat

TempChat is a modern temporary real-time chat platform built for portfolio impact.
Users create or join a room, chat instantly, and the room data is deleted automatically when everyone leaves.

## Tech Stack

- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express
- Real-time engine: Socket.IO
- Storage model: In-memory room store (easy to upgrade to MongoDB later)

## Features

- Create room with instant room code
- Join room with room code or invite link
- Real-time messaging with Socket.IO rooms
- Online users list
- Typing indicator
- Join/leave system notifications
- Temporary room lifecycle (auto-delete when empty)
- Optional file attachment sharing (up to 2MB)
- Clean timestamps
- Copy invite link
- Leave room
- Responsive dark neon UI
- Loading and error states
- Custom 404 page

## Project Structure

```txt
tempchat/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   └── .env.example
├── server/
│   ├── src/
│   │   ├── roomStore.js
│   │   └── server.js
│   └── .env.example
└── README.md
```

## Local Setup

### 1) Install dependencies

```bash
cd client
npm install
cd ../server
npm install
```

### 2) Configure environment files

Create `client/.env` from `client/.env.example`:

```env
VITE_API_BASE_URL=http://localhost:4000
VITE_SOCKET_URL=http://localhost:4000
```

Create `server/.env` from `server/.env.example`:

```env
PORT=4000
CLIENT_URL=http://localhost:5173
```

### 3) Run project

From root (recommended):

```bash
npm run dev
```

Or use separate terminals:

Terminal 1:

```bash
cd server
npm run dev
```

Terminal 2:

```bash
cd client
npm run dev
```

Open `http://localhost:5173`.

## How It Works (Interview-Friendly)

### Socket.IO connection flow

1. Client connects to Socket.IO server.
2. Client emits `room:join` with room code + username.
3. Server validates room and calls `socket.join(roomCode)`.
4. Server emits users list, message history, typing users to the room.

### Message broadcast flow

1. Client emits `room:message`.
2. Server creates a message object with metadata (id, username, timestamp).
3. Server stores message in room memory.
4. Server emits `room:message` to all sockets in the room via `io.to(roomCode)`.

### Room auto-deletion flow

1. User leaves (`room:leave`) or disconnects.
2. Server removes user from room map.
3. If room has zero users, server deletes room and all messages immediately.
4. Since chat data is only in memory, deletion is complete and instant.

## Deployment Guide

### Backend on Render / Railway

1. Deploy `server` directory as Node service.
2. Set env:
   - `PORT=4000` (or platform-provided)
   - `CLIENT_URL=https://your-frontend-domain.com`
3. Start command: `npm start`

### Frontend on Vercel

1. Deploy `client` directory.
2. Set env:
   - `VITE_API_BASE_URL=https://your-backend-domain.com`
   - `VITE_SOCKET_URL=https://your-backend-domain.com`
3. Build command: `npm run build`
4. Output directory: `dist`

## Future Upgrades

- Add authentication (temporary guest + optional login)
- Add end-to-end encryption for messages
- Add room expiration timers
- Persist active room metadata in MongoDB/Redis
- Add reactions, emoji picker, and message edits
- Add drag-and-drop uploads to cloud storage
- Add rate limiting + moderation rules

## Common Interview Questions + Answers

### 1) Why Socket.IO instead of plain WebSocket?
Socket.IO gives automatic reconnection, room support, event-based architecture, and fallback transport support, which speeds up development.

### 2) How are rooms implemented?
Each room code maps to an in-memory object containing users, messages, and typing state. Socket.IO room channels handle targeted broadcasting.

### 3) How does temporary deletion work?
When a user disconnects/leaves, we remove them. If room user count becomes zero, we delete the room map entry, which clears users and messages.

### 4) How do you prevent invalid room joins?
Before joining, server checks if room exists and username is valid, then returns success/failure through callback.

### 5) How is typing indicator implemented?
Client emits `room:typing` events; server stores typing socket ids per room and broadcasts active typers.

### 6) How is scalability handled later?
Move room state to Redis and run multiple socket instances with a Redis adapter so room events sync across servers.
