import { createRoom, joinRoom, getRoom, setCategory, removePlayer } from "./services/roomService.js";

export default function registerSockets(io) {
  io.on("connection", (socket) => {
    console.log("🟢 Usuario conectado:", socket.id);

    // Crear sala
    socket.on("createRoom", (username) => {
      const room = createRoom(username, socket.id);
      socket.join(room.code);
      io.to(socket.id).emit("roomCreated", room);
    });

    // Unirse desde index
    socket.on("joinRoom", ({ code, username }) => {
      const result = joinRoom(code, username, socket.id);
      if (result.success) {
        socket.join(code);
        io.to(socket.id).emit("roomJoined", { code, username });
        io.to(code).emit("updateLobby", result.room);
      } else {
        io.to(socket.id).emit("errorMessage", result.message);
      }
    });

    // Entrar al lobby
    socket.on("joinLobby", ({ username, roomCode }) => {
      const room = getRoom(roomCode);
      if (!room) return;
      io.to(socket.id).emit("updateLobby", room);
    });

    // Cambiar categoría
    socket.on("setCategory", ({ roomCode, category }) => {
      const room = setCategory(roomCode, category);
      if (room) io.to(roomCode).emit("categoryUpdated", category);
      io.to(roomCode).emit("updateLobby", room);
    });

    // Iniciar juego
    socket.on("startGame", ({ roomCode }) => {
      const room = getRoom(roomCode);
      if (room && room.players.length === 2 && room.category) {
        room.gameStarted = true;
        io.to(roomCode).emit("gameStarted");
      }
    });

    // Salir de la sala
    socket.on("leaveRoom", ({ roomCode, username }) => {
      const room = removePlayer(roomCode, username);
      if (room) {
        io.to(roomCode).emit("updateLobby", room);
      } else {
        io.to(roomCode).emit("roomClosed");
      }
    });

    socket.on("disconnect", () => {
      console.log("🔴 Usuario desconectado:", socket.id);
    });
  });
}
