import { useGameState } from "@/state/gameState";
import { usePlayersStore } from "@/state/player";
import { useEffect, useRef, useState } from "react";
import { useSocket } from "../SocketProvier";
import { useRoomStore } from "@/state/room";

const TILE_SIZE = 40;
const GRID_WIDTH = 15;
const GRID_HEIGHT = 13;
const CANVAS_WIDTH = GRID_WIDTH * TILE_SIZE;
const CANVAS_HEIGHT = GRID_HEIGHT * TILE_SIZE;

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastUpdateTimeRef = useRef<number>(0);

  const { players, bombs, explosions, powerUps, map, setGameState } =
    useGameState();
  const { currentRoom } = useRoomStore();
  const { player: currentPlayer } = usePlayersStore();
  const currentPlayerState = players.find(
    (player) => player.username === currentPlayer?.username,
  );

  const { socket, isConnected } = useSocket();
  const inputRef = useRef({
    up: false,
    down: false,
    left: false,
    right: false,
  });

  useEffect(() => {
    if (!socket || !isConnected || !currentPlayerState) return;

    // Master key handler
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

      // Movement keys
      switch (e.code) {
        case "KeyW":
          inputRef.current.up = isDown;
          break;
        case "KeyS":
          inputRef.current.down = isDown;
          break;
        case "KeyA":
          inputRef.current.left = isDown;
          break;
        case "KeyD":
          inputRef.current.right = isDown;
          break;
        default:
          return; // ignore everything else
      }

      // broadcast new input
      socket.emit("playerInput", {
        roomId: currentRoom?.id,
        input: inputRef.current,
      });
      e.preventDefault();
    };

    // create stable references for removal
    const onKeyDown = (e: KeyboardEvent) => handleKey(e, true);
    const onKeyUp = (e: KeyboardEvent) => handleKey(e, false);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [socket, isConnected, currentRoom, currentPlayerState]);

  useEffect(() => {
    if (!socket || !isConnected) return;
    socket.on("gameStateUpdate", (gameState) => {
      setGameState(gameState);
    });
  }, [socket, isConnected]);

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
        const tileType = map[y][x];

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

      // Explosion prticles
      ctx.fillStyle = `rgb(255, 204, 0, ${alpha})`;
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
  };

  useEffect(() => {
    let animationFrameId: number;

    const animate = () => {
      draw();
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [players, bombs, explosions, powerUps, map]);

  return (
    <div className="game-canvas-container">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="pixel-canvas m-auto"
      />
    </div>
  );
}
