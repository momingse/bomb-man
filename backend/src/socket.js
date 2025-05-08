import { logger } from "./logger.js";
import User from "./models/User.js";

const rooms = {};
const onlinePlayers = {};

// Game state tracking
const gameStates = {};

export const socketHandler = (io) => {
  logger.info("Socket handler started");

  io.on("connection", (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    socket.on("register", (data) => {
      if (onlinePlayers[socket.id]) {
        logger.info(`User ${data.username} already exists`);
        return;
      }
      logger.info(`User ${data.username} registered`);
      onlinePlayers[socket.id] = {
        username: data.username,
        avatar: data.avatar,
      };
      io.emit("onlinePlayers", Object.values(onlinePlayers));
      io.emit("rooms", Object.values(rooms));
    });

    socket.on("createRoom", (data) => {
      const player = onlinePlayers[socket.id];
      if (!player) {
        logger.warn(`createRoom: no registered player for socket ${socket.id}`);
        return;
      }
      logger.info(`Room ${data.name} created by ${player.username}`);

      const roomInfo = {
        id: socket.id,
        name: data.name,
        host: player.username,
        players: [
          {
            username: player.username,
            avatar: player.avatar,
            isReady: true,
            isHost: true,
          },
        ],
        maxPlayers: data.maxPlayers,
        started: false,
      };

      rooms[socket.id] = roomInfo;
      io.emit("rooms", Object.values(rooms));
      socket.emit("roomCreated", roomInfo);
    });

    socket.on("joinRoom", (roomId) => {
      const player = onlinePlayers[socket.id];
      if (!player) {
        logger.warn(`joinRoom: no registered player for socket ${socket.id}`);
        return;
      }
      logger.info(`User ${player.username} joined room ${roomId}`);

      const room = rooms[roomId];
      if (!room) {
        logger.warn(`joinRoom: room ${roomId} does not exist`);
        return;
      }
      if (room.players.find((p) => p.username === player.username)) {
        logger.info(`User ${player.username} already in room`);
        return;
      }
      if (room.players.length >= room.maxPlayers) {
        logger.warn(`joinRoom: room ${roomId} is full`);
        return;
      }
      if (room.started) {
        logger.warn(`joinRoom: room ${roomId} has already started`);
        return;
      }

      room.players.push({
        username: player.username,
        avatar: player.avatar,
        isReady: false,
        isHost: false,
      });
      io.emit("rooms", Object.values(rooms));
    });

    socket.on("leaveRoom", () => {
      const player = onlinePlayers[socket.id];
      if (!player) {
        logger.warn(`leaveRoom: no registered player for socket ${socket.id}`);
        return;
      }
      logger.info(`User ${player.username} left room`);

      const room = Object.values(rooms).find((r) =>
        r.players.some((p) => p.username === player.username),
      );
      if (!room) {
        logger.warn(`leaveRoom: user ${player.username} not in any room`);
        return;
      }

      if (room.players.length === 1) {
        delete rooms[room.id];
        io.emit("rooms", Object.values(rooms));
        return;
      }

      if (room.host === player.username) {
        const newHost = room.players.find(
          (p) => p.username !== player.username,
        );
        if (newHost) {
          room.host = newHost.username;
          newHost.isHost = true;
          newHost.isReady = true;
        }
      }

      room.players = room.players.filter((p) => p.username !== player.username);
      io.emit("rooms", Object.values(rooms));
    });

    socket.on("toggleReady", ({ roomId, isReady }) => {
      const player = onlinePlayers[socket.id];
      if (!player) {
        logger.warn(
          `toggleReady: no registered player for socket ${socket.id}`,
        );
        return;
      }
      logger.info(`User ${player.username} toggled ready in room ${roomId}`);

      const room = rooms[roomId];
      if (!room) {
        logger.warn(`toggleReady: room ${roomId} does not exist`);
        return;
      }
      const participant = room.players.find(
        (p) => p.username === player.username,
      );
      if (!participant) {
        logger.warn(
          `toggleReady: user ${player.username} not in room ${roomId}`,
        );
        return;
      }

      participant.isReady = isReady;
      io.emit("rooms", Object.values(rooms));
    });

    socket.on("hostStartGame", ({ roomId }) => {
      const player = onlinePlayers[socket.id];
      if (!player) {
        logger.warn(
          `hostStartGame: no registered player for socket ${socket.id}`,
        );
        return;
      }
      logger.info(`User ${player.username} started game in room ${roomId}`);

      const room = rooms[roomId];
      if (!room) {
        logger.warn(`hostStartGame: room ${roomId} does not exist`);
        return;
      }

      const PLAYERS_COLORS = ["#e83b3b", "#3b82e8", "#50c878", "#ffcc00"];
      const map = generateGameMap();
      gameStates[roomId] = {
        players: room.players.map((p, i) => ({
          username: p.username,
          avatar: p.avatar,
          score: 0,
          kills: 0,
          alive: true,
          maxBombs: 1,
          blastRange: 1,
          speed: 1,
          invincible: false,
          color: PLAYERS_COLORS[i],
          x: [1, 13, 1, 13][i % 4],
          y: [1, 1, 11, 11][i % 4],
          activeBombs: [], // Track bombs placed by this player
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

      room.players.forEach((p) => {
        const sid = Object.keys(onlinePlayers).find(
          (k) => onlinePlayers[k]?.username === p.username,
        );
        if (sid) {
          io.to(sid).emit("startGame", {
            roomId,
            gameState: gameStates[roomId],
          });
        }
      });

      room.started = true;
      io.emit("rooms", Object.values(rooms));
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

      // First check if the player exists
      const player = onlinePlayers[socket.id];
      if (!player) {
        logger.info(`No registered player for socket ${socket.id}`);
        return;
      }

      // Now we can safely check if user is in any room
      const room = Object.values(rooms).find((room) =>
        room.players.find((p) => p.username === player.username),
      );

      if (room) {
        logger.info(`User ${player.username} left room due to disconnect`);

        // If game is in progress, mark player as disconnected but keep in game
        if (room.started && gameStates[room.id]) {
          const playerIndex = gameStates[room.id].players.findIndex(
            (p) => p.username === player.username,
          );
          if (playerIndex !== -1) {
            gameStates[room.id].players[playerIndex].disconnected = true;
            gameStates[room.id].players[playerIndex].alive = false;
          }
        }

        // remove user from room
        rooms[room.id].players = room.players.filter(
          (p) => p.username !== player.username,
        );

        // If room is empty, remove it and stop the game loop
        if (rooms[room.id].players.length === 0) {
          logger.info(`Room ${room.id} is empty, removing`);
          stopGameLoop(room.id);
          delete gameStates[room.id];
          delete rooms[room.id];
        }

        io.emit("rooms", Object.values(rooms));
      }

      // Finally remove the player from online players
      logger.info(`User ${player.username} disconnected`);
      delete onlinePlayers[socket.id];
      io.emit("onlinePlayers", Object.values(onlinePlayers));
    });
  });
};

// Game map generation
const generateGameMap = () => {
  const GRID_WIDTH = 15;
  const GRID_HEIGHT = 13;

  const map = Array(GRID_HEIGHT)
    .fill(0)
    .map(() => Array(GRID_WIDTH).fill(0));

  // Add border walls
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      // Border walls
      if (x === 0 || y === 0 || x === GRID_WIDTH - 1 || y === GRID_HEIGHT - 1) {
        map[y][x] = 1;
      }
      // Indestructible walls in a grid pattern
      else if (x % 2 === 0 && y % 2 === 0) {
        map[y][x] = 1;
      }
      // Random destructible walls (40% chance)
      else if (Math.random() < 0.4) {
        map[y][x] = 2;
      }
    }
  }

  // Ensure player starting positions are clear
  const startPositions = [
    [1, 1], // Top-left
    [GRID_WIDTH - 2, 1], // Top-right
    [1, GRID_HEIGHT - 2], // Bottom-left
    [GRID_WIDTH - 2, GRID_HEIGHT - 2], // Bottom-right
  ];

  startPositions.forEach(([x, y]) => {
    map[y][x] = 0; // Clear the starting position
    // Also clear adjacent cells for movement
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (
          x + dx >= 1 &&
          x + dx < GRID_WIDTH - 1 &&
          y + dy >= 1 &&
          y + dy < GRID_HEIGHT - 1
        ) {
          map[y + dy][x + dx] = 0;
        }
      }
    }
  });

  return map;
};

