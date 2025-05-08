import { GameState, useGameState } from "@/state/gameState";
import { usePlayersStore } from "@/state/player";
import { useRoomStore } from "@/state/room";
import { useEffect, useRef, useMemo, useCallback } from "react";
import { useSocket } from "../SocketProvier";

// Constants (static)
const TILE_SIZE = 40;
const GRID_WIDTH = 15;
const GRID_HEIGHT = 13;
const CANVAS_WIDTH = GRID_WIDTH * TILE_SIZE;
const CANVAS_HEIGHT = GRID_HEIGHT * TILE_SIZE;
const FPS = 60;
const FRAME_TIME = 1000 / FPS;
const INPUT_BROADCAST_INTERVAL = 50;

// Pre-rendered assets (single-run)
const offscreenCanvases = (() => {
  const cvs: Record<string, HTMLCanvasElement> = {
    empty: document.createElement("canvas"),
    indestructible: document.createElement("canvas"),
    destructible: document.createElement("canvas"),
  };
  Object.values(cvs).forEach((c) => {
    c.width = TILE_SIZE;
    c.height = TILE_SIZE;
  });
  // empty
  const e = cvs.empty.getContext("2d")!;
  e.fillStyle = "#4a6ea5";
  e.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  e.strokeStyle = "#3b5c8f";
  e.lineWidth = 1;
  e.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
  // indestructible
  const i = cvs.indestructible.getContext("2d")!;
  i.fillStyle = "#1a2e4a";
  i.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  i.fillStyle = "#0f1a2a";
  i.fillRect(2, 2, TILE_SIZE - 4, TILE_SIZE - 4);
  // destructible
  const d = cvs.destructible.getContext("2d")!;
  d.fillStyle = "#8aa8d0";
  d.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  d.strokeStyle = "#4a6ea5";
  d.lineWidth = 2;
  d.beginPath();
  d.moveTo(10, 10);
  d.lineTo(TILE_SIZE - 10, TILE_SIZE - 10);
  d.stroke();
  d.beginPath();
  d.moveTo(TILE_SIZE - 10, 10);
  d.lineTo(10, TILE_SIZE - 10);
  d.stroke();
  return cvs;
})();

// Audio manager
class AudioManager {
  private sounds: Record<string, HTMLAudioElement> = {};
  private enabled = true;
  constructor() {
    ["background", "powerup", "explosion"].forEach((name) => {
      const audio = new Audio(`/${name}.mp3`);
      if (name === "background") {
        audio.loop = true;
        audio.volume = 0.2;
      }
      audio.load();
      this.sounds[name] = audio;
    });
  }
  play(name: string) {
    if (!this.enabled) return;
    const audio = this.sounds[name];
    if (!audio) return;
    if (name === "powerup" || name === "explosion") {
      const clone = audio.cloneNode() as HTMLAudioElement;
      clone.play().catch(() => {});
      clone.onended = () => clone.remove();
    } else {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  }
  start() {
    this.play("background");
  }
  stopAll() {
    Object.values(this.sounds).forEach((a) => {
      a.pause();
      a.currentTime = 0;
    });
  }
  setEnabled(v: boolean) {
    this.enabled = v;
    if (!v) this.stopAll();
  }
}

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastTime = useRef(0);
  const rafId = useRef(0);
  const audioMgr = useRef<AudioManager | null>(null);
  const prevExplosions = useRef<GameState["explosions"]>([]);
  const dirty = useRef(true);
  const stateRef = useRef<
    Pick<GameState, "players" | "bombs" | "explosions" | "powerUps" | "map">
  >({
    players: [],
    bombs: [],
    explosions: [],
    powerUps: [],
    map: [],
  } as any);

  const { players, bombs, explosions, powerUps, map, setGameState } =
    useGameState();
  const { currentRoom } = useRoomStore();
  const { player: me } = usePlayersStore();

  // find current player once per change
  const meState = useMemo(
    () => players.find((p) => p.username === me?.username),
    [players, me?.username],
  );

  const { socket, isConnected } = useSocket();
  const input = useRef({
    up: false,
    down: false,
    left: false,
    right: false,
    cheat: false,
  });
  const lastBroadcast = useRef(0);

  // sync state
  useEffect(() => {
    stateRef.current = { players, bombs, explosions, powerUps, map };
    dirty.current = true;
  }, [players, bombs, explosions, powerUps, map]);

  // init audio
  useEffect(() => {
    audioMgr.current = new AudioManager();
    audioMgr.current.start();
    return () => {
      audioMgr.current?.stopAll();
      cancelAnimationFrame(rafId.current);
    };
  }, []);

  // socket handlers
  useEffect(() => {
    if (!socket || !isConnected || !meState) return;
    const pwr = () => audioMgr.current?.play("powerup");
    socket.on("playPowerUpSound", pwr);
    return () => {
      socket.off("playPowerUpSound", pwr);
    };
  }, [socket, isConnected, meState]);

  useEffect(() => {
    if (!socket || !isConnected) return;
    const onUpdate = (gs: GameState) => setGameState(gs);
    socket.on("gameStateUpdate", onUpdate);
    return () => {
      socket.off("gameStateUpdate", onUpdate);
    };
  }, [socket, isConnected, setGameState]);

