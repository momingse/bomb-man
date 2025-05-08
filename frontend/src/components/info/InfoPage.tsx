import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bomb,
  Play,
  Info,
  Gamepad2,
  Trophy,
  ArrowRight,
  Flame,
  Star,
  KeyRound,
} from "lucide-react";
import { useNavigate } from "react-router";

export default function IntroPage() {
  const [activeTab, setActiveTab] = useState("description");

  const navigate = useNavigate();

  const startGame = () => {
    navigate("/playground");
  };

  return (
    <div className="min-h-screen bg-[#1a2e4a] p-4 flex flex-col items-center justify-center">
      <div className="max-w-4xl w-full">
        {/* Header with Logo */}
        <header className="pixel-container bg-[#2a4a7f] p-1 mb-6">
          <div className="pixel-inner bg-[#4a6ea5] p-4 flex justify-center items-center">
            <div className="pixel-logo-container">
              <div className="pixel-logo text-2xl md:text-3xl">
                <span className="text-white">BOMB</span>
                <span className="text-[#ffcc00]">MAN</span>
              </div>
            </div>
            <div className="ml-4">
              <h1 className="text-white font-bold text-xl md:text-3xl pixel-title">
                BATTLE
              </h1>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="pixel-container bg-[#2a4a7f] p-1 mb-6">
          <div className="pixel-inner bg-[#4a6ea5] p-6">
            <Tabs
              defaultValue="description"
              className="w-full"
              onValueChange={setActiveTab}
            >
              <TabsList className="grid w-full grid-cols-2 mb-6 pixel-tabs">
                <TabsTrigger value="description" className="pixel-tab">
                  <Info className="h-4 w-4 mr-2" />
                  Game Description
                </TabsTrigger>
                <TabsTrigger value="howtoplay" className="pixel-tab">
                  <Gamepad2 className="h-4 w-4 mr-2" />
                  How to Play
                </TabsTrigger>
              </TabsList>

              <TabsContent value="description" className="space-y-6">
                <div className="flex flex-col md:flex-row gap-6 items-center">
                  <div className="w-full md:w-1/2">
                    <h2 className="text-xl text-[#ffcc00] font-bold mb-4 pixel-title">
                      GAME DESCRIPTION
                    </h2>
                    <p className="text-white pixel-text leading-relaxed">
                      Bombman Battle is a fast-paced, two-player multiplayer
                      game inspired by classic Bomberman. Each player starts at
                      opposite corners of a maze-like arena filled with walls.
                      Players place bombs to destroy obstacles, collect special
                      items, and try to eliminate the other player. The last
                      player standing wins!
                    </p>
                  </div>
                  <div className="w-full md:w-1/2 flex justify-center">
                    <div className="pixel-game-preview">
                      <div className="grid grid-cols-5 grid-rows-5 gap-1">
                        {Array.from({ length: 25 }).map((_, index) => {
                          // Create a simple game board preview
                          const isWall = [
                            1, 3, 5, 7, 9, 11, 13, 15, 17, 19,
                          ].includes(index);
                          const isPlayer1 = index === 0;
                          const isPlayer2 = index === 24;
                          const isBomb = index === 6;
                          const isExplosion = [7, 11, 16].includes(index);

                          return (
                            <div
                              key={index}
                              className={`w-12 h-12 flex items-center justify-center ${
                                isWall
                                  ? "bg-[#1a2e4a]"
                                  : isExplosion
                                    ? "bg-[#e83b3b]"
                                    : "bg-[#4a6ea5] border border-[#3b5c8f]"
                              }`}
                            >
                              {isPlayer1 && (
                                <div className="w-8 h-8 bg-[#e83b3b] flex items-center justify-center text-white">
                                  P1
                                </div>
                              )}
                              {isPlayer2 && (
                                <div className="w-8 h-8 bg-[#3b82e8] flex items-center justify-center text-white">
                                  P2
                                </div>
                              )}
                              {isBomb && (
                                <Bomb className="h-8 w-8 text-[#1a1a1a]" />
                              )}
                              {isExplosion && (
                                <Flame className="h-8 w-8 text-[#ffcc00]" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#2a4a7f] p-4 pixel-stats-box">
                  <h3 className="text-[#ffcc00] font-bold pixel-text mb-2">
                    GAME FEATURES:
                  </h3>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <Bomb className="h-4 w-4 text-[#ffcc00] mr-2 mt-1" />
                      <span className="text-white pixel-text">
                        Strategic bomb placement to trap opponents
                      </span>
                    </li>
                    <li className="flex items-start">
                      <Flame className="h-4 w-4 text-[#e83b3b] mr-2 mt-1" />
                      <span className="text-white pixel-text">
                        Explosive chain reactions
                      </span>
                    </li>
                    <li className="flex items-start">
                      <Star className="h-4 w-4 text-[#ffcc00] mr-2 mt-1" />
                      <span className="text-white pixel-text">
                        Power-ups to enhance your abilities
                      </span>
                    </li>
                    <li className="flex items-start">
                      <Trophy className="h-4 w-4 text-[#ffcc00] mr-2 mt-1" />
                      <span className="text-white pixel-text">
                        Intense multiplayer battles
                      </span>
                    </li>
                  </ul>
                </div>
              </TabsContent>

              <TabsContent value="howtoplay" className="space-y-6">
                <h2 className="text-xl text-[#ffcc00] font-bold mb-4 pixel-title">
                  HOW TO PLAY
                </h2>

                <div className="bg-[#2a4a7f] p-4 pixel-stats-box mb-4">
                  <h3 className="text-[#ffcc00] font-bold pixel-text mb-2">
                    OBJECTIVE:
                  </h3>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <ArrowRight className="h-4 w-4 text-[#ffcc00] mr-2 mt-1" />
                      <span className="text-white pixel-text">
                        Defeat your opponent by blowing them up with your bombs.
                      </span>
                    </li>
                    <li className="flex items-start">
                      <ArrowRight className="h-4 w-4 text-[#ffcc00] mr-2 mt-1" />
                      <span className="text-white pixel-text">
                        Avoid getting caught in your own or your opponent's
                        explosions.
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="bg-[#2a4a7f] p-4 pixel-stats-box mb-4">
                  <h3 className="text-[#ffcc00] font-bold pixel-text mb-2">
                    CONTROLS:
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#1a2e4a] p-3">
                      <h4 className="text-white font-bold pixel-text mb-2">
                        Player 1:
                      </h4>
                      <p className="text-[#8aa8d0] pixel-text">
                        Move:{" "}
                        <span className="text-white">
                          W (up), A (left), S (down), D (right)
                        </span>
                      </p>
                      <p className="text-[#8aa8d0] pixel-text mt-1">
                        Place Bomb: <span className="text-white">Spacebar</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#2a4a7f] p-4 pixel-stats-box mb-4">
                  <h3 className="text-[#ffcc00] font-bold pixel-text mb-2">
                    GAMEPLAY RULES:
                  </h3>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <Bomb className="h-4 w-4 text-[#ffcc00] mr-2 mt-1" />
                      <span className="text-white pixel-text">
                        Bombs explode 1 block in 4 directions (up, down, left,
                        right) after a few seconds.
                      </span>
                    </li>
                    <li className="flex items-start">
                      <Bomb className="h-4 w-4 text-[#ffcc00] mr-2 mt-1" />
                      <span className="text-white pixel-text">
                        Destroyable walls can be cleared with explosions.
                      </span>
                    </li>
                  </ul>

                  <h4 className="text-[#ffcc00] font-bold pixel-text mt-4 mb-2">
                    Special items may appear when walls are destroyed:
                  </h4>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <Flame className="h-4 w-4 text-[#e83b3b] mr-2 mt-1" />
                      <span className="text-white pixel-text">
                        <span className="text-[#e83b3b] font-bold">
                          Bomb Range Up:
                        </span>{" "}
                        increases bomb explosion range
                      </span>
                    </li>
                    <li className="flex items-start">
                      <Star className="h-4 w-4 text-[#ffcc00] mr-2 mt-1" />
                      <span className="text-white pixel-text">
                        <span className="text-[#ffcc00] font-bold">
                          Invincibility Star:
                        </span>{" "}
                        makes you immune to the next explosion
                      </span>
                    </li>
                  </ul>

                  <p className="text-white pixel-text mt-4">
                    A player loses if they are hit by an explosion.
                  </p>
                </div>

                <div className="bg-[#2a4a7f] p-4 pixel-stats-box mb-4">
                  <h3 className="text-[#ffcc00] font-bold pixel-text mb-2">
                    WINNING:
                  </h3>
                  <p className="text-white pixel-text">
                    Be the last player alive to win the game.
                  </p>
                </div>

                <div className="bg-[#2a4a7f] p-4 pixel-stats-box">
                  <h3 className="text-[#ffcc00] font-bold pixel-text mb-2 flex items-center">
                    <KeyRound className="h-4 w-4 mr-2" />
                    CHEAT MODE:
                  </h3>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <ArrowRight className="h-4 w-4 text-[#ffcc00] mr-2 mt-1" />
                      <span className="text-white pixel-text">
                        Activate cheat mode by pressing the secret key C.
                      </span>
                    </li>
                    <li className="flex items-start">
                      <ArrowRight className="h-4 w-4 text-[#ffcc00] mr-2 mt-1" />
                      <span className="text-white pixel-text">
                        Grants temporary invincibility.
                      </span>
                    </li>
                    <li className="flex items-start">
                      <ArrowRight className="h-4 w-4 text-[#ffcc00] mr-2 mt-1" />
                      <span className="text-white pixel-text">
                        Press C again to deactivate.
                      </span>
                    </li>
                  </ul>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Start Game Button */}
        <div className="flex justify-center">
          <Button
            onClick={startGame}
            className="pixel-button bg-[#e83b3b] hover:bg-[#c52f2f] text-white px-8 py-6 text-lg"
          >
            <Play className="h-6 w-6 mr-2" />
            START GAME
          </Button>
        </div>

        {/* Footer */}
        <footer className="mt-6 text-center text-[#8aa8d0] pixel-text">
          <div className="flex justify-center items-center">
            <Bomb className="h-4 w-4 text-[#ffcc00] mr-2" />
            <span>
              Press the START GAME button to begin your Bombman Battle
              adventure!
            </span>
            <Bomb className="h-4 w-4 text-[#ffcc00] ml-2" />
          </div>
        </footer>
      </div>
    </div>
  );
}
