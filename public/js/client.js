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
const waitingMessage = document.getElementById("waitingMessage");

const gameCategory = document.getElementById("gameCategoryDisplay");
const exitGameBtn = document.getElementById("exitGameBtn");

// ====== NAVEGACIÓN DE PANTALLAS ======
function showScreen(screenToShow) {
    document.querySelectorAll(".screen").forEach(s => {
      s.classList.remove("active");
      s.style.display = "none";
    });
    screenToShow.style.display = "block";
    screenToShow.classList.add("active");
  }

// ====== UTILIDADES ======
function showNotification(message, type = 'info') {
  // Crear notificación temporal
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'error' ? 'var(--danger-color)' : 'var(--success-color)'};
    color: white;
    padding: 1rem 1.5rem;
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    z-index: 1000;
    animation: slideIn 0.3s ease;
  `;
  
  document.body.appendChild(notification);
  
  // Remover después de 3 segundos
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function addButtonLoading(button) {
  button.classList.add('loading');
  button.disabled = true;
}

function removeButtonLoading(button) {
  button.classList.remove('loading');
  button.disabled = false;
}

// Agregar estilos para las notificaciones
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(notificationStyles);
  

// ====== EVENTOS ======
createRoomBtn.onclick = () => {
  playerName = playerInput.value.trim();
  if (!playerName) {
    showNotification("Por favor, ingresa tu nombre", 'error');
    playerInput.focus();
    return;
  }
  
  if (playerName.length < 2) {
    showNotification("El nombre debe tener al menos 2 caracteres", 'error');
    return;
  }
  
  addButtonLoading(createRoomBtn);
  socket.emit("createRoom", playerName);
};

joinRoomBtn.onclick = () => {
  playerName = playerInput.value.trim();
  roomCode = joinCodeInput.value.trim().toUpperCase();
  
  if (!playerName) {
    showNotification("Por favor, ingresa tu nombre", 'error');
    playerInput.focus();
    return;
  }
  
  if (!roomCode) {
    showNotification("Por favor, ingresa el código de sala", 'error');
    joinCodeInput.focus();
    return;
  }
  
  if (roomCode.length !== 4) {
    showNotification("El código debe tener 4 caracteres", 'error');
    return;
  }
  
  addButtonLoading(joinRoomBtn);
  socket.emit("joinRoom", { playerName, roomCode });
};

// Permitir enviar con Enter
playerInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    if (joinCodeInput.value.trim()) {
      joinRoomBtn.click();
    } else {
      createRoomBtn.click();
    }
  }
});

joinCodeInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    joinRoomBtn.click();
  }
});

// Formatear código de sala automáticamente
joinCodeInput.addEventListener('input', (e) => {
  e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
});

leaveRoomBtn.onclick = () => {
    if (confirm('¿Estás seguro que quieres salir de la sala?')) {
      socket.emit("leaveRoom", roomCode);
      roomCode = "";
      isHost = false;
      showScreen(indexScreen);
      showNotification("Has salido de la sala", 'info');
    }
  };
  

categorySelect.onchange = () => {
  if (isHost) {
    socket.emit("changeCategory", { roomCode, category: categorySelect.value });
  }
};

startGameBtn.onclick = () => {
  if (isHost) {
    addButtonLoading(startGameBtn);
    socket.emit("startGame", roomCode);
  }
};

exitGameBtn.onclick = () => {
  if (confirm('¿Quieres salir del juego y volver al inicio?')) {
    showScreen(indexScreen);
    roomCode = "";
    isHost = false;
  }
};

// ====== SOCKET HANDLERS ======
socket.on("roomCreated", (code) => {
  roomCode = code;
  isHost = true;
  roomCodeDisplay.textContent = code;
  categorySelect.disabled = false;
  startGameBtn.disabled = false;
  
  removeButtonLoading(createRoomBtn);
  showScreen(lobbyScreen);
  showNotification(`¡Sala creada! Código: ${code}`, 'success');
  
  // Agregar funcionalidad de copiar código
  setupCopyButton();
});

socket.on("roomJoined", ({ code, players, category, host }) => {
  roomCode = code;
  isHost = host === socket.id;
  roomCodeDisplay.textContent = code;
  categorySelect.disabled = !isHost;
  startGameBtn.disabled = !isHost || players.length < 2;
  
  removeButtonLoading(joinRoomBtn);
  updatePlayerList(players);
  showScreen(lobbyScreen);
  showNotification(`¡Te uniste a la sala ${code}!`, 'success');
  
  // Agregar funcionalidad de copiar código
  setupCopyButton();
});

socket.on("updateLobby", ({ players, category }) => {
  updatePlayerList(players);
  categorySelect.value = category;
  
  // Actualizar estado del botón de inicio
  if (isHost) {
    startGameBtn.disabled = players.length < 2;
  }
});

function updatePlayerList(players) {
  playerList.innerHTML = "";
  
  players.forEach(p => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="player-info">
        <i class="fas ${p.isHost ? 'fa-crown' : 'fa-user'}"></i>
        <span>${p.name}</span>
        ${p.isHost ? '<span class="host-badge">Anfitrión</span>' : ''}
      </div>
    `;
    playerList.appendChild(li);
  });
  
  // Mostrar/ocultar mensaje de espera
  if (waitingMessage) {
    waitingMessage.style.display = players.length < 2 ? 'flex' : 'none';
  }
}

