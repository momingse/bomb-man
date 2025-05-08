import type React from "react";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bomb,
  Users,
  Clock,
  Play,
  Plus,
  LogOut,
  Settings,
  Trophy,
  Crown,
  Star,
  Award,
  Zap,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from "lucide-react";
import { useNavigate } from "react-router";
import { logoutRequest } from "@/api/auth";
import { usePlayersStore } from "@/state/player";
import { leaderboardRequest } from "@/api/user";
import { useSocket } from "../SocketProvier";
import { useOnlinePlayers } from "@/state/onlinePlayer";
import { Room, useRoomStore } from "@/state/room";

export default function PlaygroundPage() {
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoom, setNewRoom] = useState({
    name: "",
    maxPlayers: 4,
  });
  const [leaderboardData, setLeaderboardData] = useState<
    {
      id: number;
      rank: number;
      username: string;
      wins: number;
      winRate: number;
      avatar: string;
    }[]
  >([]);
  const [numberOfPlayers, setNumberOfPlayers] = useState(0);
  const [activeTab, setActiveTab] = useState("rooms");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [roomsPerPage, setRoomsPerPage] = useState(5);
  const [roomFilter, setRoomFilter] = useState("");

  const { player: currentPlayer, voidPlayers } = usePlayersStore();
  const {
    username = "",
    wins = 0,
    gamesPlayed = 0,
    rank = "Unranked",
  } = currentPlayer ?? {};

  const { onlinePlayers } = useOnlinePlayers();
  const { gameRooms, updateGameRooms, updateCurrentRoom } = useRoomStore();

  const { socket, isConnected } = useSocket();

  const navigate = useNavigate();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await leaderboardRequest();

        if (response.ok) {
          const { leaderboard, numberOfPlayers } = await response.json();
          setLeaderboardData(leaderboard);
          setNumberOfPlayers(numberOfPlayers);
        } else {
          console.error("Failed to fetch leaderboard");
        }
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      }
    };

    fetchLeaderboard();
  }, []);

  useEffect(() => {
    if (!socket || !isConnected) {
      return;
    }

    const handleCreateRoom = (data: Room) => {
      updateGameRooms([...gameRooms, data]);
      handleJoinRoom(data);
    };

    socket.on("roomCreated", handleCreateRoom);

    return () => {
      socket.off("roomCreated", handleCreateRoom);
    };
  }, [socket, isConnected]);

  // Filter rooms based on search term
  const filteredRooms = useMemo(() => {
    if (!roomFilter) return gameRooms;

    return gameRooms.filter(
      (room) =>
        room.name.toLowerCase().includes(roomFilter.toLowerCase()) ||
        room.host.toLowerCase().includes(roomFilter.toLowerCase()),
    );
  }, [roomFilter, gameRooms]);

  // Calculate pagination values
  const totalPages = Math.ceil(filteredRooms.length / roomsPerPage);
  const indexOfLastRoom = currentPage * roomsPerPage;
  const indexOfFirstRoom = indexOfLastRoom - roomsPerPage;
  const currentRooms = filteredRooms.slice(indexOfFirstRoom, indexOfLastRoom);

  // Pagination controls
  const goToPage = (page: number) => {
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    setCurrentPage(page);
  };

  const nextPage = () => goToPage(currentPage + 1);
  const prevPage = () => goToPage(currentPage - 1);
  const firstPage = () => goToPage(1);
  const lastPage = () => goToPage(totalPages);

  const handleLogout = async () => {
    try {
      await logoutRequest();
      socket?.disconnect();
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newRoom.name) return;

    if (!socket || !isConnected) return;

    socket.emit("createRoom", newRoom);
  };

  const handleJoinRoom = (room: Room) => {
    socket?.emit("joinRoom", room.id);

    updateCurrentRoom(room);

    const queryParams = new URLSearchParams({
      roomId: room.id,
    }).toString();

    navigate(`/room?${queryParams}`);
  };

  const getLeaderboardIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-[#ffcc00]" />;
      case 2:
        return <Award className="h-5 w-5 text-[#c0c0c0]" />;
      case 3:
        return <Trophy className="h-5 w-5 text-[#cd7f32]" />;
      default:
        return <Star className="h-5 w-5 text-[#8aa8d0]" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#1a2e4a] p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="pixel-container bg-[#2a4a7f] p-1 mb-6">
          <div className="pixel-inner bg-[#4a6ea5] p-4 flex justify-between items-center">
            <div className="flex items-center">
              <div className="pixel-logo-container mr-4">
                <div className="pixel-logo text-sm sm:text-base md:text-xl">
                  <span className="text-white">BOMB</span>
                  <span className="text-[#ffcc00]">MAN</span>
                </div>
              </div>
              <h1 className="text-white font-bold text-lg md:text-2xl pixel-title hidden sm:block">
                GAME LOBBY
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="pixel-button bg-[#e83b3b] text-white hover:bg-[#c52f2f]"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Player Stats */}
          <div className="pixel-container bg-[#2a4a7f] p-1">
            <div className="pixel-inner bg-[#4a6ea5] p-4 h-full">
              <h2 className="text-xl text-white font-bold mb-4 pixel-title">
                PLAYER STATS
              </h2>

              <div className="space-y-4">
                <div className="bg-[#2a4a7f] p-3 pixel-stats-box">
                  <div className="flex justify-between items-center">
                    <span className="text-[#ffcc00] pixel-text">Username:</span>
                    <span className="text-white pixel-text">{username}</span>
                  </div>
                </div>

                {/* <div className="bg-[#2a4a7f] p-3 pixel-stats-box"> */}
                {/*   <div className="flex justify-between items-center"> */}
                {/*     <span className="text-[#ffcc00] pixel-text">Level:</span> */}
                {/*     <span className="text-white pixel-text">12</span> */}
                {/*   </div> */}
                {/* </div> */}

                <div className="bg-[#2a4a7f] p-3 pixel-stats-box">
                  <div className="flex items-center justify-between">
                    <span className="text-[#ffcc00] pixel-text">Wins:</span>
                    <div className="flex items-center">
                      <Trophy className="h-4 w-4 mr-1 text-[#ffcc00]" />
                      <span className="text-white pixel-text">{wins}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#2a4a7f] p-3 pixel-stats-box">
                  <div className="flex justify-between items-center">
                    <span className="text-[#ffcc00] pixel-text">
                      Games Played:
                    </span>
                    <span className="text-white pixel-text">{gamesPlayed}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t-2 border-dashed border-[#1a2e4a]">
                <Button
                  className="w-full pixel-button bg-[#3b82e8] hover:bg-[#2f6ac5]"
                  onClick={() => setShowCreateRoom(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Room
                </Button>
              </div>
            </div>
          </div>

          {/* Right Panel - Rooms & Leaderboard */}
          <div className="lg:col-span-2">
            <div className="pixel-container bg-[#2a4a7f] p-1">
              <div className="pixel-inner bg-[#4a6ea5] p-4">
                {showCreateRoom ? (
                  <>
                    <h2 className="text-xl text-white font-bold mb-4 pixel-title">
                      CREATE ROOM
                    </h2>

                    <form onSubmit={handleCreateRoom} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="room-name" className="pixel-label">
                          Room Name
                        </Label>
                        <Input
                          id="room-name"
                          value={newRoom.name}
                          onChange={(e) =>
                            setNewRoom({ ...newRoom, name: e.target.value })
                          }
                          placeholder="Enter room name"
                          required
                          className="pixel-input"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="max-players" className="pixel-label">
                          Max Players
                        </Label>
                        <select
                          id="max-players"
                          value={newRoom.maxPlayers}
                          onChange={(e) =>
                            setNewRoom({
                              ...newRoom,
                              maxPlayers: Number.parseInt(e.target.value),
                            })
                          }
                          className="w-full pixel-input"
                        >
                          {[2, 4, 6, 8].map((num) => (
                            <option key={num} value={num}>
                              {num} Players
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* <div className="space-y-2"> */}
                      {/*   <Label htmlFor="map" className="pixel-label"> */}
                      {/*     Map */}
                      {/*   </Label> */}
                      {/*   <select */}
                      {/*     id="map" */}
                      {/*     value={newRoom.map} */}
                      {/*     onChange={(e) => */}
                      {/*       setNewRoom({ ...newRoom, map: e.target.value }) */}
                      {/*     } */}
                      {/*     className="w-full pixel-input" */}
                      {/*   > */}
                      {/*     <option value="Classic">Classic</option> */}
                      {/*     <option value="Castle">Castle</option> */}
                      {/*     <option value="Volcano">Volcano</option> */}
                      {/*     <option value="Small Arena">Small Arena</option> */}
                      {/*   </select> */}
                      {/* </div> */}

                      <div className="flex space-x-4 pt-4">
                        <Button
                          type="submit"
                          className="flex-1 pixel-button bg-[#e83b3b] hover:bg-[#c52f2f]"
                        >
                          Create
                        </Button>
                        <Button
                          type="button"
                          className="flex-1 pixel-button bg-[#2a4a7f]"
                          onClick={() => setShowCreateRoom(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </>
                ) : (
                  <>
                    <Tabs
                      defaultValue="rooms"
                      className="w-full"
                      onValueChange={setActiveTab}
                    >
                      <TabsList className="grid w-full grid-cols-2 mb-6 pixel-tabs">
                        <TabsTrigger value="rooms" className="pixel-tab">
                          Game Rooms
                        </TabsTrigger>
                        <TabsTrigger value="leaderboard" className="pixel-tab">
                          Leaderboard
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="rooms" className="space-y-3">
                        <div className="flex justify-between items-center mb-2">
                          <h2 className="text-xl text-white font-bold pixel-title">
                            GAME ROOMS
                          </h2>
                          <div className="text-[#8aa8d0] text-xs pixel-text">
                            {filteredRooms.filter((r) => !r.started).length}{" "}
                            rooms available
                          </div>
                        </div>

                        {/* Room Search Filter */}
                        <div className="mb-4">
                          <Input
                            placeholder="Search rooms by name, host, mode, or map..."
                            value={roomFilter}
                            onChange={(e) => {
                              setRoomFilter(e.target.value);
                              setCurrentPage(1); // Reset to first page on filter change
                            }}
                            className="pixel-input"
                          />
                        </div>

                        {/* Room List */}
                        {currentRooms?.length > 0 ? (
                          <div className="space-y-3">
                            {currentRooms?.map((room) => (
                              <div
                                key={room.id}
                                className={`bg-[#2a4a7f] p-3 pixel-room ${room.started ? "opacity-70" : ""}`}
                              >
                                <div className="flex flex-col sm:flex-row justify-between">
                                  <div className="mb-2 sm:mb-0">
                                    <h3 className="text-white font-bold pixel-text">
                                      {room.name}
                                    </h3>
                                    <p className="text-xs text-[#8aa8d0] pixel-text">
                                      Host: {room.host}
                                    </p>
                                  </div>

                                  <div className="flex items-center space-x-4">
                                    <div className="flex items-center">
                                      <Users className="h-4 w-4 mr-1 text-[#8aa8d0]" />
                                      <span className="text-white pixel-text">
                                        {room.players.length}/{room.maxPlayers}
                                      </span>
                                    </div>

                                    <Button
                                      size="sm"
                                      disabled={
                                        room.started ||
                                        room.players.length === room.maxPlayers
                                      }
                                      className={`pixel-button ${
                                        room.started ||
                                        room.players.length === room.maxPlayers
                                          ? "bg-gray-500"
                                          : "bg-[#3b82e8] hover:bg-[#2f6ac5]"
                                      }`}
                                      onClick={() => handleJoinRoom(room)}
                                    >
                                      {!room.started ? (
                                        <Clock className="h-4 w-4 mr-1" />
                                      ) : (
                                        <Play className="h-4 w-4 mr-1" />
                                      )}
                                      {room.started ? "In Progress" : "Join"}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="bg-[#2a4a7f] p-4 text-center pixel-room">
                            <p className="text-white pixel-text">
                              No rooms found matching your search.
                            </p>
                          </div>
                        )}

                        {/* Pagination Controls */}
                        {filteredRooms.length > roomsPerPage && (
                          <div className="mt-4 flex justify-center">
                            <div className="pixel-pagination">
                              <Button
                                onClick={firstPage}
                                disabled={currentPage === 1}
                                className="pixel-pagination-button"
                                size="sm"
                              >
                                <ChevronsLeft className="h-4 w-4" />
                              </Button>
                              <Button
                                onClick={prevPage}
                                disabled={currentPage === 1}
                                className="pixel-pagination-button"
                                size="sm"
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </Button>

                              <div className="pixel-pagination-info">
                                <span className="text-white pixel-text">
                                  Page {currentPage} of {totalPages}
                                </span>
                              </div>

                              <Button
                                onClick={nextPage}
                                disabled={currentPage === totalPages}
                                className="pixel-pagination-button"
                                size="sm"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                              <Button
                                onClick={lastPage}
                                disabled={currentPage === totalPages}
                                className="pixel-pagination-button"
                                size="sm"
                              >
                                <ChevronsRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Room Count Display */}
                        <div className="mt-2 text-center">
                          <p className="text-xs text-[#8aa8d0] pixel-text">
                            Showing {indexOfFirstRoom + 1}-
                            {Math.min(indexOfLastRoom, filteredRooms.length)} of{" "}
                            {filteredRooms.length} rooms
                          </p>
                        </div>
                      </TabsContent>

                      <TabsContent value="leaderboard">
                        <div className="flex justify-between items-center mb-4">
                          <h2 className="text-xl text-white font-bold pixel-title">
                            TOP PLAYERS
                          </h2>
                          <div className="flex items-center">
                            <Zap className="h-4 w-4 mr-1 text-[#ffcc00]" />
                            <span className="text-[#ffcc00] text-xs pixel-text">
                              LIVE
                            </span>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full pixel-table">
                            <thead>
                              <tr className="bg-[#2a4a7f] text-[#ffcc00]">
                                <th className="p-2 text-left pixel-text">
                                  Rank
                                </th>
                                <th className="p-2 text-left pixel-text">
                                  Player
                                </th>
                                {/* <th className="p-2 text-right pixel-text"> */}
                                {/*   Score */}
                                {/* </th> */}
                                <th className="p-2 text-right pixel-text hidden sm:table-cell">
                                  Wins
                                </th>
                                <th className="p-2 text-right pixel-text hidden md:table-cell">
                                  Win Rate
                                </th>
                                {/* <th className="p-2 text-right pixel-text hidden md:table-cell"> */}
                                {/*   Level */}
                                {/* </th> */}
                              </tr>
                            </thead>
                            <tbody>
                              {leaderboardData.map((player) => (
                                <tr
                                  key={player.id}
                                  className={`border-b border-[#1a2e4a] ${
                                    player.username === "BombHero"
                                      ? "bg-[rgba(255,204,0,0.1)]"
                                      : ""
                                  }`}
                                >
                                  <td className="p-2 pixel-text">
                                    <div className="flex items-center">
                                      {getLeaderboardIcon(player.rank)}
                                      <span className="ml-1 text-white">
                                        {player.rank}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="p-2 pixel-text">
                                    <div className="flex items-center">
                                      <span className="mr-2">
                                        {player.avatar}
                                      </span>
                                      <span className="text-white">
                                        {player.username}
                                      </span>
                                      {onlinePlayers.find(
                                        (p) => p.username === player.username,
                                      ) && (
                                        <span className="ml-2 text-xs text-[#50c878]">
                                          •
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  {/* <td className="p-2 text-right text-white pixel-text"> */}
                                  {/*   {player.score.toLocaleString()} */}
                                  {/* </td> */}
                                  <td className="p-2 text-right text-white pixel-text hidden sm:table-cell">
                                    {player.wins}
                                  </td>
                                  <td className="p-2 text-right text-white pixel-text hidden md:table-cell">
                                    {player.winRate.toFixed(2)}%
                                  </td>
                                  {/* <td className="p-2 text-right text-white pixel-text hidden md:table-cell"> */}
                                  {/*   {player.level} */}
                                  {/* </td> */}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="mt-4 p-3 bg-[#2a4a7f] pixel-stats-box">
                          <div className="flex justify-between items-center">
                            <span className="text-[#ffcc00] pixel-text">
                              Your Rank:
                            </span>
                            <span className="text-white pixel-text">
                              #{rank} of {numberOfPlayers} Players
                            </span>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-6 pixel-container bg-[#2a4a7f] p-1">
          <div className="pixel-inner bg-[#4a6ea5] p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <Bomb className="h-5 w-5 text-[#ffcc00] mr-2" />
                <span className="text-white pixel-text">
                  BOMB MAN Game Lobby
                </span>
              </div>
              <div className="text-[#8aa8d0] text-xs pixel-text">
                Online Players: {onlinePlayers.length}
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
