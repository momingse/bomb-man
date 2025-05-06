import { useOnlinePlayers } from "@/state/onlinePlayer";
import { usePlayersStore } from "@/state/player";
import { Room, useRoomStore } from "@/state/room";
import { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

type SocketContextType = {
  socket: Socket | null;
  isConnected: boolean;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { player } = usePlayersStore();
  const { setPlayers } = useOnlinePlayers();
  const { updateCurrentRoom, updateGameRooms } = useRoomStore();

  const {
    id = "",
    username = "",
    wins = 0,
    gamesPlayed = 0,
    rank = "Unranked",
    avatar = "",
  } = player ?? {};

  useEffect(() => {
    if (!id) {
      socket?.disconnect();
      return;
    }

    const socketInstance = io("http://localhost:3000");
    socketInstance.on("connect", () => {
      setIsConnected(true);
    });

    socketInstance.emit("register", {
      username,
      avatar,
    });

    socketInstance.on("onlinePlayers", (players) => {
      setPlayers(players);
    });

    socketInstance.on("rooms", (data) => {
      updateGameRooms(data);

      // check if player is in a room
      const currentRoom = data.find((room: Room) =>
        room.players.find((player) => player.username === username),
      );

      if (currentRoom) {
        updateCurrentRoom(currentRoom);
      }
    });

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [id]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
