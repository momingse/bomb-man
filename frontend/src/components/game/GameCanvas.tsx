import { GameState, useGameState } from "@/state/gameState";
import { usePlayersStore } from "@/state/player";
import { useRoomStore } from "@/state/room";
import { useEffect, useRef, useMemo, useCallback } from "react";
import { useSocket } from "../SocketProvier";

// Constants moved outside component to prevent recreation
const TILE_SIZE = 40;
const GRID_WIDTH = 15;
const GRID_HEIGHT = 13;
const CANVAS_WIDTH = GRID_WIDTH * TILE_SIZE;
const CANVAS_HEIGHT = GRID_HEIGHT * TILE_SIZE;
const FPS = 60;
const FRAME_TIME = 1000 / FPS;

// Preloaded images for better performance
const preloadImages = () => {
  const images = {
    emptyTile: new Image(),
    indestructibleWall: new Image(),
    destructibleWall: new Image(),
  };

  // Create off-screen canvases to pre-render static elements
  const offscreenCanvases = {
    emptyTile: document.createElement("canvas"),
    indestructibleWall: document.createElement("canvas"),
    destructibleWall: document.createElement("canvas"),
  };

  // Set canvas sizes
  Object.values(offscreenCanvases).forEach((canvas) => {
    canvas.width = TILE_SIZE;
    canvas.height = TILE_SIZE;
  });

  // Pre-render empty tile
  const emptyCtx = offscreenCanvases.emptyTile.getContext("2d");
  if (emptyCtx) {
    emptyCtx.fillStyle = "#4a6ea5";
    emptyCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    emptyCtx.strokeStyle = "#3b5c8f";
    emptyCtx.lineWidth = 1;
    emptyCtx.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
  }

  // Pre-render indestructible wall
  const indestCtx = offscreenCanvases.indestructibleWall.getContext("2d");
  if (indestCtx) {
    indestCtx.fillStyle = "#1a2e4a";
    indestCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    indestCtx.fillStyle = "#0f1a2a";
    indestCtx.fillRect(2, 2, TILE_SIZE - 4, TILE_SIZE - 4);
  }

  // Pre-render destructible wall
  const destCtx = offscreenCanvases.destructibleWall.getContext("2d");
  if (destCtx) {
    destCtx.fillStyle = "#8aa8d0";
    destCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    destCtx.strokeStyle = "#4a6ea5";
    destCtx.lineWidth = 2;
    destCtx.beginPath();
    destCtx.moveTo(10, 10);
    destCtx.lineTo(TILE_SIZE - 10, TILE_SIZE - 10);
    destCtx.stroke();
    destCtx.beginPath();
    destCtx.moveTo(TILE_SIZE - 10, 10);
    destCtx.lineTo(10, TILE_SIZE - 10);
    destCtx.stroke();
  }

  return offscreenCanvases;
};

// Audio manager to handle all audio efficiently
class AudioManager {
  private audioElements: { [key: string]: HTMLAudioElement } = {};
  private enabled: boolean = true;

  constructor() {
    this.audioElements = {
      background: new Audio("/background.mp3"),
      powerup: new Audio("/powerup.mp3"),
      explosion: new Audio("/explosion.mp3"),
    };

    // Configure audio elements
    this.audioElements.background.loop = true;
    this.audioElements.background.volume = 0.2;

    // Pre-load audio
    Object.values(this.audioElements).forEach((audio) => {
      audio.load();
    });
  }

  play(name: string): void {
    if (!this.enabled) return;

    const audio = this.audioElements[name];
    if (audio) {
      // Create a clone for overlapping sounds
      if (name === "explosion" || name === "powerup") {
        const clone = audio.cloneNode() as HTMLAudioElement;
        clone.volume = audio.volume;
        clone
          .play()
          .catch((err) => console.warn(`${name} audio play prevented:`, err));
        // Remove element after playback to prevent memory leaks
        clone.onended = () => clone.remove();
      } else {
        audio.currentTime = 0;
        audio
          .play()
          .catch((err) => console.warn(`${name} audio play prevented:`, err));
      }
    }
  }

