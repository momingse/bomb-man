import { create } from "zustand";

type State = {
  onlinePlayers: {
    username: string;
    avatar: string;
  }[];
};

type Actions = {
  setPlayers: (players: { username: string; avatar: string }[]) => void;
  removePlayer: (username: string) => void;
  voidPlayers: () => void;
};

export const useOnlinePlayers = create<State & Actions>()((set) => ({
  onlinePlayers: [],
  setPlayers: (players) => set({ onlinePlayers: players }),
  removePlayer: (username) =>
    set((state) => ({
      onlinePlayers: state.onlinePlayers.filter(
        (player) => player.username !== username,
      ),
    })),
  voidPlayers: () => set({ onlinePlayers: [] }),
}));
