import { PlayerState } from "@/state/gameState";
import { Trophy, Crown, Medal, Star } from "lucide-react";

interface GameLeaderboardProps {
  players: PlayerState[];
}

export default function GameLeaderboard({ players }: GameLeaderboardProps) {
  // Sort players by score
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 0:
        return <Crown className="h-4 w-4 text-[#ffcc00]" />;
      case 1:
        return <Trophy className="h-4 w-4 text-[#c0c0c0]" />;
      case 2:
        return <Medal className="h-4 w-4 text-[#cd7f32]" />;
      default:
        return <Star className="h-4 w-4 text-[#8aa8d0]" />;
    }
  };

  return (
    <div className="pixel-container bg-[#2a4a7f] p-1 h-full">
      <div className="pixel-inner bg-[#4a6ea5] p-4 h-full flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl text-white font-bold pixel-title">
            LEADERBOARD
          </h2>
          <div className="text-[#8aa8d0] text-xs pixel-text">Live Scores</div>
        </div>

        <div className="flex-grow overflow-auto leaderboard-container space-y-2">
          {sortedPlayers.map((player, index) => (
            <div
              key={player.username}
              className={`bg-[#2a4a7f] p-2 pixel-leaderboard-item ${!player.alive ? "opacity-50" : ""}`}
              style={{ borderLeft: `4px solid ${player.color}` }}
            >
              <div className="flex items-center">
                <div className="flex items-center justify-center w-6 mr-2">
                  {getRankIcon(index)}
                </div>
                <div className="mr-2">{player.avatar}</div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="text-white font-bold pixel-text">
                      {player.username}
                    </span>
                    <span className="text-[#ffcc00] pixel-text">
                      {player.score}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#8aa8d0] pixel-text">
                      {player.alive ? "Alive" : "Defeated"}
                    </span>
                    <span className="text-[#8aa8d0] pixel-text">
                      K: {player.kills} 
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