  startBackground(): void {
    if (!this.enabled) return;
    this.audioElements.background
      .play()
      .catch((err) => console.warn("Background audio play prevented:", err));
  }

  stopAll(): void {
    Object.values(this.audioElements).forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.stopAll();
  }
}

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const audioManagerRef = useRef<AudioManager | null>(null);
  const offscreenCanvasesRef = useRef<Record<string, HTMLCanvasElement> | null>(
    null,
  );
  const animationFrameIdRef = useRef<number>(0);

  // Game state
  const { players, bombs, explosions, powerUps, map, setGameState } =
    useGameState();
  const { currentRoom } = useRoomStore();
  const { player: currentPlayer } = usePlayersStore();

  // Get current player state once
  const currentPlayerState = useMemo(
    () => players.find((player) => player.username === currentPlayer?.username),
    [players, currentPlayer?.username],
  );

  // Use refs for values that don't need to trigger re-renders
  const previousExplosions = useRef<GameState["explosions"]>([]);
  const stateRef = useRef({ players, bombs, explosions, powerUps, map });
  const dirtyRef = useRef(true); // Track if redraw is needed

  const { socket, isConnected } = useSocket();
  const inputRef = useRef({
    up: false,
    down: false,
    left: false,
    right: false,
    cheat: false,
  });

  // Update state ref whenever props change to avoid stale closures
  useEffect(() => {
    stateRef.current = { players, bombs, explosions, powerUps, map };
    dirtyRef.current = true; // Mark for redraw
  }, [players, bombs, explosions, powerUps, map]);

  // Initialize audio and preloaded images
  useEffect(() => {
    audioManagerRef.current = new AudioManager();
    audioManagerRef.current.startBackground();

    // Pre-render tile images
    offscreenCanvasesRef.current = preloadImages();

    return () => {
      if (audioManagerRef.current) {
        audioManagerRef.current.stopAll();
      }

      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, []);

  // Socket event handler for power-up sounds
  useEffect(() => {
    if (!socket || !isConnected || !currentPlayerState) return;

    const handlePlayPowerUp = () => {
      if (audioManagerRef.current) {
        audioManagerRef.current.play("powerup");
      }
    };

    socket.on("playPowerUpSound", handlePlayPowerUp);

    return () => {
      socket.off("playPowerUpSound", handlePlayPowerUp);
    };
  }, [socket, isConnected, currentPlayerState]);

  // Keyboard input handler
  useEffect(() => {
    if (!socket || !isConnected || !currentPlayerState) return;

    // Keyboard handler with debouncing for movement broadcast
    let lastInputBroadcastTime = 0;
    const INPUT_BROADCAST_INTERVAL = 50; // ms

    const handleKey = (e: KeyboardEvent, isDown: boolean) => {
      // SPACE: only on initial keydown (no repeats)
      if (e.code === "Space") {
        if (isDown && !e.repeat) {
          socket.emit("placeBomb", {
            roomId: currentRoom?.id,
            x: Math.round(currentPlayerState.x),
            y: Math.round(currentPlayerState.y),
          });
        }
        e.preventDefault();
        return;
      }

      if (e.code === "KeyC") {
        inputRef.current.cheat = isDown;
        socket.emit("cheatMode", {
          roomId: currentRoom?.id,
          input: inputRef.current,
        });
        e.preventDefault();
        return;
      }

      // Movement keys
      let inputChanged = false;
      switch (e.code) {
        case "KeyW":
          if (inputRef.current.up !== isDown) {
            inputRef.current.up = isDown;
            inputChanged = true;
          }
          break;
        case "KeyS":
          if (inputRef.current.down !== isDown) {
            inputRef.current.down = isDown;
            inputChanged = true;
          }
          break;
        case "KeyA":
          if (inputRef.current.left !== isDown) {
            inputRef.current.left = isDown;
            inputChanged = true;
          }
          break;
        case "KeyD":
          if (inputRef.current.right !== isDown) {
            inputRef.current.right = isDown;
            inputChanged = true;
          }
          break;
        default:
          return; // ignore everything else
      }

      if (inputChanged) {
        const now = Date.now();

        // Throttle sending input to server
        if (now - lastInputBroadcastTime > INPUT_BROADCAST_INTERVAL) {
          socket.emit("playerInput", {
            roomId: currentRoom?.id,
            input: inputRef.current,
          });
          lastInputBroadcastTime = now;
        }
      }

      e.preventDefault();
    };

    // Create stable references for removal
    const onKeyDown = (e: KeyboardEvent) => handleKey(e, true);
    const onKeyUp = (e: KeyboardEvent) => handleKey(e, false);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [socket, isConnected, currentRoom, currentPlayerState]);

  // Socket game state update handler
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleGameUpdate = (gameState: any) => {
      setGameState(gameState);
    };

    socket.on("gameStateUpdate", handleGameUpdate);

    return () => {
      socket.off("gameStateUpdate", handleGameUpdate);
    };
  }, [socket, isConnected, setGameState]);

  // Optimized draw function using memoization and pre-rendered assets
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gameState = stateRef.current;
    if (!gameState) return;

    const { players, bombs, explosions, powerUps, map } = gameState;
    const offscreenCanvases = offscreenCanvasesRef.current;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    // Only redraw if state has changed
    if (!dirtyRef.current) return;
    dirtyRef.current = false;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw map using pre-rendered tiles for better performance
    if (offscreenCanvases) {
      for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
          const tileType = map[y][x];

          if (tileType === 0) {
            // Empty tile
            ctx.drawImage(
              offscreenCanvases.emptyTile,
              x * TILE_SIZE,
              y * TILE_SIZE,
            );
          } else if (tileType === 1) {
            // Indestructible wall
            ctx.drawImage(
              offscreenCanvases.indestructibleWall,
              x * TILE_SIZE,
              y * TILE_SIZE,
            );
          } else if (tileType === 2) {
            // Destructible wall
            ctx.drawImage(
              offscreenCanvases.destructibleWall,
              x * TILE_SIZE,
              y * TILE_SIZE,
            );
          }
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
        case "inv":
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
        case "inv":
          icon = "I";
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

    // Check for new explosions and play sound
    const haveNewExplosions = explosions.some((exp) => {
      return !previousExplosions.current.some(
        (prevExp) => exp.x === prevExp.x && exp.y === prevExp.y,
      );
    });

    if (haveNewExplosions && audioManagerRef.current) {
      audioManagerRef.current.play("explosion");
    }
    previousExplosions.current = explosions;

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
    players.forEach((player) => {
      if (!player.alive) return;

      const x = (player.x || 0) * TILE_SIZE;
      const y = (player.y || 0) * TILE_SIZE;

      // If player is invincible or in cheat mode, draw a glowing aura
      if (player.invincible || player.cheated) {
        ctx.save();
        ctx.strokeStyle = player.invincible
          ? "rgba(80,200,120,0.8)"
          : "rgba(200,80,200,0.8)";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(
          x + TILE_SIZE / 2,
          y + TILE_SIZE / 2,
          TILE_SIZE / 2 + 4,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
        ctx.restore();
      }

      // Player body fills the tile
      ctx.fillStyle = player.color;
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

      // Player outline
      ctx.strokeStyle = "#1a2e4a";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);

      // Avatar/Icon centered
      ctx.fillStyle = "#ffffff";
      ctx.font = "16px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(player.avatar, x + TILE_SIZE / 2, y + TILE_SIZE / 2);

      // Highlight current player
      if (player.username === currentPlayer?.username) {
        ctx.strokeStyle = "#ffcc00";
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
      }
    });
  }, [currentPlayer?.username]);

  // Animation loop with frame limiting
  useEffect(() => {
    const animate = (timestamp: number) => {
      // Limit frame rate for better performance
      if (timestamp - lastFrameTimeRef.current >= FRAME_TIME) {
        draw();
        lastFrameTimeRef.current = timestamp;
      }

      animationFrameIdRef.current = requestAnimationFrame(animate);
    };

    animationFrameIdRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameIdRef.current);
    };
  }, [draw]);

  return (
    <div className="game-canvas-container">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="pixel-canvas m-auto"
      />
      {currentPlayerState && !currentPlayerState.alive && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <span className="text-white text-4xl font-bold">Game Over</span>
        </div>
      )}
    </div>
  );
}
