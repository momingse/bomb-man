import { logger } from "./logger.js";
import User from "./models/User.js";

const GRID_WIDTH = 15;
const GRID_HEIGHT = 13;
const BORDER_CONDITION = (x, y) =>
  x === 0 || y === 0 || x === GRID_WIDTH - 1 || y === GRID_HEIGHT - 1;
const INDESTRUCTIBLE_WALL = (x, y) => x % 2 === 0 && y % 2 === 0;
const START_POSITIONS = [
  [1, 1],
  [GRID_WIDTH - 2, 1],
  [1, GRID_HEIGHT - 2],
  [GRID_WIDTH - 2, GRID_HEIGHT - 2],
];
const PLAYERS_COLORS = ["#e83b3b", "#3b82e8", "#50c878", "#ffcc00"];
const HALF = 0.47;

// State Stores
const rooms = {};
const onlinePlayers = {};
const gameStates = {};
const gameLoops = {};

const emitRooms = (io) => io.emit("rooms", Object.values(rooms));
const emitOnline = (io) =>
  io.emit("onlinePlayers", Object.values(onlinePlayers));

export const socketHandler = (io) => {
  logger.info("Socket handler started");

  io.on("connection", (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    const emitUpdatedRooms = () => emitRooms(io);
    const emitUpdatedOnline = () => emitOnline(io);

    // Clean up helper
    const removePlayer = () => {
      const player = onlinePlayers[socket.id];
      if (!player) return;
      delete onlinePlayers[socket.id];
      emitUpdatedOnline();
    };

    socket.on("register", ({ username, avatar }) => {
      if (onlinePlayers[socket.id]) return;
      logger.info(`User ${username} registered`);
      onlinePlayers[socket.id] = { username, avatar };
      emitUpdatedOnline();
      emitUpdatedRooms();
    });

    socket.on("createRoom", ({ name, maxPlayers }) => {
      const player = onlinePlayers[socket.id];
      if (!player) return;
      logger.info(`Room ${name} created by ${player.username}`);
      // Generate a unique room ID
      const roomId = new Date().getTime().toString();
      rooms[roomId] = {
        id: roomId,
        name,
        host: player.username,
        sockets: [socket.id], // Track socket IDs directly
        players: [
          {
            username: player.username,
            avatar: player.avatar,
            isReady: true,
            isHost: true,
          },
        ],
        maxPlayers,
        started: false,
      };
      emitUpdatedRooms();
      socket.emit("roomCreated", rooms[roomId]);
    });

    socket.on("joinRoom", (roomId) => {
      const room = rooms[roomId];
      const player = onlinePlayers[socket.id];
      if (
        !player ||
        !room ||
        room.started ||
        room.players.length >= room.maxPlayers
      )
        return;
      if (room.players.some((p) => p.username === player.username)) return;
      logger.info(`User ${player.username} joined room ${roomId}`);
      room.sockets.push(socket.id);
      room.players.push({
        username: player.username,
        avatar: player.avatar,
        isReady: false,
        isHost: false,
      });
      emitUpdatedRooms();
    });

    socket.on("leaveRoom", () => {
      const player = onlinePlayers[socket.id];
      if (!player) return;
      const room = Object.values(rooms).find((r) =>
        r.players.some((p) => p.username === player.username),
      );
      if (!room) return;
      logger.info(`User ${player.username} left room`);
      // Remove socket and player
      room.sockets = room.sockets.filter((id) => id !== socket.id);
      room.players = room.players.filter((p) => p.username !== player.username);
      // Reassign host if needed
      if (room.players.length && room.host === player.username) {
        const newHost = room.players[0];
        room.host = newHost.username;
        newHost.isHost = true;
        newHost.isReady = true;
      }
      if (!room.players.length) delete rooms[room.id];
      emitUpdatedRooms();
    });

    socket.on("toggleReady", ({ roomId, isReady }) => {
      const player = onlinePlayers[socket.id];
      const room = rooms[roomId];
      if (!player || !room) return;
      const participant = room.players.find(
        (p) => p.username === player.username,
      );
      if (!participant) return;
      participant.isReady = isReady;
      emitUpdatedRooms();
    });

    socket.on("hostStartGame", ({ roomId }) => {
      const room = rooms[roomId];
      const player = onlinePlayers[socket.id];
      if (!player || !room || room.host !== player.username) return;
      logger.info(`User ${player.username} started game in room ${roomId}`);

      // Initialize game state
      const map = generateGameMap();
      gameStates[roomId] = createInitialGameState(room.players, map);
      room.started = true;
      emitUpdatedRooms();

      // Notify each player
      room.sockets.forEach((sid) => {
        io.to(sid).emit("startGame", { roomId, gameState: gameStates[roomId] });
      });

      startGameLoop(roomId, io);
    });

    // Handle player input
    socket.on("playerInput", ({ roomId, input }) => {
      if (!gameStates[roomId]) return;

      const username = onlinePlayers[socket.id].username;
      const playerIndex = gameStates[roomId].players.findIndex(
        (p) => p.username === username,
      );

      if (playerIndex === -1 || !gameStates[roomId].players[playerIndex].alive)
        return;

      // Store player's input to be processed in the game loop
      if (!gameStates[roomId].playerInputs) {
        gameStates[roomId].playerInputs = {};
      }

      gameStates[roomId].playerInputs[username] = input;
    });

    // Handle bomb placement
    socket.on("placeBomb", ({ roomId, x, y }) => {
      if (!gameStates[roomId]) return;

      const username = onlinePlayers[socket.id].username;
      const playerIndex = gameStates[roomId].players.findIndex(
        (p) => p.username === username,
      );

      if (playerIndex === -1 || !gameStates[roomId].players[playerIndex].alive)
        return;

      const player = gameStates[roomId].players[playerIndex];

      // Check if player can place more bombs (based on maxBombs)
      const activeBombs = gameStates[roomId].bombs.filter(
        (bomb) => bomb.playerId === playerIndex,
      );
      if (activeBombs.length >= player.maxBombs) return;

      // Round position to grid
      const gridX = Math.round(x);
      const gridY = Math.round(y);

      // Check if there's already a bomb at this position
      if (
        gameStates[roomId].bombs.some(
          (bomb) =>
            Math.round(bomb.x) === gridX && Math.round(bomb.y) === gridY,
        )
      ) {
        return;
      }

      // check if there is player next to the bomb
      const possiblePositions = [
        [gridX - 1, gridY],
        [gridX + 1, gridY],
        [gridX, gridY - 1],
        [gridX, gridY + 1],
        [gridX - 1, gridY - 1],
        [gridX - 1, gridY + 1],
        [gridX + 1, gridY - 1],
        [gridX + 1, gridY + 1],
      ];

      const possibleCollisionPlayerIndex = gameStates[roomId].players.reduce(
        (acc, player, index) => {
          if (
            possiblePositions.some(
              ([px, py]) =>
                px === Math.round(player.x) && py === Math.round(player.y),
            )
          ) {
            return [...acc, index];
          }

          return acc;
        },
        [],
      );

      // Create the bomb object
      const newBomb = {
        x: gridX,
        y: gridY,
        playerId: playerIndex,
        timer: 3, // 3 second timer
        range: player.blastRange,
        // This player is initially allowed to walk over this bomb
        passThroughPlayers: [playerIndex, ...possibleCollisionPlayerIndex],
      };

      // Place the bomb
      gameStates[roomId].bombs.push(newBomb);

      // Add this bomb to the player's active bombs
      if (!player.activeBombs) player.activeBombs = [];
      player.activeBombs.push(newBomb);

      // Update player stats
      gameStates[roomId].players[playerIndex].bombsPlaced =
        (gameStates[roomId].players[playerIndex].bombsPlaced || 0) + 1;

      // Broadcast bomb placement to all players in the room
      broadcastGameStateUpdate(roomId, io);
    });

    socket.on("cheatMode", ({ roomId, input }) => {
      if (!gameStates[roomId]) return;

      const username = onlinePlayers[socket.id].username;
      const playerIndex = gameStates[roomId].players.findIndex(
        (p) => p.username === username,
      );

      if (playerIndex === -1 || !gameStates[roomId].players[playerIndex].alive)
        return;

      gameStates[roomId].players[playerIndex].cheated = input.cheat;
      broadcastGameStateUpdate(roomId, io);
    });

    socket.on("exitGame", ({ roomId }) => {
      logger.info(
        `User ${onlinePlayers[socket.id]?.username} exited game in room ${roomId}`,
      );

      const player = onlinePlayers[socket.id];
      if (!player) {
        logger.warn(`exitgame: no such player for socket ${socket.id}`);
        return;
      }

      const room = rooms[roomId];
      const gameState = gameStates[roomId];

      // 1) If the room or gameState doesn't exist, nothing to do
      if (!room || !gameState) {
        logger.warn(`exitgame: room or gameState not found for ${roomId}`);
        return;
      }

      // 2) Mark player as disconnected and dead in the game state
      const idx = gameState.players.findIndex(
        (p) => p.username === player.username,
      );
      if (idx !== -1) {
        gameState.players[idx].disconnected = true;
        gameState.players[idx].alive = false;
      }

      // 3) Remove from room's player list
      room.players = room.players.filter((p) => p.username !== player.username);

      // 4) Broadcast updated room list and game state
      io.emit("rooms", Object.values(rooms));
      broadcastGameStateUpdate(roomId, io);

      // 5) If ≤1 players remain alive, end the game
      const aliveCount = gameState.players.filter((p) => p.alive).length;
      if (aliveCount <= 1) {
        const winner = gameState.players.find((p) => p.alive);
        if (winner) {
          winner.score += 500;
        }

        io.to(roomId).emit("gameOver", {
          winner: winner?.username || null,
          playerStats: gameState.players,
        });

        // Clean up loop & state
        stopGameLoop(roomId);
        delete gameStates[roomId];
        room.started = false;
        io.emit("rooms", Object.values(rooms));
      }
    });

    socket.on("overtime", ({ roomId }) => {
      const gameState = gameStates[roomId];

      const winner = gameState.players
        .filter((p) => p.alive)
        .sort((a, b) => b.score - a.score)[0];
      if (winner) {
        winner.score += 500;
      }

      stopGameLoop(roomId);
      const endGameState = gameStates[roomId];
      const endGamePayload = {
        players: endGameState.players.map((p) => ({
          username: p.username,
          avatar: p.avatar,
          color: p.color,
          x: p.x,
          y: p.y,
          alive: p.alive,
          score: p.score,
          kills: p.kills,
          deaths: p.deaths,
          bombsPlaced: p.bombsPlaced,
          maxBombs: p.maxBombs,
          blastRange: p.blastRange,
          speed: p.speed,
          invincible: p.invincible,
        })),
        bombs: endGameState.bombs,
        explosions: endGameState.explosions,
        powerUps: endGameState.powerUps,
        map: endGameState.map,
        ended: true,
      };
      delete gameStates[roomId];

      const playerSocketIds = rooms[roomId]?.players.map((player) => {
        return Object.keys(onlinePlayers).find(
          (socketId) => onlinePlayers[socketId].username === player.username,
        );
      });
      playerSocketIds.forEach((socketId) => {
        io.to(socketId).emit("gameStateUpdate", endGamePayload);
      });

      logger.info(`Game over for room ${roomId}`);

      // Update room status
      if (rooms[roomId]) {
        delete rooms[roomId];
        io.emit("rooms", Object.values(rooms));
      }

      // update player stats
      Promise.all(
        gameState.players.map(async (player) => {
          const user = await User.findOne({ username: player.username });

          if (!user) {
            return;
          }

          await User.update(
            {
              // score: user.score + player.score,
              gamesPlayed: user.gamesPlayed + 1,
              wins: user.wins + (winner?.username === player.username),
            },
            { where: { username: player.username } },
          );
        }),
      );
    });

    socket.on("disconnect", () => {
      logger.info(`Socket disconnected: ${socket.id}`);
      // Handle room removal & game cleanup
      Object.values(rooms).forEach((room) => {
        if (room.sockets.includes(socket.id)) {
          room.sockets = room.sockets.filter((id) => id !== socket.id);
          room.players = room.players.filter(
            (player) => player.username !== onlinePlayers[socket.id].username,
          );
          if (!room.players.length) {
            stopGameLoop(room.id);
            delete gameStates[room.id];
            delete rooms[room.id];
          }
        }
      });
      removePlayer();
    });
  });
};
// Utility Functions
function generateGameMap() {
  const map = Array.from({ length: GRID_HEIGHT }, () =>
    Array(GRID_WIDTH).fill(0),
  );
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      if (BORDER_CONDITION(x, y) || INDESTRUCTIBLE_WALL(x, y)) map[y][x] = 1;
      else if (Math.random() < 0.4) map[y][x] = 2;
    }
  }
  START_POSITIONS.forEach(([x, y]) => {
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx,
          ny = y + dy;
        if (nx > 0 && nx < GRID_WIDTH - 1 && ny > 0 && ny < GRID_HEIGHT - 1)
          map[ny][nx] = 0;
      }
  });
  return map;
}

