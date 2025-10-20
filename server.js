import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Para poder usar __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const allPlayers = JSON.parse(
    fs.readFileSync(path.join(__dirname, "src/data/basketball.json"), "utf8")
  );
  

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));
app.use('/data', express.static(path.join(__dirname, "src/data")));



const rooms = {}; // { code: { host: id, players: [], category: 'futbol' } }

function generateCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

io.on("connection", (socket) => {
  console.log("Cliente conectado:", socket.id);

  socket.on("createRoom", (name) => {
    const code = generateCode();
    rooms[code] = {
      host: socket.id,
      players: [{ id: socket.id, name, isHost: true }],
      category: "futbol",
    };
    socket.join(code);
    io.to(socket.id).emit("roomCreated", code);
    io.to(code).emit("updateLobby", rooms[code]);
  });

  socket.on("joinRoom", ({ playerName, roomCode }) => {
    const room = rooms[roomCode];
    if (!room) return socket.emit("errorMsg", "Sala no encontrada");
    if (room.players.length >= 2)
      return socket.emit("errorMsg", "La sala está llena");

    room.players.push({ id: socket.id, name: playerName });
    socket.join(roomCode);
    io.to(socket.id).emit("roomJoined", {
      code: roomCode,
      players: room.players,
      category: room.category,
      host: room.host,
    });
    io.to(roomCode).emit("updateLobby", room);
  });

  socket.on("changeCategory", ({ roomCode, category }) => {
    const room = rooms[roomCode];
    if (room && room.host === socket.id) {
      room.category = category;
      io.to(roomCode).emit("updateLobby", room);
    }
  });

  socket.on("startGame", (roomCode) => {
    const room = rooms[roomCode];
    if (!room || socket.id !== room.host) return;
  
    // 1) Elegir 24 jugadores de los 50 (para la grilla)
    const shuffled = shuffleArray(allPlayers); // allPlayers puede estar cargado en server o leído de JSON
    const gridPlayers = shuffled.slice(0, 24);
  
    // 2) Asignar jugador aleatorio a cada jugador en la sala
    room.players.forEach(p => {
      const i = Math.floor(Math.random() * gridPlayers.length);
      p.assignedPlayer = gridPlayers[i];
    });
  
    // 3) Emitir a cada jugador su info + grilla común
    room.players.forEach(p => {
      io.to(p.id).emit("gameStarted", {
        gridPlayers,
        assignedPlayer: p.assignedPlayer,
        category: room.category
      });
    });
  });
  

  socket.on("leaveRoom", (roomCode) => {
    const room = rooms[roomCode];
    if (!room) return;
  
    // Quitar jugador
    room.players = room.players.filter(p => p.id !== socket.id);
  
    // Si no quedan jugadores, eliminar sala
    if (room.players.length === 0) {
      delete rooms[roomCode];
      console.log(`Sala ${roomCode} eliminada (vacía).`);
    } else {
      // Si se fue el host, asignar nuevo host
      if (room.host === socket.id) {
        room.host = room.players[0].id;
        room.players[0].isHost = true;
      }
      io.to(roomCode).emit("updateLobby", room);
    }
  
    socket.leave(roomCode);
  });
  

  socket.on("disconnect", () => {
    for (const code in rooms) {
      const room = rooms[code];
      const player = room.players.find(p => p.id === socket.id);
      if (!player) continue;
  
      room.players = room.players.filter(p => p.id !== socket.id);
  
      if (room.players.length === 0) {
        delete rooms[code];
        console.log(`Sala ${code} eliminada (vacía).`);
      } else {
        if (room.host === socket.id) {
          room.host = room.players[0].id;
          room.players[0].isHost = true;
        }
        io.to(code).emit("updateLobby", room);
      }
    }
  });
  
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));

function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }