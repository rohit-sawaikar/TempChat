const rooms = new Map(); // roomCode -> room object

const randomToken = () => Math.random().toString(36).slice(2, 10).toUpperCase();

export const createRoom = () => {
  let code = randomToken();

  while (rooms.has(code)) {
    code = randomToken();
  }

  rooms.set(code, {
    creatorId: null,       // socketId of the room creator
    expiresAt: null,       // timestamp for room expiration
    users: new Map(),      // socketId -> user
    messages: [],          // chat messages
    typingUsers: new Set(),// socketIds currently typing
    createdAt: Date.now(),
  });

  return code;
};

export const roomExists = (roomCode) => rooms.has(roomCode);

export const getRoom = (roomCode) => rooms.get(roomCode);

export const removeRoom = (roomCode) => {
  rooms.delete(roomCode);
};

export const addUserToRoom = (roomCode, socketId, username, avatar) => {
  const room = rooms.get(roomCode);

  if (!room) return null;

  // First user to join becomes the creator
  if (room.creatorId === null) {
    room.creatorId = socketId;
  }

  room.users.set(socketId, {
    socketId,
    username,
    avatar,
    joinedAt: Date.now(),
  });

  return room.users.get(socketId);
};

export const removeUserFromRoom = (roomCode, socketId) => {
  const room = rooms.get(roomCode);

  if (!room) return null;

  const user = room.users.get(socketId);
  room.users.delete(socketId);
  room.typingUsers.delete(socketId);

  return user;
};

export const getRoomUsers = (roomCode) => {
  const room = rooms.get(roomCode);

  if (!room) return [];

  return Array.from(room.users.values());
};

export const addMessage = (roomCode, message) => {
  const room = rooms.get(roomCode);

  if (!room) return;

  room.messages.push(message);
  if (room.messages.length > 500) {
    room.messages.shift();
}
};

export const removeMessage = (roomCode, messageId) => {
  const room = rooms.get(roomCode);
  if (!room) return;

  room.messages = room.messages.filter((message) => message.id !== messageId);
};

export const expireMessageFile = (roomCode, messageId) => {
  const room = rooms.get(roomCode);
  if (!room) return false;

  const message = room.messages.find((item) => item.id === messageId);
  if (!message || !message.file) return false;

  message.file = null;
  return true;
};

export const getMessages = (roomCode) => {
  const room = rooms.get(roomCode);

  if (!room) return [];

  return room.messages;
};

export const setTyping = (roomCode, socketId, isTyping) => {
  const room = rooms.get(roomCode);

  if (!room) return;

  if (isTyping) {
    room.typingUsers.add(socketId);
    return;
  }

  room.typingUsers.delete(socketId);
};

export const getTypingUsers = (roomCode) => {
  const room = rooms.get(roomCode);

  if (!room) return [];

  return Array.from(room.typingUsers)
    .map((socketId) => room.users.get(socketId))
    .filter(Boolean)
    .map((user) => ({ socketId: user.socketId, username: user.username, avatar: user.avatar }));
};

/* ── Reaction helpers ──────────────────────────────────────────────── */

/**
 * Convert a message's reactions map (emoji → Set<socketId>) into a
 * plain object suitable for JSON serialization (emoji → string[]).
 */
export const serializeReactions = (reactionsMap) => {
  if (!reactionsMap) return {};
  const out = {};
  for (const [emoji, socketIds] of Object.entries(reactionsMap)) {
    const arr = socketIds instanceof Set ? Array.from(socketIds) : socketIds;
    if (arr.length > 0) out[emoji] = arr;
  }
  return out;
};

/**
 * Add or change a user's reaction on a message.
 * Each user may have at most ONE reaction per message.
 * Returns the updated serialized reactions, or null if message not found.
 */
export const addReaction = (roomCode, messageId, socketId, emoji) => {
  const room = rooms.get(roomCode);
  if (!room) return null;

  const message = room.messages.find((m) => m.id === messageId);
  if (!message) return null;

  if (!message.reactions) message.reactions = {};

  // Remove any existing reaction by this user first
  for (const [existingEmoji, userSet] of Object.entries(message.reactions)) {
    if (userSet instanceof Set && userSet.has(socketId)) {
      userSet.delete(socketId);
      if (userSet.size === 0) delete message.reactions[existingEmoji];
    }
  }

  // Add the new reaction
  if (!message.reactions[emoji]) {
    message.reactions[emoji] = new Set();
  }
  message.reactions[emoji].add(socketId);

  return serializeReactions(message.reactions);
};

/**
 * Remove a user's reaction from a message.
 * Returns the updated serialized reactions, or null if message not found.
 */
export const removeReaction = (roomCode, messageId, socketId) => {
  const room = rooms.get(roomCode);
  if (!room) return null;

  const message = room.messages.find((m) => m.id === messageId);
  if (!message || !message.reactions) return serializeReactions({});

  for (const [emoji, userSet] of Object.entries(message.reactions)) {
    if (userSet instanceof Set && userSet.has(socketId)) {
      userSet.delete(socketId);
      if (userSet.size === 0) delete message.reactions[emoji];
    }
  }

  return serializeReactions(message.reactions);
};

export const clearUserData = (roomCode, username) => {
  const room = rooms.get(roomCode);
  if (!room) return;

  // Remove messages authored by the user
  room.messages = room.messages.filter((m) => m.username !== username);

  // Remove reactions made by the user from ALL remaining messages
  for (const m of room.messages) {
    if (m.reactions) {
      for (const [emoji, userSet] of Object.entries(m.reactions)) {
        if (userSet instanceof Set && userSet.has(username)) {
          userSet.delete(username);
          if (userSet.size === 0) delete m.reactions[emoji];
        }
      }
    }
  }
};