function createInitialGameState(players, map) {
  return {
    players: players.map((p, i) => ({
      ...p,
      score: 0,
      kills: 0,
      alive: true,
      maxBombs: 1,
      blastRange: 1,
      speed: 1,
      invincible: false,
      color: PLAYERS_COLORS[i],
      x: START_POSITIONS[i][0],
      y: START_POSITIONS[i][1],
      activeBombs: [],
      cheated: false,
    })),
    map,
    bombs: [],
    explosions: [],
    powerUps: generateInitialPowerUps(map),
    lastUpdateTime: Date.now(),
    startedTime: Date.now(),
    ended: false,
  };
}

function generateInitialPowerUps(map) {
  const emptyCells = [];
  for (let y = 1; y < GRID_HEIGHT - 1; y++)
    for (let x = 1; x < GRID_WIDTH - 1; x++) {
      if (
        !START_POSITIONS.some(([sx, sy]) => sx === x && sy === y) &&
        map[y][x] === 0
      )
        emptyCells.push([x, y]);
    }
  const powerUpTypes = ["speed", "range", "bombs", "inv"];
  const powerUps = [];
  while (powerUps.length < 3 && emptyCells.length) {
    const idx = Math.floor(Math.random() * emptyCells.length);
    const [x, y] = emptyCells.splice(idx, 1)[0];
    powerUps.push({
      x,
      y,
      type: powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)],
    });
  }
  return powerUps;
}

