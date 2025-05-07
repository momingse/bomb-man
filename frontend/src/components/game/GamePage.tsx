import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Bomb,
  Clock,
  Flame,
  Heart,
  Settings,
  Shield,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import GameCanvas from "./GameCanvas";
import GameControls from "./GameControls";
import GameLeaderboard from "./GameLeaderboard";
import GamePowerups from "./GamePowerUps";
import { useGameState } from "@/state/gameState";
import { usePlayersStore } from "@/state/player";
import { useRoomStore } from "@/state/room";
import { useSocket } from "../SocketProvier";

export default function GamePage() {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(3);
  const [gameTime, setGameTime] = useState(180); // 3 minutes in seconds
  const [isPaused, setIsPaused] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const gameTimeRef = useRef<NodeJS.Timeout | null>(null);

  const { players, startedTime } = useGameState();
  const { player: currentPlayer } = usePlayersStore();
  const { currentRoom } = useRoomStore();

  const currentPlayerState = players.find(
    (_player) => _player.username === currentPlayer?.username,
  );

  const navigate = useNavigate();

  const { socket, isConnected } = useSocket();

  // Game settings
  const [gameSettings, setGameSettings] = useState({
    mapName: "Classic Arena",
    gameMode: "Battle Royale",
    timeLimit: 180, // 3 minutes
    powerUps: true,
  });

  // Handle countdown
  useEffect(() => {
    if (countdown === null) return;

    if (players.length < 2) {
      navigate("/playground");
    }

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setGameStarted(true);
      setCountdown(null);
    }
  }, [countdown]);

  // Game timer
  useEffect(() => {
    if (!gameStarted || gameOver || isPaused) return;

    gameTimeRef.current = setInterval(() => {
      setGameTime((prevTime) => {
        if (prevTime <= 1) {
          // Game over when time runs out
          clearInterval(gameTimeRef.current as NodeJS.Timeout);
          setGameOver(true);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => {
      if (gameTimeRef.current) clearInterval(gameTimeRef.current);
    };
  }, [gameStarted, gameOver, isPaused]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Exit game
  const exitGame = () => {
    if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    if (gameTimeRef.current) clearInterval(gameTimeRef.current);
    if (!socket || !isConnected) return;

    socket.emit("leaveRoom", { roomId: currentRoom?.id });
    navigate("/playground");
  };

  return (
    <div className="min-h-screen bg-[#1a2e4a] p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header with Logo and Game Info */}
        <header className="pixel-container bg-[#2a4a7f] p-1 mb-4">
          <div className="pixel-inner bg-[#4a6ea5] p-4 flex justify-between items-center">
            <div className="flex items-center">
              <div className="pixel-logo-container mr-4">
                <div className="pixel-logo text-sm sm:text-base md:text-xl">
                  <span className="text-white">BOMB</span>
                  <span className="text-[#ffcc00]">MAN</span>
                </div>
              </div>
              <div>
                <h1 className="text-white font-bold text-lg md:text-2xl pixel-title">
                  GAME ARENA
                </h1>
                <p className="text-[#ffcc00] text-xs sm:text-sm pixel-text">
                  {currentRoom?.name}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="pixel-button bg-[#2a4a7f] text-white"
                onClick={() => setShowControls(!showControls)}
              >
                <Settings className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Controls</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="pixel-button bg-[#e83b3b] text-white hover:bg-[#c52f2f]"
                onClick={exitGame}
              >
                <X className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Exit</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Game Dashboard - Top Bar */}
        <div className="pixel-container bg-[#2a4a7f] p-1 mb-4">
          <div className="pixel-inner bg-[#4a6ea5] p-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Player Info */}
              <div className="bg-[#2a4a7f] p-2 pixel-stats-box flex flex-col justify-center">
                <div className="flex items-center">
                  <div
                    className="w-10 h-10 flex items-center justify-center mr-3"
                    style={{
                      backgroundColor: currentPlayerState?.color,
                      border: "2px solid #1a2e4a",
                    }}
                  >
                    <span className="text-2xl">
                      {currentPlayerState?.avatar}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-bold pixel-text">
                      {currentPlayerState?.username}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#ffcc00] text-xs pixel-text">
                        Score: {currentPlayerState?.score}
                      </span>
                      <span className="text-[#ffcc00] text-xs pixel-text">
                        <Heart className="h-3 w-3 inline mr-1 text-[#e83b3b]" />
                        {currentPlayerState?.alive ? "Alive" : "Defeated"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Game Timer */}
              <div className="bg-[#2a4a7f] p-2 pixel-stats-box flex flex-col items-center justify-center">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-[#ffcc00]" />
                  <span className="text-white font-bold text-xl pixel-timer">
                    {formatTime(gameTime)}
                  </span>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-[#2a4a7f] p-2 pixel-stats-box">
                <h3 className="text-[#ffcc00] font-bold pixel-text text-sm mb-1 text-center">
                  ABILITIES
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="ability-stat">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Bomb className="h-3 w-3 text-[#ffcc00] mr-1" />
                        <span className="text-white text-xs pixel-text">
                          Bombs:
                        </span>
                      </div>
                      <div className="ability-value">
                        {Array.from({
                          length: 5 - (currentPlayerState?.maxBombs || 0),
                        }).map((_, i) => (
                          <span key={i} className="text-[#2a4a7f]">
                            ○
                          </span>
                        ))}
                        {Array.from({
                          length: currentPlayerState?.maxBombs || 0,
                        }).map((_, i) => (
                          <span key={i} className="text-[#ffcc00]">
                            ●
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="ability-stat">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Flame className="h-3 w-3 text-[#e83b3b] mr-1" />
                        <span className="text-white text-xs pixel-text">
                          Range:
                        </span>
                      </div>
                      <div className="ability-value">
                        {" "}
                        {Array.from({
                          length: 6 - (currentPlayerState?.blastRange || 0),
                        }).map((_, i) => (
                          <span key={i} className="text-[#2a4a7f]">
                            ○
                          </span>
                        ))}
                        {Array.from({
                          length: currentPlayerState?.blastRange || 0,
                        }).map((_, i) => (
                          <span key={i} className="text-[#e83b3b]">
                            ●
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="ability-stat">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <ArrowRight className="h-3 w-3 text-[#3b82e8] mr-1" />
                        <span className="text-white text-xs pixel-text">
                          Speed:
                        </span>
                      </div>
                      <div className="ability-value">
                        {Array.from({
                          length:
                            10 - Math.floor(currentPlayerState?.speed || 0 * 5),
                        }).map((_, i) => (
                          <span key={i} className="text-[#2a4a7f]">
                            ○
                          </span>
                        ))}
                        {Array.from({
                          length: Math.floor(
                            currentPlayerState?.speed || 0 * 5,
                          ),
                        }).map((_, i) => (
                          <span key={i} className="text-[#3b82e8]">
                            ●
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="ability-stat">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Shield className="h-3 w-3 text-[#50c878] mr-1" />
                        <span className="text-white text-xs pixel-text">
                          Invincible:
                        </span>
                      </div>
                      <span
                        className={`text-xs pixel-text ${currentPlayerState?.invincible ? "text-[#50c878] font-bold" : "text-[#8aa8d0]"}`}
                      >
                        {currentPlayerState?.invincible ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Game Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Sidebar - Leaderboard */}
          <div className="lg:col-span-3 order-3 lg:order-1">
            <GameLeaderboard players={players} />
          </div>

          {/* Main Game Area */}
          <div className="lg:col-span-6 order-1 lg:order-2">
            <div className="pixel-container bg-[#2a4a7f] p-1">
              <div className="pixel-inner bg-[#4a6ea5] p-4">
                {!gameStarted && !gameOver ? (
                  <div className="text-center py-8">
                    {countdown !== null && (
                      <div className="pixel-countdown">
                        <h2 className="text-2xl text-white font-bold pixel-title">
                          GAME STARTING IN
                        </h2>
                        <div className="text-6xl text-[#ffcc00] font-bold mt-2 countdown-number">
                          {countdown}
                        </div>
                        <p className="text-white pixel-text mt-2">
                          Get ready to play!
                        </p>
                      </div>
                    )}
                  </div>
                ) : gameOver ? (
                  <div className="text-center py-8 pixel-game-over">
                    <h2 className="text-3xl text-white font-bold pixel-title mb-4">
                      GAME OVER
                    </h2>

                    {/* Winner display */}
                    {players.filter((p) => p.alive).length > 0 ? (
                      <div className="mb-6">
                        <p className="text-[#ffcc00] pixel-text mb-2">
                          Winner:
                        </p>
                        {players
                          .filter((p) => p.alive)
                          .map((winner) => (
                            <div
                              key={winner.username}
                              className="flex items-center justify-center"
                            >
                              <div
                                className="w-12 h-12 flex items-center justify-center mr-3"
                                style={{
                                  backgroundColor: winner.color,
                                  border: "2px solid #1a2e4a",
                                }}
                              >
                                <span className="text-3xl">
                                  {winner.avatar}
                                </span>
                              </div>
                              <div className="text-white font-bold text-xl pixel-text">
                                {winner.username}
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-[#ffcc00] pixel-text mb-6">
                        It's a draw! No survivors!
                      </p>
                    )}

                    <div className="flex justify-center space-x-4">
                      <Button
                        className="pixel-button bg-[#2a4a7f]"
                        onClick={exitGame}
                      >
                        Exit to Lobby
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    {isPaused && (
                      <div className="absolute inset-0 bg-[rgba(26,46,74,0.8)] flex items-center justify-center z-10">
                        <div className="text-center">
                          <h3 className="text-2xl text-white font-bold pixel-title mb-2">
                            GAME PAUSED
                          </h3>
                        </div>
                      </div>
                    )}
                    <GameCanvas />
                  </div>
                )}
              </div>
            </div>

            {/* Controls - Only shown when requested */}
            {showControls && (
              <div className="mt-4 pixel-container bg-[#2a4a7f] p-1">
                <div className="pixel-inner bg-[#4a6ea5] p-4">
                  <GameControls />
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar - Game Stats & Power-ups */}
          <div className="lg:col-span-3 order-2 lg:order-3">
            <div className="h-full flex flex-col space-y-4">
              <div className="flex-grow pixel-container bg-[#2a4a7f] p-1 min-h-[200px]">
                <div className="pixel-inner bg-[#4a6ea5] p-4 h-full">
                  <GamePowerups />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-6 pixel-container bg-[#2a4a7f] p-1">
          <div className="pixel-inner bg-[#4a6ea5] p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <Bomb className="h-5 w-5 text-[#ffcc00] mr-2" />
                <span className="text-white pixel-text">
                  BOMB MAN Game Arena
                </span>
              </div>
              <div className="text-[#8aa8d0] text-xs pixel-text">
                Players Alive: {players.filter((p) => p.alive).length} /{" "}
                {players.length}
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
