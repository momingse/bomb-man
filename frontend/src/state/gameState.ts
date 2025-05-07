import { create } from "zustand";

export type PlayerState = {
  username: string;
  avatar: string;
  score: number;
  kills: number;
  alive: boolean;
  maxBombs: number;
  blastRange: number;
  speed: number;
  invincible: boolean;
  color: string;
};

type State = {
  playerStats: PlayerState[];
  startedTime: number;
  isEnded: boolean;
};

type Actions = {
  setPlayerStats: (playerStats: PlayerState[]) => void;
  setStartedTime: (startedTime: number) => void;
  setIsEnded: (isEnded: boolean) => void;
};

export const useGameState = create<State & Actions>()((set) => ({
  playerStats: [],
  startedTime: 0,
  isEnded: false,
  setPlayerStats: (playerStats) => set({ playerStats }),
  setStartedTime: (startedTime) => set({ startedTime }),
  setIsEnded: (isEnded) => set({ isEnded }),
}));
