const socket = io();
let playerName = "";
let roomCode = "";
let isHost = false;

// ====== ELEMENTOS ======
const indexScreen = document.getElementById("index-screen");
const lobbyScreen = document.getElementById("lobby-screen");
const gameScreen = document.getElementById("game-screen");

const playerInput = document.getElementById("playerName");
const joinCodeInput = document.getElementById("joinCode");
const createRoomBtn = document.getElementById("createRoomBtn");
const joinRoomBtn = document.getElementById("joinRoomBtn");

const roomCodeDisplay = document.getElementById("roomCodeDisplay");
const playerList = document.getElementById("playerList");
const categorySelect = document.getElementById("categorySelect");
const startGameBtn = document.getElementById("startGameBtn");
const leaveRoomBtn = document.getElementById("leaveRoomBtn");

const gameCategory = document.getElementById("gameCategoryDisplay");
const exitGameBtn = document.getElementById("exitGameBtn");

// ====== NAVEGACIÓN DE PANTALLAS ======
function showScreen(screenToShow) {
    document.querySelectorAll(".screen").forEach(s => {
      s.style.display = "none";
    });
    screenToShow.style.display = "block";
  }
  

// ====== EVENTOS ======
createRoomBtn.onclick = () => {
  playerName = playerInput.value.trim();
  if (!playerName) return alert("Ingresá un nombre.");
  socket.emit("createRoom", playerName);
};

joinRoomBtn.onclick = () => {
  playerName = playerInput.value.trim();
  roomCode = joinCodeInput.value.trim();
  if (!playerName || !roomCode) return alert("Completá nombre y código.");
  socket.emit("joinRoom", { playerName, roomCode });
};

leaveRoomBtn.onclick = () => {
    socket.emit("leaveRoom", roomCode);
    roomCode = "";
    isHost = false;
    showScreen(indexScreen);
  };
  

categorySelect.onchange = () => {
  if (isHost) {
    socket.emit("changeCategory", { roomCode, category: categorySelect.value });
  }
};

startGameBtn.onclick = () => {
  if (isHost) socket.emit("startGame", roomCode);
};

exitGameBtn.onclick = () => {
  showScreen(indexScreen);
};

// ====== SOCKET HANDLERS ======
socket.on("roomCreated", (code) => {
  roomCode = code;
  isHost = true;
  roomCodeDisplay.textContent = code;
  categorySelect.disabled = false;
  startGameBtn.disabled = false;
  showScreen(lobbyScreen);
});

socket.on("roomJoined", ({ code, players, category, host }) => {
  roomCode = code;
  isHost = host === socket.id;
  roomCodeDisplay.textContent = code;
  categorySelect.disabled = !isHost;
  startGameBtn.disabled = !isHost;
  updatePlayerList(players);
  showScreen(lobbyScreen);
});

socket.on("updateLobby", ({ players, category }) => {
  updatePlayerList(players);
  categorySelect.value = category;
});

function updatePlayerList(players) {
  playerList.innerHTML = "";
  players.forEach(p => {
    const li = document.createElement("li");
    li.textContent = p.name + (p.isHost ? " 👑" : "");
    playerList.appendChild(li);
  });
}





// game logic

// + arriba en client.js
let allPlayers = [];  // lista de 50 jugadores cargados
let gridPlayers = []; // lista de 25 jugadores seleccionados para la grilla
let yourAssignedPlayer = null;

// Al recibir “gameStarted”
socket.on("gameStarted", (data) => {
    showScreen(gameScreen);
    gameCategory.textContent = `Categoría: ${data.category}`;

    gridPlayers = data.gridPlayers;
    yourAssignedPlayer = data.assignedPlayer;

    document.getElementById("yourPlayerName").textContent = yourAssignedPlayer.name;
    document.getElementById("yourPlayerImage").src = yourAssignedPlayer.image;

    renderGrid();
});

function renderGrid() {
    const gridContainer = document.getElementById("gridContainer");
    gridContainer.innerHTML = "";
  
    gridPlayers.forEach(p => {
      const cell = document.createElement("div");
      cell.classList.add("cell");
      cell.dataset.id = p.id;
      cell.innerHTML = `
        <img src="${p.image}" alt="${p.name}" />
        <span>${p.name}</span>
      `;
  
      // Toggle overlay
      cell.addEventListener("click", () => {
        cell.classList.toggle("discarded");
      });
  
      gridContainer.appendChild(cell);
    });
  }
  

// Función para preparar el juego
function setupGame(allPlayers) {
  // 1) Seleccionar aleatoriamente tu jugador asignado
  const i = Math.floor(Math.random() * allPlayers.length);
  yourAssignedPlayer = allPlayers[i];
  
  document.getElementById("yourPlayerName").textContent = yourAssignedPlayer.name;
  document.getElementById("yourPlayerImage").src = yourAssignedPlayer.image;

  // 2) Elegir 25 jugadores únicos de los 50 para la grilla
  gridPlayers = shuffleArray(allPlayers).slice(0,24);
  console.log(gridPlayers);

  // 3) Renderizar la grilla
  const gridContainer = document.getElementById("gridContainer");
  gridContainer.innerHTML = ""; // limpiar
  gridPlayers.forEach(p => {
    const cell = document.createElement("div");
    cell.classList.add("cell");
    cell.dataset.id = p.id;
    cell.innerHTML = `
      <img src="${p.image}" alt="${p.name}" />
      <span>${p.name}</span>
    `;
    // Le tengo que agregar un on click a cada CELL que les agregare una CLASE que va ser el BLUUR ON/OFF
     // ===== CLICK PARA TOGGLE =====
    cell.addEventListener("click", () => {
        cell.classList.toggle("discarded");
    });

    


    gridContainer.appendChild(cell);
  });
  
}

// Función auxiliar shuffle
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function toogleBlur(){

}