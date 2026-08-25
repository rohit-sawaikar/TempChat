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
  getMessages,
  getRoomUsers,
  getTypingUsers,
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

/* ─────────────────────────────────────────────────────────────
   CORS
───────────────────────────────────────────────────────────── */

const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((item) => item.trim())
  : ["http://localhost:5173"];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },

  // Maximum Socket.IO payload: 50 MB
  maxHttpBufferSize: 50 * 1024 * 1024,
});

app.use(
  cors({
    origin: allowedOrigins,
  }),
);

// Maximum Express payload: 50 MB
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

/* ─────────────────────────────────────────────────────────────
   ROOM / TIMER STATE
───────────────────────────────────────────────────────────── */

const singleUserCountdowns = new Map();
const adminLeaveCountdowns = new Map();
const disconnectTimers = new Map();
const roomExpiryTimers = new Map();

const lastMessageTime = new Map();

const ROOM_CODE_REGEX = /^[A-Z0-9]{8}$/;

/* ─────────────────────────────────────────────────────────────
   ROOM EXPIRY
───────────────────────────────────────────────────────────── */

const clearRoomExpiryTimer = (roomCode) => {
  const timerId = roomExpiryTimers.get(roomCode);

  if (timerId) {
    clearTimeout(timerId);
    roomExpiryTimers.delete(roomCode);
  }
};

const startRoomExpiryTimer = (roomCode, durationMs) => {
  clearRoomExpiryTimer(roomCode);

  const timerId = setTimeout(() => {
    if (!roomExists(roomCode)) return;

    io.to(roomCode).emit("room-expired");

    removeRoomCompletely(roomCode);
  }, durationMs);

  roomExpiryTimers.set(roomCode, timerId);
};

/* ─────────────────────────────────────────────────────────────
   SINGLE USER COUNTDOWN
───────────────────────────────────────────────────────────── */

const clearSingleUserCountdown = (roomCode) => {
  const countdown = singleUserCountdowns.get(roomCode);

  if (!countdown) return;

  clearInterval(countdown.intervalId);
  clearTimeout(countdown.timeoutId);

  singleUserCountdowns.delete(roomCode);
};

const startSingleUserCountdown = (roomCode) => {
  if (!roomExists(roomCode)) return;

  // Do not start another countdown if one is already running.
  if (singleUserCountdowns.has(roomCode)) return;

  // Admin countdown has priority.
  if (adminLeaveCountdowns.has(roomCode)) return;

  let remainingSeconds = 60;

  io.to(roomCode).emit("room:single-user-countdown", {
    remainingSeconds,
  });

  const intervalId = setInterval(() => {
    if (!roomExists(roomCode)) {
      clearSingleUserCountdown(roomCode);
      return;
    }

    const users = getRoomUsers(roomCode);

    // Someone rejoined.
    if (users.length > 1) {
      clearSingleUserCountdown(roomCode);

      io.to(roomCode).emit("room:single-user-countdown", {
        remainingSeconds: null,
      });

      return;
    }

    remainingSeconds -= 1;

    if (remainingSeconds > 0) {
      io.to(roomCode).emit("room:single-user-countdown", {
        remainingSeconds,
      });
    }
  }, 1000);

  const timeoutId = setTimeout(() => {
    if (!roomExists(roomCode)) {
      clearSingleUserCountdown(roomCode);
      return;
    }

    const users = getRoomUsers(roomCode);

    // Delete only if exactly one user remains.
    if (users.length === 1) {
      io.to(roomCode).emit("room:closed", {
        message:
          "Room deleted after 60 seconds with only one user remaining.",
      });

      removeRoomCompletely(roomCode);
    }

    clearSingleUserCountdown(roomCode);
  }, 60000);

  singleUserCountdowns.set(roomCode, {
    intervalId,
    timeoutId,
  });
};

/* ─────────────────────────────────────────────────────────────
   ADMIN LEAVE COUNTDOWN
───────────────────────────────────────────────────────────── */

const clearAdminLeaveCountdown = (roomCode) => {
  const countdown = adminLeaveCountdowns.get(roomCode);

  if (!countdown) return;

  clearInterval(countdown.intervalId);
  clearTimeout(countdown.timeoutId);

  adminLeaveCountdowns.delete(roomCode);
};

const startAdminLeaveCountdown = (roomCode) => {
  if (!roomExists(roomCode)) return;

  // Don't create duplicate admin countdowns.
  if (adminLeaveCountdowns.has(roomCode)) return;

  // Admin countdown replaces single-user countdown.
  clearSingleUserCountdown(roomCode);

  let remainingSeconds = 60;

  io.to(roomCode).emit("room:admin-countdown", {
    remainingSeconds,
  });

  const intervalId = setInterval(() => {
    if (!roomExists(roomCode)) {
      clearAdminLeaveCountdown(roomCode);
      return;
    }

    const users = getRoomUsers(roomCode);

    // Nobody remains.
    if (users.length === 0) {
      clearAdminLeaveCountdown(roomCode);
      removeRoomCompletely(roomCode);
      return;
    }

    // A user has rejoined.
    // The room stays alive, but because the admin is still gone,
    // the admin countdown continues.
    remainingSeconds -= 1;

    if (remainingSeconds > 0) {
      io.to(roomCode).emit("room:admin-countdown", {
        remainingSeconds,
      });
    }
  }, 1000);

  const timeoutId = setTimeout(() => {
    if (roomExists(roomCode)) {
      io.to(roomCode).emit("room:closed", {
        message:
          "Room deleted after 60 seconds because the Admin left.",
      });

      removeRoomCompletely(roomCode);
    }

    clearAdminLeaveCountdown(roomCode);
  }, 60000);

  adminLeaveCountdowns.set(roomCode, {
    intervalId,
    timeoutId,
  });
};

/* ─────────────────────────────────────────────────────────────
   REMOVE ROOM COMPLETELY
───────────────────────────────────────────────────────────── */

const removeRoomCompletely = (roomCode) => {
  clearSingleUserCountdown(roomCode);
  clearAdminLeaveCountdown(roomCode);
  clearRoomExpiryTimer(roomCode);

  removeRoom(roomCode);
};

/* ─────────────────────────────────────────────────────────────
   SYNC ROOM STATE
───────────────────────────────────────────────────────────── */

const syncRoomState = (roomCode) => {
  if (!roomExists(roomCode)) return;

  const users = getRoomUsers(roomCode);
  const room = getRoom(roomCode);

  if (!room) return;

  io.to(roomCode).emit("room:users", users);

  io.to(roomCode).emit(
    "room:typing",
    getTypingUsers(roomCode),
  );

  io.to(roomCode).emit("room:settings", {
    creatorId: room.creatorId,
    expiresAt: room.expiresAt,
  });

  /*
   * If the admin has already left, the admin countdown
   * controls the room lifecycle.
   */
  if (adminLeaveCountdowns.has(roomCode)) {
    clearSingleUserCountdown(roomCode);

    return;
  }

  /*
   * If exactly one user remains, start the
   * single-user countdown.
   */
  if (users.length === 1) {
    startSingleUserCountdown(roomCode);
    return;
  }

  /*
   * Two or more users means the room is active.
   */
  clearSingleUserCountdown(roomCode);

  io.to(roomCode).emit("room:single-user-countdown", {
    remainingSeconds: null,
  });
};

/* ─────────────────────────────────────────────────────────────
   HEALTH CHECK
───────────────────────────────────────────────────────────── */

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    name: "TempChat API",
  });
});

/* ─────────────────────────────────────────────────────────────
   CREATE ROOM
───────────────────────────────────────────────────────────── */

app.post("/api/rooms", (_req, res) => {
  const roomCode = createRoom();

  res.status(201).json({
    roomCode,
  });
});

/* ─────────────────────────────────────────────────────────────
   CHECK ROOM
───────────────────────────────────────────────────────────── */

app.get("/api/rooms/:roomCode", (req, res) => {
  const roomCode = req.params.roomCode
    .trim()
    .toUpperCase();

  if (!ROOM_CODE_REGEX.test(roomCode)) {
    return res.status(400).json({
      exists: false,
      message: "Invalid room code.",
    });
  }

  res.status(200).json({
    exists: roomExists(roomCode),
  });
});

/* ─────────────────────────────────────────────────────────────
   SOCKET.IO
───────────────────────────────────────────────────────────── */

