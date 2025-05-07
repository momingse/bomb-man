import { GameState } from "@/state/gameState";

export const endGameRequest = async (gameState: GameState) => {
  try {
    const response = await fetch("/api/game/end", {
      method: "POST",
      credentials: "include",
    });

    return response;
  } catch (err) {
    throw err;
  }
};
