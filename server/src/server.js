import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { Server } from "socket.io";
import {
  addMessage,
  addUserToRoom,
  createRoom,
  expireMessageFile,
  getMessages,
  getRoomUsers,
  getTypingUsers,
  removeMessage,
  removeRoom,
  getRoom,
  addReaction,
  removeReaction,
  serializeReactions,
  clearUserData,
  roomExists,
  setTyping,
  removeUserFromRoom,
} from "./roomStore.js";

const app = express();
const server = http.createServer(app);

const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((item) => item.trim())
  : ["http://localhost:5173"];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
  // ADD THIS: Increase Socket.IO max payload size to 50MB
  maxHttpBufferSize: 50 * 1024 * 1024
});



app.use(
  cors({
    origin: allowedOrigins,
  }),
);

// ADD THIS: Increase Express body parser limits to 50MB
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));


const singleUserCountdowns = new Map();
const adminLeaveCountdowns = new Map();
const disconnectTimers = new Map();
const messageTimers = new Map();
const lastMessageTime = new Map();
const roomExpiryTimers = new Map();
const ROOM_CODE_REGEX = /^[A-Z0-9]{8}$/;

const getTimerKey = (roomCode, messageId, timerType) => `${roomCode}:${messageId}:${timerType}`;

const clearRoomExpiryTimer = (roomCode) => {
  const timerId = roomExpiryTimers.get(roomCode);
  if (timerId) {
    clearTimeout(timerId);
    roomExpiryTimers.delete(roomCode);
  }
};

const startRoomExpiryTimer = (roomCode, durationMs) => {
  const timerId = setTimeout(() => {
    if (!roomExists(roomCode)) return;
    io.to(roomCode).emit("room-expired");
    removeRoomCompletely(roomCode);
  }, durationMs);
  roomExpiryTimers.set(roomCode, timerId);
};

const clearRoomTimers = (roomCode) => {
  for (const timerKey of messageTimers.keys()) {
    if (!timerKey.startsWith(`${roomCode}:`)) continue;
    clearTimeout(messageTimers.get(timerKey));
    messageTimers.delete(timerKey);
  }
};

const clearSingleUserCountdown = (roomCode) => {
  const countdown = singleUserCountdowns.get(roomCode);
  if (!countdown) return;

  clearInterval(countdown.intervalId);
  clearTimeout(countdown.timeoutId);
  singleUserCountdowns.delete(roomCode);
};

const clearAdminLeaveCountdown = (roomCode) => {
  const countdown = adminLeaveCountdowns.get(roomCode);
  if (!countdown) return;

  clearInterval(countdown.intervalId);
  clearTimeout(countdown.timeoutId);
  adminLeaveCountdowns.delete(roomCode);
};

const startAdminLeaveCountdown = (roomCode) => {
  if (adminLeaveCountdowns.has(roomCode)) return;

  let remainingSeconds = 60;
  io.to(roomCode).emit("room:admin-countdown", { remainingSeconds });

  const intervalId = setInterval(() => {
    remainingSeconds -= 1;
    if (remainingSeconds > 0) {
      io.to(roomCode).emit("room:admin-countdown", { remainingSeconds });
    }
  }, 1000);

  const timeoutId = setTimeout(() => {
    if (roomExists(roomCode)) {
      io.to(roomCode).emit("room:closed", {
        message: "Room deleted after 60 seconds because the Admin left.",
      });
      removeRoomCompletely(roomCode);
    }
    clearAdminLeaveCountdown(roomCode);
  }, 60000);

  adminLeaveCountdowns.set(roomCode, { intervalId, timeoutId });
};

const removeRoomCompletely = (roomCode) => {
  clearSingleUserCountdown(roomCode);
  clearAdminLeaveCountdown(roomCode);
  clearRoomTimers(roomCode);
  clearRoomExpiryTimer(roomCode);
  removeRoom(roomCode);
};

const startSingleUserCountdown = (roomCode) => {
  if (singleUserCountdowns.has(roomCode)) return;

  let remainingSeconds = 60;
  io.to(roomCode).emit("room:single-user-countdown", { remainingSeconds });

  const intervalId = setInterval(() => {
    remainingSeconds -= 1;

    if (remainingSeconds > 0) {
      io.to(roomCode).emit("room:single-user-countdown", { remainingSeconds });
    }
  }, 1000);

  const timeoutId = setTimeout(() => {
    const users = getRoomUsers(roomCode);
    if (users.length === 1) {
      io.to(roomCode).emit("room:closed", {
        message: "Room deleted after 60 seconds with only one user remaining.",
      });
      removeRoomCompletely(roomCode);
    }

    clearSingleUserCountdown(roomCode);
  }, 60000);

  singleUserCountdowns.set(roomCode, { intervalId, timeoutId });
};