function startGameLoop(roomId, io) {
  if (gameLoops[roomId]) clearInterval(gameLoops[roomId]);
  gameLoops[roomId] = setInterval(() => updateGameState(roomId, io), 16);
}

function stopGameLoop(roomId) {
  if (gameLoops[roomId]) {
    clearInterval(gameLoops[roomId]);
    delete gameLoops[roomId];
  }
}

// Modified canMoveTo function to handle bomb pass-through
const canMoveTo = (player, testX, testY, username, gameState, HALF = 0.47) => {
  // Find player index
  const playerIndex = gameState.players.findIndex(
    (p) => p.username === username,
  );

  if (
    gameState.players.some(
      (p) =>
        p.alive &&
        Math.abs(p.x - testX) < 1 &&
        Math.abs(p.y - testY) < 1 &&
        p.username !== username,
    )
  )
    return false;

  return [
    [testX - HALF, testY - HALF],
    [testX - HALF, testY + HALF],
    [testX + HALF, testY - HALF],
    [testX + HALF, testY + HALF],
  ].every(([px, py]) => {
    const tx = Math.round(px);
    const ty = Math.round(py);

    // Check for walls
    if (gameState.map[ty][tx] !== 0) return false;

    // Check for bombs with special handling
    const bombAtPosition = gameState.bombs.find(
      (b) => b.x === tx && b.y === ty,
    );
    if (bombAtPosition) {
      // If this bomb allows this player to pass through, allow movement
      return (
        bombAtPosition.passThroughPlayers &&
        bombAtPosition.passThroughPlayers.includes(playerIndex)
      );
    }

    return true;
  });
};

