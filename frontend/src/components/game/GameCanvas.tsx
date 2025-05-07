import { useEffect, useRef, useState } from "react";

interface Player {
  id: number;
  name: string;
  avatar: string;
  color: string;
  score: number;
  kills: number;
  deaths: number;
  bombsPlaced: number;
  powerupsCollected: number;
  isAlive: boolean;
  x?: number;
  y?: number;
}

interface Bomb {
  x: number;
  y: number;
  playerId: number;
  timer: number;
  range: number;
}

interface PowerUp {
  x: number;
  y: number;
  type: "speed" | "range" | "bombs" | "kick";
  collected: boolean;
}

interface GameCanvasProps {
  players: Player[];
  currentPlayerId: number;
  isPaused: boolean;
}

// Game constants
const TILE_SIZE = 40;
const GRID_WIDTH = 15;
const GRID_HEIGHT = 13;
const CANVAS_WIDTH = GRID_WIDTH * TILE_SIZE;
const CANVAS_HEIGHT = GRID_HEIGHT * TILE_SIZE;

// Game map - 0: empty, 1: indestructible wall, 2: destructible wall
const generateMap = () => {
  const map: number[][] = Array(GRID_HEIGHT)
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
    [1, 1],
    [GRID_WIDTH - 2, 1],
    [1, GRID_HEIGHT - 2],
    [GRID_WIDTH - 2, GRID_HEIGHT - 2],
  ];

  startPositions.forEach(([x, y]) => {
    map[y][x] = 0; // Clear the starting position
    // Also clear adjacent cells for movement
    if (x + 1 < GRID_WIDTH - 1) map[y][x + 1] = 0;
    if (y + 1 < GRID_HEIGHT - 1) map[y + 1][x] = 0;
  });

  return map;
};