const syncRoomState = (roomCode) => {
  if (!roomExists(roomCode)) return;

  const users = getRoomUsers(roomCode);
  const room = getRoom(roomCode);
  
  io.to(roomCode).emit("room:users", users);
  io.to(roomCode).emit("room:typing", getTypingUsers(roomCode));
  io.to(roomCode).emit("room:settings", {
    creatorId: room.creatorId,
    expiresAt: room.expiresAt
  });

  if (users.length <= 1) {
    if (!adminLeaveCountdowns.has(roomCode)) {
      startSingleUserCountdown(roomCode);
    }
    return;
  }

  clearSingleUserCountdown(roomCode);
  io.to(roomCode).emit("room:single-user-countdown", { remainingSeconds: null });
};



app.get("/api/health", (_req, res) => {
  res.status(200).json({ ok: true, name: "TempChat API" });
});

app.post("/api/rooms", (_req, res) => {
  const roomCode = createRoom();
  res.status(201).json({ roomCode });
});

app.get("/api/rooms/:roomCode", (req, res) => {
  const roomCode = req.params.roomCode.trim().toUpperCase();

  if (!ROOM_CODE_REGEX.test(roomCode)) {
    return res.status(400).json({
      exists: false,
      message: "Invalid room code.",
    });
  }
  res.status(200).json({ exists: roomExists(roomCode) });
});