// Update game state
const updateGameState = (roomId, io) => {
  const gameState = gameStates[roomId];
  if (!gameState) return;

  const now = Date.now();
  const deltaTime = (now - gameState.lastUpdateTime) / 1000; // Convert to seconds
  gameState.lastUpdateTime = now;

  // Process player inputs
  if (gameState.playerInputs) {
    Object.entries(gameState.playerInputs).forEach(([username, input]) => {
      const playerIndex = gameState.players.findIndex(
        (p) => p.username === username,
      );
      if (playerIndex !== -1 && gameState.players[playerIndex].alive) {
        const player = gameState.players[playerIndex];

        const speed = ((player.speed - 1) * 0.2 + 1) * 3 * deltaTime; // same as before

        // build per‐axis deltas
        const deltaX = (input.left ? -speed : 0) + (input.right ? speed : 0);
        const deltaY = (input.up ? -speed : 0) + (input.down ? speed : 0);

        // Store current position for checking if we're moving away from a bomb
        const oldX = player.x;
        const oldY = player.y;

        if (deltaX !== 0) {
          const newX = player.x + deltaX;
          if (canMoveTo(player, newX, player.y, username, gameState)) {
            player.x = newX;
          }
        }

        // try Y‐only
        if (deltaY !== 0) {
          const newY = player.y + deltaY;
          if (canMoveTo(player, player.x, newY, username, gameState)) {
            player.y = newY;
          }
        }

        const HALF = 0.47;
        const collidedPosition = [
          [player.x - HALF, player.y - HALF],
          [player.x - HALF, player.y + HALF],
          [player.x + HALF, player.y - HALF],
          [player.x + HALF, player.y + HALF],
        ];

        // If we moved away from a bomb, remove it
        gameState.bombs.forEach((bomb) => {
          // check if have pass through if yes we check of collision with bomb
          // if not then we remove the pass through
          if (
            bomb.passThroughPlayers &&
            bomb.passThroughPlayers.includes(playerIndex) &&
            !collidedPosition.some(
              ([px, py]) =>
                Math.round(px) === bomb.x && Math.round(py) === bomb.y,
            )
          ) {
            bomb.passThroughPlayers.splice(
              bomb.passThroughPlayers.indexOf(playerIndex),
              1,
            );
          }
        });

        let playPowerUpSound = false;
        // Get PowerUps
        gameState.powerUps.forEach((powerUp, index) => {
          collidedPosition.forEach(([px, py]) => {
            // if not collided or collected then return
            if (
              Math.round(px) !== powerUp.x ||
              Math.round(py) !== powerUp.y ||
              powerUp.collected
            )
              return;

            powerUp.collected = true;

            // Apply power-up effect
            switch (powerUp.type) {
              case "speed":
                player.speed = Math.min(player.speed + 1, 5); // Max speed cap
                break;
              case "range":
                player.blastRange = Math.min(player.blastRange + 1, 5); // Max range cap
                break;
              case "bombs":
                player.maxBombs = Math.min(player.maxBombs + 1, 5); // Max bombs cap
                break;
              case "inv":
                player.invincible = true;
                setTimeout(() => {
                  player.invincible = false;
                }, 5000);
                break;
            }

            // Update player stats
            player.score = (player.score || 0) + 50;

            // If player is powerUp then socket emit user to play powerUp sound
            playPowerUpSound = true;
          });
        });
        if (playPowerUpSound) {
          const playerSocketId = Object.keys(onlinePlayers).find(
            (socketId) => onlinePlayers[socketId].username === username,
          );

          io.to(playerSocketId).emit("playPowerUpSound");
        }
      }
    });
  }

  // Update bombs
  gameState.bombs = gameState.bombs
    .map((bomb) => {
      return { ...bomb, timer: bomb.timer - deltaTime };
    })
    .filter((bomb) => {
      // If bomb exploded, create explosion
      if (bomb.timer <= 0) {
        createExplosion(roomId, bomb.x, bomb.y, bomb.range, bomb.playerId);
        return false;
      }
      return true;
    });

  // Update explosions
  gameState.explosions = gameState.explosions
    .map((explosion) => ({ ...explosion, timer: explosion.timer - deltaTime }))
    .filter((explosion) => explosion.timer > 0);

  // Check for game over condition
  const alivePlayers = gameState.players.filter((p) => p.alive).length;
  if (alivePlayers <= 1) {
    // Game over - only one or zero players remaining
    const winner = gameState.players.find((p) => p.alive);
    if (winner) {
      winner.score += 500; // Winner bonus
    }

    // Stop game loop
    stopGameLoop(roomId);
    const endGameState = gameStates[roomId];
    const endGamePayload = {
      players: endGameState.players.map((p) => ({
        username: p.username,
        avatar: p.avatar,
        color: p.color,
        x: p.x,
        y: p.y,
        alive: p.alive,
        score: p.score,
        kills: p.kills,
        deaths: p.deaths,
        bombsPlaced: p.bombsPlaced,
        maxBombs: p.maxBombs,
        blastRange: p.blastRange,
        speed: p.speed,
        invincible: p.invincible,
      })),
      bombs: endGameState.bombs,
      explosions: endGameState.explosions,
      powerUps: endGameState.powerUps,
      map: endGameState.map,
      ended: true,
    };
    delete gameStates[roomId];

    const playerSocketIds = rooms[roomId]?.players.map((player) => {
      return Object.keys(onlinePlayers).find(
        (socketId) => onlinePlayers[socketId].username === player.username,
      );
    });
    playerSocketIds.forEach((socketId) => {
      io.to(socketId).emit("gameStateUpdate", endGamePayload);
    });

    logger.info(`Game over for room ${roomId}`);

    // Update room status
    if (rooms[roomId]) {
      delete rooms[roomId];
      io.emit("rooms", Object.values(rooms));
    }

    // update player stats
    Promise.all(
      gameState.players.map(async (player) => {
        const user = await User.findOne({ username: player.username });

        if (!user) {
          return;
        }

        await User.update(
          {
            // score: user.score + player.score,
            gamesPlayed: user.gamesPlayed + 1,
            wins: user.wins + (winner?.username === player.username),
          },
          { where: { username: player.username } },
        );
      }),
    );

    return;
  }

  // Send updated game state to all players in the room
  broadcastGameStateUpdate(roomId, io);
};

