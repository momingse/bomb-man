const PLAYERS_COLORS = ["#e83b3b", "#3b82e8", "#50c878", "#ffcc00"];

export const getPlayerColor = (playerOrder: number) => {
  return PLAYERS_COLORS[playerOrder % PLAYERS_COLORS.length];
};
