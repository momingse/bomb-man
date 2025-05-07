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
  x: number;
  y: number;
};

type Bomb = {
  x: number;
  y: number;
  playerId: number;
  timer: number;
  owner: string;
};

type Explosion = {
  x: number;
  y: number;
  timer: number;
};

type PowerUp = {
  x: number;
  y: number;
  type: 'speed' | 'range' | 'bombs' | 'kick';
  collected: boolean;
};

type State = {
  players: PlayerState[];
  map: number[][];
  bombs: Bomb[];
  explosions: Explosion[];
  powerUps: PowerUp[];
  lastUpdateTime: number;
  ended: boolean;
  startedTime: number;
};

type Actions = {
  setGameState: (gameState: State) => void;
};

export const useGameState = create<State & Actions>()((set) => ({
  players: [],
  map: [],
  bombs: [],
  explosions: [],
  powerUps: [],
  lastUpdateTime: 0,
  ended: false,
  startedTime: 0,
  setGameState: (gameState) => set(gameState),
}));