// Create explosion at a position
const createExplosion = (roomId, x, y, range, playerId) => {
  const gameState = gameStates[roomId];
  if (!gameState) return;

  const newExplosions = [{ x, y, timer: 0.5 }]; // Center explosion

  // Check in all four directions
  const directions = [
    { dx: 0, dy: -1 }, // Up
    { dx: 0, dy: 1 }, // Down
    { dx: -1, dy: 0 }, // Left
    { dx: 1, dy: 0 }, // Right
  ];

  directions.forEach((dir) => {
    for (let i = 1; i <= range; i++) {
      const newX = x + dir.dx * i;
      const newY = y + dir.dy * i;

      // Check if out of bounds
      if (newX < 0 || newX >= 15 || newY < 0 || newY >= 13) {
        break;
      }

      // Check if hit indestructible wall
      if (gameState.map[newY][newX] === 1) {
        break;
      }

      // Add explosion
      newExplosions.push({ x: newX, y: newY, timer: 0.5 });

      // Check if hit destructible wall
      if (gameState.map[newY][newX] === 2) {
        // Destroy the wall
        gameState.map[newY][newX] = 0;

        // 20% chance to spawn a power-up when a wall is destroyed
        if (Math.random() < 0.2) {
          const powerUpTypes = ["speed", "range", "bombs", "inv"];
          gameState.powerUps.push({
            x: newX,
            y: newY,
            type: powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)],
            collected: false,
          });
        }

        break; // Stop explosion in this direction
      }

      // Check if hit another bomb
      const hitBomb = gameState.bombs.findIndex(
        (bomb) => Math.round(bomb.x) === newX && Math.round(bomb.y) === newY,
      );

      if (hitBomb !== -1) {
        // Chain reaction - make this bomb explode next frame
        gameState.bombs[hitBomb].timer = 0.01;
      }

      // Check if hit a player
      gameState.players.forEach((player, playerIndex) => {
        if (
          player.alive &&
          Math.round(player.x) === newX &&
          Math.round(player.y) === newY &&
          !player.invincible &&
          !player.cheated
        ) {
          // Player is hit by explosion
          player.alive = false;
          player.deaths = (player.deaths || 0) + 1;

          // Award kill to the player who placed the bomb
          if (playerIndex !== playerId) {
            gameState.players[playerId].kills =
              (gameState.players[playerId].kills || 0) + 1;
            gameState.players[playerId].score =
              (gameState.players[playerId].score || 0) + 100;
          }
        }
      });
    }
  });

  // Add all new explosions
  gameState.explosions = [...gameState.explosions, ...newExplosions];
};