io.on("connection", (socket) => {

  /* ───────────────────────────────────────────────────────────
     JOIN ROOM
  ─────────────────────────────────────────────────────────── */

  socket.on(
    "room:join",
    ({ roomCode, username, avatar }, callback) => {

      const normalizedCode = roomCode
        ?.trim()
        .toUpperCase();

      const cleanName = username
        ?.trim()
        .slice(0, 20);

      if (!normalizedCode || !ROOM_CODE_REGEX.test(normalizedCode)) {
        callback({
          ok: false,
          message: "Invalid room code.",
        });

        return;
      }

      if (!cleanName || cleanName.length < 2) {
        callback({
          ok: false,
          message: "Room code and username are required.",
        });

        return;
      }

      if (!roomExists(normalizedCode)) {
        callback({
          ok: false,
          message: "Room does not exist.",
        });

        return;
      }

      /*
       * If this username previously disconnected and
       * has not yet reached the disconnect timeout,
       * cancel that pending cleanup.
       */
      if (disconnectTimers.has(cleanName)) {
        clearTimeout(disconnectTimers.get(cleanName));
        disconnectTimers.delete(cleanName);
      }

      socket.join(normalizedCode);

      socket.data.roomCode = normalizedCode;
      socket.data.username = cleanName;
      socket.data.avatar =
        avatar || {
          style: "stick",
          color: "#38bdf8",
        };

      addUserToRoom(
        normalizedCode,
        socket.id,
        cleanName,
        socket.data.avatar,
      );

      setTyping(
        normalizedCode,
        socket.id,
        false,
      );

      /*
       * If the admin countdown was active and the
       * original admin reconnects, cancel it.
       */
      const room = getRoom(normalizedCode);

      if (
        room &&
        room.creatorId === socket.id
      ) {
        clearAdminLeaveCountdown(normalizedCode);

        io.to(normalizedCode).emit(
          "room:admin-countdown",
          {
            remainingSeconds: null,
          },
        );
      }

      syncRoomState(normalizedCode);

      /*
       * Send message history.
       */
      const history = getMessages(normalizedCode).map(
        (message) => ({
          ...message,
          reactions: serializeReactions(
            message.reactions,
          ),
        }),
      );

      socket.emit("room:messages", history);

      io.to(normalizedCode).emit(
        "room:system",
        {
          id: randomUUID(),
          type: "system",
          text: `${cleanName} joined the room`,
          createdAt: Date.now(),
        },
      );

      callback({
        ok: true,
        roomCode: normalizedCode,
      });
    },
  );

  /* ───────────────────────────────────────────────────────────
     SEND MESSAGE
  ─────────────────────────────────────────────────────────── */

  socket.on(
    "room:message",
    ({ text, file, replyTo }) => {

      const roomCode = socket.data.roomCode;

      const now = Date.now();

      const previousMessage =
        lastMessageTime.get(socket.id) || 0;

      /*
       * Small anti-spam protection.
       */
      if (now - previousMessage < 500) {
        return;
      }

      lastMessageTime.set(socket.id, now);

      if (
        !roomCode ||
        !roomExists(roomCode)
      ) {
        return;
      }

      const cleanText =
        text?.trim().slice(0, 1000) || "";

      if (!cleanText && !file) {
        return;
      }

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

        /*
         * Files remain available for the lifetime
         * of the room.
         */
        file: file
          ? {
              ...file,
              expiresAt: null,
            }
          : null,

        /*
         * Individual messages no longer expire.
         */
        expiresAt: null,

        createdAt: Date.now(),
      };

      addMessage(roomCode, message);

      io.to(roomCode).emit(
        "room:message",
        message,
      );
    },
  );

  /* ───────────────────────────────────────────────────────────
     TYPING
  ─────────────────────────────────────────────────────────── */

  socket.on(
    "room:typing",
    ({ isTyping }) => {

      const roomCode =
        socket.data.roomCode;

      if (
        !roomCode ||
        !roomExists(roomCode)
      ) {
        return;
      }

      setTyping(
        roomCode,
        socket.id,
        Boolean(isTyping),
      );

      io.to(roomCode).emit(
        "room:typing",
        getTypingUsers(roomCode),
      );
    },
  );

  /* ───────────────────────────────────────────────────────────
     ROOM EXPIRY SETTING
  ─────────────────────────────────────────────────────────── */

  socket.on(
    "room:set-expiry",
    ({ durationMs }) => {

      const roomCode =
        socket.data.roomCode;

      if (
        !roomCode ||
        !roomExists(roomCode)
      ) {
        return;
      }

      const room = getRoom(roomCode);

      if (!room) return;

      /*
       * Only room creator/admin can change expiry.
       */
      if (room.creatorId !== socket.id) {
        return;
      }

      const allowedDurations = new Set([
        0,
        5 * 60 * 1000,
        30 * 60 * 1000,
        60 * 60 * 1000,
      ]);

      if (!allowedDurations.has(durationMs)) {
        return;
      }

      if (durationMs === 0) {
        room.expiresAt = null;
        clearRoomExpiryTimer(roomCode);
      } else {
        room.expiresAt =
          Date.now() + durationMs;

        startRoomExpiryTimer(
          roomCode,
          durationMs,
        );
      }

      io.to(roomCode).emit(
        "room:settings",
        {
          creatorId: room.creatorId,
          expiresAt: room.expiresAt,
        },
      );
    },
  );

  /* ───────────────────────────────────────────────────────────
     SCREENSHOT / PRIVACY ALERT
  ─────────────────────────────────────────────────────────── */

  socket.on(
    "room:privacy-alert",
    ({ alertType }) => {

      const roomCode =
        socket.data.roomCode;

      const username =
        socket.data.username;

      if (
        !roomCode ||
        !roomExists(roomCode) ||
        !username
      ) {
        return;
      }

      if (alertType === "screenshot") {
        io.to(roomCode).emit(
          "room:system",
          {
            id: randomUUID(),
            type: "system",
            text: `${username} may have attempted a screenshot`,
            createdAt: Date.now(),
          },
        );
      }
    },
  );

  /* ───────────────────────────────────────────────────────────
     REACTIONS
  ─────────────────────────────────────────────────────────── */

  const ALLOWED_EMOJIS = new Set([
    "👍",
    "❤️",
    "😂",
    "😮",
    "😢",
    "🔥",
  ]);

  socket.on(
    "reaction:add",
    ({ messageId, emoji }) => {

      const roomCode =
        socket.data.roomCode;

      if (
        !roomCode ||
        !roomExists(roomCode)
      ) {
        return;
      }

      if (
        !messageId ||
        !emoji ||
        !ALLOWED_EMOJIS.has(emoji)
      ) {
        return;
      }

      const reactions = addReaction(
        roomCode,
        messageId,
        socket.data.username,
        emoji,
      );

      if (reactions !== null) {
        io.to(roomCode).emit(
          "reaction:update",
          {
            messageId,
            reactions,
          },
        );
      }
    },
  );

  socket.on(
    "reaction:remove",
    ({ messageId }) => {

      const roomCode =
        socket.data.roomCode;

      if (
        !roomCode ||
        !roomExists(roomCode)
      ) {
        return;
      }

      if (!messageId) return;

      const reactions = removeReaction(
        roomCode,
        messageId,
        socket.data.username,
      );

      if (reactions !== null) {
        io.to(roomCode).emit(
          "reaction:update",
          {
            messageId,
            reactions,
          },
        );
      }
    },
  );

  /* ───────────────────────────────────────────────────────────
     ACTUAL LEAVE
  ─────────────────────────────────────────────────────────── */

  const performActualLeave = (
    socket,
    isIntentional,
    isTimeout = false,
  ) => {

    const roomCode =
      socket.data.roomCode;

    const username =
      socket.data.username;

    const socketId = socket.id;

    lastMessageTime.delete(socketId);

    if (
      !roomCode ||
      !roomExists(roomCode)
    ) {
      return;
    }

    const room = getRoom(roomCode);

    if (!room) return;

    /*
     * Determine whether this socket is the admin
     * BEFORE removing it.
     */
    const isAdmin =
      room.creatorId === socketId;

    /*
     * Clear user's temporary data when intentionally
     * leaving.
     */
    if (isIntentional) {
      clearUserData(
        roomCode,
        username,
      );

      const history = getMessages(
        roomCode,
      ).map((message) => ({
        ...message,
        reactions:
          serializeReactions(
            message.reactions,
          ),
      }));

      io.to(roomCode).emit(
        "room:messages",
        history,
      );
    }

    /*
     * Remove user from the room.
     */
    removeUserFromRoom(
      roomCode,
      socketId,
    );

    setTyping(
      roomCode,
      socketId,
      false,
    );

    const usersLeft =
      getRoomUsers(roomCode);

    /*
     * Nobody is left.
     * Delete room immediately.
     */
    if (usersLeft.length === 0) {
      removeRoomCompletely(roomCode);
      return;
    }

    /*
     * ADMIN LEFT
     *
     * Admin leaving gets its own dedicated
     * 60-second countdown.
     */
    if (isIntentional && isAdmin) {

      /*
       * Cancel any single-user countdown.
       */
      clearSingleUserCountdown(
        roomCode,
      );

      io.to(roomCode).emit(
        "room:single-user-countdown",
        {
          remainingSeconds: null,
        },
      );

      io.to(roomCode).emit(
        "room:system",
        {
          id: randomUUID(),
          type: "system",
          text:
            `Admin ${username} left the room. ` +
            `Room will be destroyed in 60 seconds.`,
          createdAt: Date.now(),
        },
      );

      startAdminLeaveCountdown(
        roomCode,
      );

      /*
       * Update online users/settings WITHOUT
       * starting another single-user countdown.
       */
      const updatedRoom = getRoom(roomCode);

      if (updatedRoom) {
        io.to(roomCode).emit(
          "room:users",
          usersLeft,
        );

        io.to(roomCode).emit(
          "room:typing",
          getTypingUsers(roomCode),
        );

        io.to(roomCode).emit(
          "room:settings",
          {
            creatorId:
              updatedRoom.creatorId,
            expiresAt:
              updatedRoom.expiresAt,
          },
        );
      }

      return;
    }

    /*
     * NORMAL USER LEFT
     */
    if (!isTimeout || isIntentional) {
      io.to(roomCode).emit(
        "room:system",
        {
          id: randomUUID(),
          type: "system",
          text: `${username} left the room`,
          createdAt: Date.now(),
        },
      );
    }

    /*
     * Synchronize room state.
     *
     * If one user remains, this starts the
     * 60-second single-user countdown.
     */
    syncRoomState(roomCode);
  };

  /* ───────────────────────────────────────────────────────────
     INTENTIONAL LEAVE
  ─────────────────────────────────────────────────────────── */

  socket.on("room:leave", (callback) => {

    const username =
      socket.data.username;
  
    if (
      username &&
      disconnectTimers.has(username)
    ) {
      clearTimeout(
        disconnectTimers.get(username),
      );
  
      disconnectTimers.delete(username);
    }
  
    const roomCode =
      socket.data.roomCode;
  
    /*
     * Process the intentional leave FIRST.
     * This removes the user, clears their messages,
     * sends the leave notification, and starts the
     * single-user countdown if necessary.
     */
    performActualLeave(
      socket,
      true,
      false,
    );
  
    /*
     * Leave the Socket.IO room only AFTER the server
     * has processed the user's departure.
     */
    if (roomCode) {
      socket.leave(roomCode);
    }
  
    socket.data.roomCode = undefined;
    socket.data.username = undefined;
    socket.data.avatar = undefined;
  
    /*
     * Confirm to the client that the leave was processed.
     */
    if (typeof callback === "function") {
      callback({ ok: true });
    }
  });

  /* ───────────────────────────────────────────────────────────
     DISCONNECT
  ─────────────────────────────────────────────────────────── */

  socket.on("disconnect", () => {

    const roomCode =
      socket.data.roomCode;

    const username =
      socket.data.username;

    if (!roomCode || !username) {
      return;
    }

    /*
     * Give temporary network disconnects 30 seconds
     * to reconnect before treating them as a leave.
     */
    const timer = setTimeout(() => {

      /*
       * Socket may have reconnected or already
       * been cleaned up.
       */
      if (
        !socket.data.roomCode ||
        !socket.data.username
      ) {
        disconnectTimers.delete(username);
        return;
      }

      performActualLeave(
        socket,
        true,
        true,
      );

      disconnectTimers.delete(username);

    }, 30000);

    disconnectTimers.set(
      username,
      timer,
    );
  });
});

/* ─────────────────────────────────────────────────────────────
   START SERVER
───────────────────────────────────────────────────────────── */

const PORT =
  Number(process.env.PORT) || 4000;

server.listen(PORT, () => {
  console.log(
    `TempChat server listening on port ${PORT}`,
  );
});