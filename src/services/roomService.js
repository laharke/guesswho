import { generateCode } from "../utils/generateCode.js";

const rooms = new Map();

export function createRoom(username, socketId) {
  const code = generateCode();
  const room = {
    code,
    players: [
      {
        name: username,
        socketId,
        ready: false,
        isHost: true,
      },
    ],
    category: null,
    gameStarted: false,
  };
  rooms.set(code, room);
  return room;
}

export function joinRoom(code, username, socketId) {
  const room = rooms.get(code);
  if (!room) return { success: false, message: "Sala no encontrada" };
  if (room.players.length >= 2) return { success: false, message: "Sala llena" };

  room.players.push({
    name: username,
    socketId,
    ready: false,
    isHost: false,
  });
  return { success: true, room };
}

export function getRoom(code) {
  return rooms.get(code);
}

export function setCategory(code, category) {
  const room = rooms.get(code);
  if (!room) return null;
  room.category = category;
  return room;
}

export function removePlayer(code, username) {
  const room = rooms.get(code);
  if (!room) return null;

  room.players = room.players.filter((p) => p.name !== username);
  if (room.players.length === 0) {
    rooms.delete(code);
    return null;
  }

  // Si se va el host, asignamos el primero como nuevo host
  if (!room.players.some((p) => p.isHost)) {
    room.players[0].isHost = true;
  }

  return room;
}