// Función para configurar el botón de copiar código
function setupCopyButton() {
  const copyButton = document.querySelector('.copy-code');
  if (copyButton && !copyButton.hasListener) {
    copyButton.hasListener = true;
    copyButton.onclick = async () => {
      try {
        await navigator.clipboard.writeText(roomCode);
        showNotification('¡Código copiado!', 'success');
        
        // Animación visual
        copyButton.style.transform = 'scale(1.2)';
        setTimeout(() => {
          copyButton.style.transform = 'scale(1)';
        }, 200);
      } catch (err) {
        // Fallback para navegadores que no soportan clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = roomCode;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('¡Código copiado!', 'success');
      }
    };
  }
}





// ====== GAME LOGIC ======
let allPlayers = [];  // lista de jugadores cargados
let gridPlayers = []; // lista de jugadores seleccionados para la grilla
let yourAssignedPlayer = null;

// Al recibir "gameStarted"
socket.on("gameStarted", (data) => {
    removeButtonLoading(startGameBtn);
    showScreen(gameScreen);
    
    const categoryEmoji = data.category === 'basquet' ? '🏀' : '⚽';
    const categoryName = data.category === 'basquet' ? 'Básquet' : 'Fútbol';
    gameCategory.textContent = `${categoryEmoji} ${categoryName}`;

    gridPlayers = data.gridPlayers;
    yourAssignedPlayer = data.assignedPlayer;

    document.getElementById("yourPlayerName").textContent = yourAssignedPlayer.name;
    document.getElementById("yourPlayerImage").src = yourAssignedPlayer.image;

    renderGrid();
    showNotification('¡El juego ha comenzado!', 'success');
});

function renderGrid() {
    const gridContainer = document.getElementById("gridContainer");
    gridContainer.innerHTML = "";
  
    gridPlayers.forEach((p, index) => {
      const cell = document.createElement("div");
      cell.classList.add("cell");
      cell.dataset.id = p.id;
      cell.style.animationDelay = `${index * 0.1}s`;
      cell.innerHTML = `
        <img src="${p.image}" alt="${p.name}" loading="lazy" />
        <span>${p.name}</span>
      `;
  
      // Toggle overlay con efectos mejorados
      cell.addEventListener("click", () => {
        cell.classList.toggle("discarded");
        
        // Feedback haptico en dispositivos móviles
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
        
        // Contador de jugadores restantes
        updateRemainingCount();
      });
  
      gridContainer.appendChild(cell);
    });
    
    // Agregar contador inicial
    updateRemainingCount();
  }
  
  function updateRemainingCount() {
    const remaining = document.querySelectorAll('.cell:not(.discarded)').length;
    let counter = document.querySelector('.remaining-counter');
    
    if (!counter) {
      counter = document.createElement('div');
      counter.className = 'remaining-counter';
      counter.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--glass-bg);
        backdrop-filter: blur(10px);
        border: 1px solid var(--glass-border);
        border-radius: var(--radius-lg);
        padding: var(--space-md) var(--space-lg);
        color: var(--text-primary);
        font-weight: 600;
        box-shadow: var(--shadow-md);
        z-index: 100;
      `;
      document.body.appendChild(counter);
    }
    
    counter.innerHTML = `
      <i class="fas fa-users"></i>
      <span>Jugadores restantes: ${remaining}</span>
    `;
  }
  

// Manejo de errores
socket.on("errorMsg", (message) => {
  removeButtonLoading(createRoomBtn);
  removeButtonLoading(joinRoomBtn);
  showNotification(message, 'error');
});

// Manejo de desconexión
socket.on("disconnect", () => {
  showNotification('Conexión perdida. Intentando reconectar...', 'error');
});

socket.on("connect", () => {
  if (roomCode) {
    showNotification('¡Conexión restaurada!', 'success');
  }
});

// Función auxiliar shuffle
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Inicialización cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
  // Enfocar el campo de nombre al cargar
  playerInput.focus();
  
  // Mostrar notificación de bienvenida
  setTimeout(() => {
    showNotification('¡Bienvenido a GuessWho! 🎭', 'success');
  }, 1000);
});

// Agregar estilos adicionales para el contador
const additionalStyles = document.createElement('style');
additionalStyles.textContent = `
  .player-info {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }
  
  .host-badge {
    background: linear-gradient(135deg, var(--warning-color), #ff9a56);
    color: white;
    font-size: 0.75rem;
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    font-weight: 600;
    margin-left: auto;
  }
  
  .remaining-counter {
    transition: all var(--transition-fast);
  }
  
  .remaining-counter:hover {
    transform: translateX(-50%) translateY(-2px);
  }
  
  .cell {
    animation: slideUp 0.6s ease backwards;
  }
  
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
document.head.appendChild(additionalStyles);

// Función para limpiar al salir del juego
function cleanupGame() {
  const counter = document.querySelector('.remaining-counter');
  if (counter) {
    counter.remove();
  }
}

// Limpiar cuando se sale del juego
const originalShowScreen = showScreen;
showScreen = function(screenToShow) {
  if (screenToShow === indexScreen) {
    cleanupGame();
  }
  originalShowScreen(screenToShow);
};