// Broadcast game state update to all players in a room
const broadcastGameStateUpdate = (roomId, io) => {
  const gameState = gameStates[roomId];
  if (!gameState) return;

  // Find all player socket IDs in this room
  const playerSocketIds =
    rooms[roomId]?.players
      .map((player) => {
        return Object.keys(onlinePlayers).find(
          (socketId) => onlinePlayers[socketId].username === player.username,
        );
      })
      .filter(Boolean) || [];

  // Create a lighter version of the game state to send
  const updatePayload = {
    players: gameState.players.map((p) => ({
      username: p.username,
      avatar: p.avatar,
      color: p.color,
      x: p.x,
      y: p.y,
      alive: p.alive,
      score: p.score,
      kills: p.kills,
      deaths: p.deaths,
      bombsPlaced: p.bombsPlaced,
      maxBombs: p.maxBombs,
      blastRange: p.blastRange,
      speed: p.speed,
      invincible: p.invincible,
      cheated: p.cheated,
    })),
    bombs: gameState.bombs,
    explosions: gameState.explosions,
    powerUps: gameState.powerUps.filter((p) => !p.collected),
    map: gameState.map,
  };

  // Send to all players in the room
  playerSocketIds.forEach((socketId) => {
    io.to(socketId).emit("gameStateUpdate", updatePayload);
  });
};