// Generate initial power-ups
const generateInitialPowerUps = (map) => {
  const GRID_WIDTH = 15;
  const GRID_HEIGHT = 13;
  const powerUps = [];
  const powerUpTypes = ["speed", "range", "bombs", "inv"];

  const possiblePositions = [];
  for (let x = 1; x < GRID_WIDTH - 1; x++) {
    for (let y = 1; y < GRID_HEIGHT - 1; y++) {
      possiblePositions.push([x, y]);
    }
  }

  while (powerUps.length < 3) {
    const randomIndex = Math.floor(Math.random() * possiblePositions.length);
    const [x, y] = possiblePositions.splice(randomIndex, 1)[0];

    // Check if position is empty
    const GRID_WIDTH = 15;
    const GRID_HEIGHT = 13;
    const startPositions = [
      [1, 1], // Top-left
      [GRID_WIDTH - 2, 1], // Top-right
      [1, GRID_HEIGHT - 2], // Bottom-left
      [GRID_WIDTH - 2, GRID_HEIGHT - 2], // Bottom-right
    ];

    if (map[y][x] === 0 && !startPositions.includes([x, y])) {
      const type =
        powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
      powerUps.push({ x, y, type });
    }
  }

  return powerUps;
};

// Game loops for active rooms
const gameLoops = {};

// Start a game loop for a specific room
const startGameLoop = (roomId, io) => {
  if (gameLoops[roomId]) {
    clearInterval(gameLoops[roomId]);
  }

  // Run game update at 60 FPS (approximately)
  gameLoops[roomId] = setInterval(() => {
    updateGameState(roomId, io);
  }, 16); // ~60 FPS
};

// Stop a game loop
const stopGameLoop = (roomId) => {
  if (gameLoops[roomId]) {
    clearInterval(gameLoops[roomId]);
    delete gameLoops[roomId];
  }
};

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