  // keyboard
  useEffect(() => {
    if (!socket || !isConnected || !meState) return;
    const handler = (e: KeyboardEvent, down: boolean) => {
      if (e.code === "Space" && down && !e.repeat) {
        socket.emit("placeBomb", {
          roomId: currentRoom?.id,
          x: Math.round(meState.x),
          y: Math.round(meState.y),
        });
        e.preventDefault();
        return;
      }
      if (e.code === "KeyC") {
        input.current.cheat = down;
        socket.emit("cheatMode", {
          roomId: currentRoom?.id,
          input: input.current,
        });
        e.preventDefault();
        return;
      }
      let changed = false;
      if (e.code === "KeyW")
        (changed = input.current.up !== down), (input.current.up = down);
      else if (e.code === "KeyS")
        (changed = input.current.down !== down), (input.current.down = down);
      else if (e.code === "KeyA")
        (changed = input.current.left !== down), (input.current.left = down);
      else if (e.code === "KeyD")
        (changed = input.current.right !== down), (input.current.right = down);
      else return;
      if (changed) {
        const now = Date.now();
        if (now - lastBroadcast.current > INPUT_BROADCAST_INTERVAL) {
          socket.emit("playerInput", {
            roomId: currentRoom?.id,
            input: input.current,
          });
          lastBroadcast.current = now;
        }
      }
      e.preventDefault();
    };
    const down = (e: KeyboardEvent) => handler(e, true);
    const up = (e: KeyboardEvent) => handler(e, false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [socket, isConnected, currentRoom, meState]);

  // draw loop
  const draw = useCallback(() => {
    if (!dirty.current) return;
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d", { alpha: false });
    if (!ctx) return;
    dirty.current = false;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const { players, bombs, explosions, powerUps, map } = stateRef.current;

    // map
    for (let y = 0; y < GRID_HEIGHT; y++) {
      const row = map[y];
      for (let x = 0; x < GRID_WIDTH; x++) {
        const tile = row[x];
        const img =
          tile === 1
            ? offscreenCanvases.indestructible
            : tile === 2
              ? offscreenCanvases.destructible
              : offscreenCanvases.empty;
        ctx.drawImage(img, x * TILE_SIZE, y * TILE_SIZE);
      }
    }

    // power-ups
    powerUps.forEach(({ x, y, type, collected }) => {
      if (collected) return;
      const cx = x * TILE_SIZE + TILE_SIZE / 2;
      const cy = y * TILE_SIZE + TILE_SIZE / 2;
      const colors: Record<string, string> = {
        speed: "#ffcc00",
        range: "#e83b3b",
        bombs: "#3b82e8",
        inv: "#50c878",
      };
      const icons: Record<string, string> = {
        speed: "S",
        range: "R",
        bombs: "B",
        inv: "I",
      };
      ctx.fillStyle = colors[type];
      ctx.beginPath();
      ctx.arc(cx, cy, TILE_SIZE / 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "12px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(icons[type] || "?", cx, cy);
    });

    // bombs
    bombs.forEach(({ x, y, timer }) => {
      const cx = x * TILE_SIZE + TILE_SIZE / 2;
      const cy = y * TILE_SIZE + TILE_SIZE / 2;
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath();
      ctx.arc(cx, cy, TILE_SIZE / 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#e83b3b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy - TILE_SIZE / 3);
      ctx.lineTo(cx, cy - TILE_SIZE / 2);
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(Math.ceil(timer).toString(), cx, cy);
    });

    // explosions & sound
    const newExp = explosions.some(
      (e) => !prevExplosions.current.some((p) => p.x === e.x && p.y === e.y),
    );
    if (newExp) audioMgr.current?.play("explosion");
    prevExplosions.current = explosions;
    explosions.forEach(({ x, y, timer }) => {
      const alpha = timer * 2;
      ctx.fillStyle = `rgba(232,59,59,${alpha})`;
      ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      ctx.fillStyle = `rgba(255,204,0,${alpha})`;
      ctx.beginPath();
      ctx.arc(
        x * TILE_SIZE + TILE_SIZE / 2,
        y * TILE_SIZE + TILE_SIZE / 2,
        TILE_SIZE / 4,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    });

    // players
    players.forEach((p) => {
      if (!p.alive) return;
      const x = (p.x || 0) * TILE_SIZE;
      const y = (p.y || 0) * TILE_SIZE;
      if (p.invincible || p.cheated) {
        ctx.save();
        ctx.strokeStyle = p.invincible
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
      ctx.fillStyle = p.color;
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      ctx.strokeStyle = "#1a2e4a";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
      ctx.fillStyle = "#fff";
      ctx.font = "16px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.avatar, x + TILE_SIZE / 2, y + TILE_SIZE / 2);
      if (p.username === me?.username) {
        ctx.strokeStyle = "#ffcc00";
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
      }
    });
  }, [me?.username]);

  // animation
  useEffect(() => {
    const loop = (t: number) => {
      if (t - lastTime.current >= FRAME_TIME) {
        draw();
        lastTime.current = t;
      }
      rafId.current = requestAnimationFrame(loop);
    };
    rafId.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId.current);
  }, [draw]);

  return (
    <div className="game-canvas-container">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="pixel-canvas m-auto"
      />
      {meState && !meState.alive && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <span className="text-white text-4xl font-bold">Game Over</span>
        </div>
      )}
    </div>
  );
}