export default function GameCanvas({
  players,
  currentPlayerId,
  isPaused,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameMap, setGameMap] = useState<number[][]>([]);
  const [gamePlayers, setGamePlayers] = useState<Player[]>([]);
  const [bombs, setBombs] = useState<Bomb[]>([]);
  const [explosions, setExplosions] = useState<
    { x: number; y: number; timer: number }[]
  >([]);
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [keysPressed, setKeysPressed] = useState<Set<string>>(new Set());
  const requestRef = useRef<number>();
  const lastUpdateTimeRef = useRef<number>(0);

  // Initialize game
  useEffect(() => {
    // Generate map
    const map = generateMap();
    setGameMap(map);

    // Initialize players with positions
    const startPositions = [
      [1, 1],
      [GRID_WIDTH - 2, 1],
      [1, GRID_HEIGHT - 2],
      [GRID_WIDTH - 2, GRID_HEIGHT - 2],
    ];

    const initializedPlayers = players.map((player, index) => ({
      ...player,
      x: startPositions[index % startPositions.length][0],
      y: startPositions[index % startPositions.length][1],
    }));

    setGamePlayers(initializedPlayers);

    // Generate some initial power-ups
    const initialPowerUps: PowerUp[] = [];
    const powerUpTypes: ("speed" | "range" | "bombs" | "kick")[] = [
      "speed",
      "range",
      "bombs",
      "kick",
    ];

    for (let i = 0; i < 5; i++) {
      let x, y;
      do {
        x = Math.floor(Math.random() * (GRID_WIDTH - 2)) + 1;
        y = Math.floor(Math.random() * (GRID_HEIGHT - 2)) + 1;
      } while (
        map[y][x] !== 0 ||
        startPositions.some((pos) => pos[0] === x && pos[1] === y)
      );

      initialPowerUps.push({
        x,
        y,
        type: powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)],
        collected: false,
      });
    }

    setPowerUps(initialPowerUps);

    // Set up keyboard listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeysPressed((prev) => {
        const newKeys = new Set(prev);
        newKeys.add(e.key);
        return newKeys;
      });
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setKeysPressed((prev) => {
        const newKeys = new Set(prev);
        newKeys.delete(e.key);
        return newKeys;
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [players]);

  // Game loop
  useEffect(() => {
    if (isPaused) return;

    const gameLoop = (timestamp: number) => {
      if (!lastUpdateTimeRef.current) {
        lastUpdateTimeRef.current = timestamp;
      }

      const deltaTime = timestamp - lastUpdateTimeRef.current;
      if (deltaTime > 16) {
        // ~60 FPS
        lastUpdateTimeRef.current = timestamp;

        // Update player positions based on input
        updatePlayers();

        // Update bombs
        updateBombs();

        // Update explosions
        updateExplosions();

        // Draw everything
        draw();
      }

      requestRef.current = requestAnimationFrame(gameLoop);
    };

    requestRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [
    gameMap,
    gamePlayers,
    bombs,
    explosions,
    powerUps,
    keysPressed,
    isPaused,
  ]);

  // Update player positions
  const updatePlayers = () => {
    const speed = 0.1;
    setGamePlayers((prevPlayers) => {
      return prevPlayers.map((player) => {
        if (!player.isAlive) return player;

        let newX = player.x || 0;
        let newY = player.y || 0;

        // Only control the current player with keyboard
        if (player.id === currentPlayerId) {
          // Adjust for desired movement speed

          if (keysPressed.has("ArrowUp") || keysPressed.has("w")) {
            newY -= speed;
          }
          if (keysPressed.has("ArrowDown") || keysPressed.has("s")) {
            newY += speed;
          }
          if (keysPressed.has("ArrowLeft") || keysPressed.has("a")) {
            newX -= speed;
          }
          if (keysPressed.has("ArrowRight") || keysPressed.has("d")) {
            newX += speed;
          }

          // Place bomb with space
          if (keysPressed.has(" ")) {
            placeBomb(player);
            // Remove space from pressed keys to prevent bomb spam
            setKeysPressed((prev) => {
              const newKeys = new Set(prev);
              newKeys.delete(" ");
              return newKeys;
            });
          }
        } else {
          // Simple AI for other players
          if (Math.random() < 0.02) {
            // Occasionally change direction
            const directions = [
              { x: 0, y: -speed },
              { x: 0, y: speed },
              { x: -speed, y: 0 },
              { x: speed, y: 0 },
            ];
            const randomDir =
              directions[Math.floor(Math.random() * directions.length)];
            newX += randomDir.x;
            newY += randomDir.y;
          }

          // Occasionally place bombs
          if (Math.random() < 0.005) {
            placeBomb(player);
          }
        }

        // Check collision with walls
        const roundedX = Math.round(newX);
        const roundedY = Math.round(newY);

        if (
          roundedX >= 0 &&
          roundedX < GRID_WIDTH &&
          roundedY >= 0 &&
          roundedY < GRID_HEIGHT &&
          gameMap[roundedY][roundedX] === 0 &&
          !bombs.some(
            (bomb) =>
              Math.round(bomb.x) === roundedX &&
              Math.round(bomb.y) === roundedY,
          )
        ) {
          // Check for power-up collection
          powerUps.forEach((powerUp, index) => {
            if (
              !powerUp.collected &&
              Math.round(powerUp.x) === roundedX &&
              Math.round(powerUp.y) === roundedY
            ) {
              // Collect power-up
              setPowerUps((prev) => {
                const newPowerUps = [...prev];
                newPowerUps[index].collected = true;
                return newPowerUps;
              });

              // Update player stats
              return {
                ...player,
                x: newX,
                y: newY,
                powerupsCollected: player.powerupsCollected + 1,
                score: player.score + 50,
              };
            }
          });

          return { ...player, x: newX, y: newY };
        }

        return player;
      });
    });
  };

  // Place a bomb
  const placeBomb = (player: Player) => {
    const x = Math.round(player.x || 0);
    const y = Math.round(player.y || 0);

    // Check if there's already a bomb at this position
    if (
      bombs.some((bomb) => Math.round(bomb.x) === x && Math.round(bomb.y) === y)
    ) {
      return;
    }

    setBombs((prev) => [
      ...prev,
      {
        x,
        y,
        playerId: player.id,
        timer: 3, // 3 second timer
        range: 2, // Default explosion range
      },
    ]);

    // Update player stats
    setGamePlayers((prev) =>
      prev.map((p) =>
        p.id === player.id ? { ...p, bombsPlaced: p.bombsPlaced + 1 } : p,
      ),
    );
  };

  // Update bombs
  const updateBombs = () => {
    setBombs((prev) => {
      const updatedBombs = prev
        .map((bomb) => {
          return { ...bomb, timer: bomb.timer - 0.016 }; // Decrease timer based on ~60 FPS
        })
        .filter((bomb) => bomb.timer > 0); // Remove bombs that have exploded

      // Handle explosions for bombs that just reached 0
      prev.forEach((bomb) => {
        if (bomb.timer <= 0.016 && bomb.timer > 0) {
          // Create explosion at bomb position
          createExplosion(bomb.x, bomb.y, bomb.range, bomb.playerId);
        }
      });

      return updatedBombs;
    });
  };

  // Create explosion
  const createExplosion = (
    x: number,
    y: number,
    range: number,
    playerId: number,
  ) => {
    const newExplosions: { x: number; y: number; timer: number }[] = [
      { x, y, timer: 0.5 },
    ]; // Center explosion

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
        if (newX < 0 || newX >= GRID_WIDTH || newY < 0 || newY >= GRID_HEIGHT) {
          break;
        }

        // Check if hit indestructible wall
        if (gameMap[newY][newX] === 1) {
          break;
        }

        // Add explosion
        newExplosions.push({ x: newX, y: newY, timer: 0.5 });

        // Check if hit destructible wall
        if (gameMap[newY][newX] === 2) {
          // Destroy the wall
          setGameMap((prev) => {
            const newMap = [...prev];
            newMap[newY][newX] = 0;

            // 20% chance to spawn a power-up when a wall is destroyed
            if (Math.random() < 0.2) {
              const powerUpTypes: ("speed" | "range" | "bombs" | "kick")[] = [
                "speed",
                "range",
                "bombs",
                "kick",
              ];
              setPowerUps((prev) => [
                ...prev,
                {
                  x: newX,
                  y: newY,
                  type: powerUpTypes[
                    Math.floor(Math.random() * powerUpTypes.length)
                  ],
                  collected: false,
                },
              ]);
            }

            return newMap;
          });
          break; // Stop explosion in this direction
        }

        // Check if hit a player
        gamePlayers.forEach((player) => {
          if (
            player.isAlive &&
            Math.round(player.x || 0) === newX &&
            Math.round(player.y || 0) === newY
          ) {
            // Player is hit by explosion
            setGamePlayers((prev) =>
              prev.map((p) =>
                p.id === player.id
                  ? { ...p, isAlive: false, deaths: p.deaths + 1 }
                  : p,
              ),
            );

            // Award kill to the player who placed the bomb
            if (player.id !== playerId) {
              setGamePlayers((prev) =>
                prev.map((p) =>
                  p.id === playerId
                    ? { ...p, kills: p.kills + 1, score: p.score + 100 }
                    : p,
                ),
              );
            }
          }
        });
      }
    });

    setExplosions((prev) => [...prev, ...newExplosions]);
  };

  // Update explosions
  const updateExplosions = () => {
    setExplosions((prev) => {
      return prev
        .map((explosion) => ({ ...explosion, timer: explosion.timer - 0.016 }))
        .filter((explosion) => explosion.timer > 0);
    });
  };

  // Draw the game
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw map
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const tileType = gameMap[y][x];

        if (tileType === 0) {
          // Empty tile
          ctx.fillStyle = "#4a6ea5";
          ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

          // Grid lines
          ctx.strokeStyle = "#3b5c8f";
          ctx.lineWidth = 1;
          ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        } else if (tileType === 1) {
          // Indestructible wall
          ctx.fillStyle = "#1a2e4a";
          ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

          // Wall details
          ctx.fillStyle = "#0f1a2a";
          ctx.fillRect(
            x * TILE_SIZE + 2,
            y * TILE_SIZE + 2,
            TILE_SIZE - 4,
            TILE_SIZE - 4,
          );
        } else if (tileType === 2) {
          // Destructible wall
          ctx.fillStyle = "#8aa8d0";
          ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

          // Wall cracks
          ctx.strokeStyle = "#4a6ea5";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x * TILE_SIZE + 10, y * TILE_SIZE + 10);
          ctx.lineTo(
            x * TILE_SIZE + TILE_SIZE - 10,
            y * TILE_SIZE + TILE_SIZE - 10,
          );
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(x * TILE_SIZE + TILE_SIZE - 10, y * TILE_SIZE + 10);
          ctx.lineTo(x * TILE_SIZE + 10, y * TILE_SIZE + TILE_SIZE - 10);
          ctx.stroke();
        }
      }
    }

    // Draw power-ups
    powerUps.forEach((powerUp) => {
      if (powerUp.collected) return;

      let color = "#ffffff";
      switch (powerUp.type) {
        case "speed":
          color = "#ffcc00"; // Yellow
          break;
        case "range":
          color = "#e83b3b"; // Red
          break;
        case "bombs":
          color = "#3b82e8"; // Blue
          break;
        case "kick":
          color = "#50c878"; // Green
          break;
      }

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(
        powerUp.x * TILE_SIZE + TILE_SIZE / 2,
        powerUp.y * TILE_SIZE + TILE_SIZE / 2,
        TILE_SIZE / 4,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      // Power-up icon
      ctx.fillStyle = "#ffffff";
      ctx.font = "12px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      let icon = "?";
      switch (powerUp.type) {
        case "speed":
          icon = "S";
          break;
        case "range":
          icon = "R";
          break;
        case "bombs":
          icon = "B";
          break;
        case "kick":
          icon = "K";
          break;
      }

      ctx.fillText(
        icon,
        powerUp.x * TILE_SIZE + TILE_SIZE / 2,
        powerUp.y * TILE_SIZE + TILE_SIZE / 2,
      );
    });

    // Draw bombs
    bombs.forEach((bomb) => {
      // Bomb body
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath();
      ctx.arc(
        bomb.x * TILE_SIZE + TILE_SIZE / 2,
        bomb.y * TILE_SIZE + TILE_SIZE / 2,
        TILE_SIZE / 3,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      // Bomb fuse
      ctx.strokeStyle = "#e83b3b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(
        bomb.x * TILE_SIZE + TILE_SIZE / 2,
        bomb.y * TILE_SIZE + TILE_SIZE / 2 - TILE_SIZE / 3,
      );
      ctx.lineTo(
        bomb.x * TILE_SIZE + TILE_SIZE / 2,
        bomb.y * TILE_SIZE + TILE_SIZE / 2 - TILE_SIZE / 2,
      );
      ctx.stroke();

      // Bomb timer
      ctx.fillStyle = "#ffffff";
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        Math.ceil(bomb.timer).toString(),
        bomb.x * TILE_SIZE + TILE_SIZE / 2,
        bomb.y * TILE_SIZE + TILE_SIZE / 2,
      );
    });

    // Draw explosions
    explosions.forEach((explosion) => {
      const alpha = explosion.timer * 2; // Fade out
      ctx.fillStyle = `rgba(232, 59, 59, ${alpha})`;
      ctx.fillRect(
        explosion.x * TILE_SIZE,
        explosion.y * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE,
      );

      // Explosion particles
      ctx.fillStyle = `rgba(255, 204, 0, ${alpha})`;
      ctx.beginPath();
      ctx.arc(
        explosion.x * TILE_SIZE + TILE_SIZE / 2,
        explosion.y * TILE_SIZE + TILE_SIZE / 2,
        TILE_SIZE / 4,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    });

    // Draw players
    gamePlayers.forEach((player) => {
      if (!player.isAlive) return;

      const x = (player.x || 0) * TILE_SIZE;
      const y = (player.y || 0) * TILE_SIZE;

      // Player body
      ctx.fillStyle = player.color;
      ctx.fillRect(
        x + TILE_SIZE / 4,
        y + TILE_SIZE / 4,
        TILE_SIZE / 2,
        TILE_SIZE / 2,
      );

      // Player outline
      ctx.strokeStyle = "#1a2e4a";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        x + TILE_SIZE / 4,
        y + TILE_SIZE / 4,
        TILE_SIZE / 2,
        TILE_SIZE / 2,
      );

      // Player avatar/icon
      ctx.fillStyle = "#ffffff";
      ctx.font = "16px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(player.avatar, x + TILE_SIZE / 2, y + TILE_SIZE / 2);

      // Highlight current player
      if (player.id === currentPlayerId) {
        ctx.strokeStyle = "#ffcc00";
        ctx.lineWidth = 2;
        ctx.strokeRect(
          x + TILE_SIZE / 8,
          y + TILE_SIZE / 8,
          (TILE_SIZE * 3) / 4,
          (TILE_SIZE * 3) / 4,
        );
      }
    });
  };

  return (
    <div className="game-canvas-container">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="pixel-canvas"
      />
    </div>
  );
}
