import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Player = {
  id: string;
  username: string;
  avatar: string;
  wins: number;
  gamesPlayed: number;
  rank: number;
};

type State = {
  player: Player | null;
};

type Actions = {
  setPlayer: (player: Player) => void;
  voidPlayers: () => void;
};

export const usePlayersStore = create<State & Actions>()((set) => ({
  player: {
    id: "",
    username: "",
    avatar: "",
    wins: 0,
    gamesPlayed: 0,
    rank: 0,
  },
  setPlayer: (player: Player) => set({ player }),
  voidPlayers: () => set({ player: null }),
}));
