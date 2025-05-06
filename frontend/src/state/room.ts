import { create } from "zustand";

export type PlayerInRoom = {
  username: string;
  avatar: string;
  isHost: boolean;
  isReady: boolean;
};

export type Room = {
  id: string;
  name: string;
  host: string;
  players: PlayerInRoom[];
  maxPlayers: number;
  started: boolean;
};

type State = {
  gameRooms: Room[];
  currentRoom: Room | null;
};

type Actions = {
  updateGameRooms: (gameRooms: Room[]) => void;
  updateCurrentRoom: (currentRoom: Room | null) => void;
  voidRooms: () => void;
};

export const useRoomStore = create<State & Actions>()((set) => ({
  gameRooms: [],
  currentRoom: null,
  updateGameRooms: (gameRooms) => set({ gameRooms }),
  updateCurrentRoom: (currentRoom) => set({ currentRoom }),
  voidRooms: () => set({ gameRooms: [] }),
}));