io.on("connection", (socket) => {
  socket.on("room:join", ({ roomCode, username, avatar }, callback) => {
    const normalizedCode = roomCode?.trim().toUpperCase();
const cleanName = username?.trim().slice(0, 20);

if (!ROOM_CODE_REGEX.test(normalizedCode)) {
  callback({
    ok: false,
    message: "Invalid room code.",
  });
  return;
}

if (!normalizedCode || cleanName.length < 2) {
      callback({ ok: false, message: "Room code and username are required." });
      return;
    }

    if (!roomExists(normalizedCode)) {
      callback({ ok: false, message: "Room does not exist." });
      return;
    }

    if (disconnectTimers.has(cleanName)) {
      clearTimeout(disconnectTimers.get(cleanName));
      disconnectTimers.delete(cleanName);
    }

    socket.join(normalizedCode);
    socket.data.roomCode = normalizedCode;
    socket.data.username = cleanName;
    socket.data.avatar = avatar || { style: "stick", color: "#38bdf8" };

    addUserToRoom(normalizedCode, socket.id, cleanName, socket.data.avatar);
    setTyping(normalizedCode, socket.id, false);

    syncRoomState(normalizedCode);
    // Serialize reactions (Set → array) before sending history
    const history = getMessages(normalizedCode).map((m) => ({
      ...m,
      reactions: serializeReactions(m.reactions),
    }));
    socket.emit("room:messages", history);
    io.to(normalizedCode).emit("room:system", {
      id: randomUUID(),
      type: "system",
      text: `${cleanName} joined the room`,
      createdAt: Date.now(),
    });

    callback({ ok: true, roomCode: normalizedCode });
  });

  socket.on("room:message", ({ text, file, replyTo }) => {
    const roomCode = socket.data.roomCode;
  
    const now = Date.now();
    const previousMessage = lastMessageTime.get(socket.id) || 0;
  
    if (now - previousMessage < 500) {
      return;
    }
  
    lastMessageTime.set(socket.id, now);
  
    if (!roomCode || !roomExists(roomCode)) return;
  
    const cleanText = text?.trim().slice(0, 1000) || "";
  
    if (!cleanText && !file) return;
  
    const createdAt = Date.now();
  
    const message = {
      id: randomUUID(),
      type: "chat",
      userId: socket.id,
      username: socket.data.username,
      text: cleanText,
  
      replyTo: replyTo
        ? {
            id: replyTo.id,
            username: replyTo.username,
            text: replyTo.text,
          }
        : null,
  
      // Files are now persistent for the lifetime of the room.
      // They will disappear automatically when the room itself expires.
      file: file
        ? {
            ...file,
            expiresAt: null,
          }
        : null,
  
      // Individual messages no longer have their own expiry timer.
      expiresAt: null,
  
      createdAt,
    };
  
    addMessage(roomCode, message);
  
    io.to(roomCode).emit("room:message", message);
  });

  socket.on("room:typing", ({ isTyping }) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode || !roomExists(roomCode)) return;

    setTyping(roomCode, socket.id, Boolean(isTyping));
    io.to(roomCode).emit("room:typing", getTypingUsers(roomCode));
  });

  socket.on("room:set-expiry", ({ durationMs }) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode || !roomExists(roomCode)) return;

    const room = getRoom(roomCode);
    if (room.creatorId !== socket.id) return; // Only creator can set expiry

    const allowedDurations = new Set([0, 5 * 60000, 30 * 60000, 60 * 60000]);
    if (!allowedDurations.has(durationMs)) return;

    if (durationMs === 0) {
      room.expiresAt = null;
    } else {
      room.expiresAt = Date.now() + durationMs;
    }

    clearRoomExpiryTimer(roomCode);
    if (room.expiresAt !== null) {
      startRoomExpiryTimer(roomCode, durationMs);
    }

    io.to(roomCode).emit("room:settings", {
      creatorId: room.creatorId,
      expiresAt: room.expiresAt
    });
  });

  socket.on("room:privacy-alert", ({ alertType }) => {
    const roomCode = socket.data.roomCode;
    const username = socket.data.username;
    if (!roomCode || !roomExists(roomCode) || !username) return;

    if (alertType === "screenshot") {
      io.to(roomCode).emit("room:system", {
        id: randomUUID(),
        type: "system",
        text: `${username} may have attempted a screenshot`,
        createdAt: Date.now(),
      });
    }
  });

  /* ── Reaction events ───────────────────────────────────────────── */
  const ALLOWED_EMOJIS = new Set(["👍", "❤️", "😂", "😮", "😢", "🔥"]);

  socket.on("reaction:add", ({ messageId, emoji }) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode || !roomExists(roomCode)) return;
    if (!messageId || !emoji || !ALLOWED_EMOJIS.has(emoji)) return;

    const reactions = addReaction(roomCode, messageId, socket.data.username, emoji);
    if (reactions !== null) {
      io.to(roomCode).emit("reaction:update", { messageId, reactions });
    }
  });

  socket.on("reaction:remove", ({ messageId }) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode || !roomExists(roomCode)) return;
    if (!messageId) return;

    const reactions = removeReaction(roomCode, messageId, socket.data.username);
    if (reactions !== null) {
      io.to(roomCode).emit("reaction:update", { messageId, reactions });
    }
  });

  const performActualLeave = (socket, isIntentional, isTimeout = false) => {
    const roomCode = socket.data.roomCode;
    const username = socket.data.username;
    const socketId = socket.id;
    lastMessageTime.delete(socketId);

    if (!roomCode || !roomExists(roomCode)) return;

    const room = getRoom(roomCode);
    if (!room) return;
    
    // Check if the user is the Admin BEFORE removing them
    const isAdmin = room.creatorId === socketId;

    if (isIntentional) {
      clearUserData(roomCode, username);
      
      const history = getMessages(roomCode).map((m) => ({
        ...m,
        reactions: serializeReactions(m.reactions),
      }));
      io.to(roomCode).emit("room:messages", history);
    }

    // Always remove from room
    removeUserFromRoom(roomCode, socketId);
    setTyping(roomCode, socketId, false);

    const usersLeft = getRoomUsers(roomCode);

    if (usersLeft.length === 0) {
      removeRoomCompletely(roomCode);
      return;
    }

    syncRoomState(roomCode);

    if (isIntentional && isAdmin) {
      io.to(roomCode).emit("room:system", {
        id: randomUUID(),
        type: "system",
        text: `Admin ${username} left the room. Room will be destroyed in 60 seconds.`,
        createdAt: Date.now(),
      });
      startAdminLeaveCountdown(roomCode);
    } else if (!isTimeout || isIntentional) {
      io.to(roomCode).emit("room:system", {
        id: randomUUID(),
        type: "system",
        text: `${username} left the room`,
        createdAt: Date.now(),
      });
    }
  };

  socket.on("room:leave", () => {
    const username = socket.data.username;
    if (disconnectTimers.has(username)) {
      clearTimeout(disconnectTimers.get(username));
      disconnectTimers.delete(username);
    }
    
    performActualLeave(socket, true);
    socket.leave(socket.data.roomCode);
    socket.data.roomCode = undefined;
    socket.data.username = undefined;
  });

  socket.on("disconnect", () => {
    const roomCode = socket.data.roomCode;
    const username = socket.data.username;
    
    if (!roomCode || !username) return;

    const timer = setTimeout(() => {
      // Treat as intentional leave after 30s timeout per requirement
      performActualLeave(socket, true, true);
      disconnectTimers.delete(username);
    }, 30000);
    disconnectTimers.set(username, timer);
  });
});

const PORT = Number(process.env.PORT) || 4000;
server.listen(PORT, () => {
  console.log(`TempChat server listening on port ${PORT}`);
});