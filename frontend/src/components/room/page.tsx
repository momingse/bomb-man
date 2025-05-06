import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Bomb,
  Users,
  LogOut,
  Settings,
  Play,
  CheckCircle,
  XCircle,
  Crown,
  UserPlus,
  Send,
  Map,
  Clock,
  AlertTriangle,
  Info,
} from "lucide-react"
import { useNavigate, useParams, useRoutes, useSearchParams } from "react-router"

// Sample player data
const generatePlayers = (roomId: string, maxPlayers: number) => {
  const avatars = ["👑", "💣", "🔥", "⚡", "🚀", "🎯", "🧠", "⛏️", "🦸", "💥"]
  const names = [
    "BombKing",
    "ExplosionMaster",
    "BlastZone",
    "DetonatorPro",
    "FuseRunner",
    "BombTactician",
    "ExplosiveGenius",
    "MineLayer",
    "BombHero",
    "BlastMaster",
  ]
  const levels = [42, 38, 35, 31, 29, 27, 25, 23, 21, 19]

  // Current user is always BombHero
  const currentUser = {
    id: "player-9",
    name: "BombHero",
    avatar: "🦸",
    level: 21,
    isHost: false,
    isReady: false,
    isCurrentUser: true,
  }

  // Generate other players
  const otherPlayers = []
  const playerCount = Math.min(Math.floor(Math.random() * maxPlayers) + 1, maxPlayers - 1)

  for (let i = 0; i < playerCount; i++) {
    if (i === 0) {
      // First player is always the host
      otherPlayers.push({
        id: `player-${i}`,
        name: names[i],
        avatar: avatars[i],
        level: levels[i],
        isHost: true,
        isReady: true,
        isCurrentUser: false,
      })
    } else {
      otherPlayers.push({
        id: `player-${i}`,
        name: names[i],
        avatar: avatars[i],
        level: levels[i],
        isHost: false,
        isReady: Math.random() > 0.3, // 70% chance of being ready
        isCurrentUser: false,
      })
    }
  }

  return [currentUser, ...otherPlayers]
}

// Sample chat messages
const generateChatMessages = () => {
  return [
    {
      id: "msg-1",
      sender: "BombKing",
      avatar: "👑",
      content: "Welcome to the room everyone!",
      timestamp: "2 min ago",
      isSystem: false,
    },
    {
      id: "msg-2",
      sender: "System",
      content: "ExplosionMaster has joined the room",
      timestamp: "1 min ago",
      isSystem: true,
    },
    {
      id: "msg-3",
      sender: "ExplosionMaster",
      avatar: "💣",
      content: "Hey all, ready to play?",
      timestamp: "1 min ago",
      isSystem: false,
    },
    {
      id: "msg-4",
      sender: "System",
      content: "BombHero has joined the room",
      timestamp: "Just now",
      isSystem: true,
    },
  ]
}

// Sample map data
const mapDetails = {
  Classic: {
    description: "The original Bomberman arena with destructible blocks and power-ups.",
    difficulty: "Medium",
    size: "15x13",
    features: ["Power-ups", "Destructible Blocks", "Safe Corners"],
  },
  Castle: {
    description: "A medieval castle with narrow corridors and hidden passages.",
    difficulty: "Hard",
    size: "17x15",
    features: ["Teleporters", "Traps", "Secret Rooms"],
  },
  Volcano: {
    description: "A dangerous volcanic arena with lava pits and falling rocks.",
    difficulty: "Expert",
    size: "19x17",
    features: ["Lava Pits", "Falling Rocks", "Heat Zones"],
  },
  "Small Arena": {
    description: "A compact arena for fast-paced 1v1 duels.",
    difficulty: "Easy",
    size: "11x9",
    features: ["Quick Matches", "Limited Power-ups", "No Hiding Spots"],
  },
  "Training Ground": {
    description: "Perfect for beginners to learn the basics of Bomberman.",
    difficulty: "Beginner",
    size: "13x11",
    features: ["Tutorial Tips", "Extra Lives", "Practice Zones"],
  },
  "Ice Cave": {
    description: "A slippery ice cave where players slide after movement stops.",
    difficulty: "Hard",
    size: "15x15",
    features: ["Slippery Floor", "Ice Blocks", "Frozen Power-ups"],
  },
  Desert: {
    description: "A hot desert with sandstorms that temporarily block visibility.",
    difficulty: "Medium",
    size: "17x13",
    features: ["Sandstorms", "Quicksand", "Mirages"],
  },
  "Space Station": {
    description: "A futuristic space station with zero-gravity zones.",
    difficulty: "Expert",
    size: "19x19",
    features: ["Zero-G Zones", "Airlocks", "Laser Barriers"],
  },
}

export default function RoomPage() {
  const [searchParams] = useSearchParams()
  const roomId = searchParams.get("id")
  const roomName = searchParams.get("name")
  const maxPlayers = Number.parseInt(searchParams.get("maxPlayers") || "4")

  const [players, setPlayers] = useState([])
  const [chatMessages, setChatMessages] = useState(() => generateChatMessages())
  const [newMessage, setNewMessage] = useState("")
  const [isReady, setIsReady] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState("players")

  const navigate = useNavigate();

  useEffect(() => {
    if (!roomId || !maxPlayers) {
      navigate("/playground")
      return
    }
    const players = generatePlayers(roomId, maxPlayers)
    setPlayers(players)
  }, [roomId, maxPlayers])

  // Find current user and host
  const currentUser = players.find((p) => p.isCurrentUser)
  const host = players.find((p) => p.isHost)
  const isHost = currentUser?.isHost || false

  // Calculate ready status
  const readyCount = players.filter((p) => p.isReady).length
  const allReady = readyCount === players.length
  const canStart = isHost && allReady && players.length > 1

  // Handle ready toggle
  const toggleReady = () => {
    setIsReady(!isReady)
    setPlayers((prev) =>
      prev.map((player) => (player.isCurrentUser ? { ...player, isReady: !player.isReady } : player)),
    )
  }

  // Handle start game
  const startGame = () => {
    if (!canStart) return
    setCountdown(5)
  }

  // Handle leave room
  const leaveRoom = () => {
    // router.push("/playground")
    navigate("/playground")
  }

  // Handle send message
  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    const message = {
      id: `msg-${chatMessages.length + 1}`,
      sender: currentUser?.name || "Unknown",
      avatar: currentUser?.avatar || "👤",
      content: newMessage.trim(),
      timestamp: "Just now",
      isSystem: false,
    }

    setChatMessages((prev) => [...prev, message])
    setNewMessage("")
  }

  // Countdown effect
  useEffect(() => {
    if (countdown === null) return

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else {
      // Game would start here in a real implementation
      alert("Game starting!")
      // In a real app, you would redirect to the game page or start the game
    }
  }, [countdown])

  // Simulate other players changing ready status occasionally
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        setPlayers((prev) => {
          const playerToUpdate = Math.floor(Math.random() * prev.length)
          return prev.map((player, index) => {
            if (index === playerToUpdate && !player.isCurrentUser && !player.isHost) {
              return { ...player, isReady: !player.isReady }
            }
            return player
          })
        })
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [])

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
              <div>
                <h1 className="text-white font-bold text-lg md:text-2xl pixel-title">GAME ROOM</h1>
                <p className="text-[#ffcc00] text-xs sm:text-sm pixel-text">{roomName}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="pixel-button bg-[#e83b3b] text-white hover:bg-[#c52f2f]"
                onClick={leaveRoom}
              >
                <LogOut className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Leave Room</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Room Info */}
          <div className="pixel-container bg-[#2a4a7f] p-1">
            <div className="pixel-inner bg-[#4a6ea5] p-4 h-full">
              <h2 className="text-xl text-white font-bold mb-4 pixel-title">ROOM INFO</h2>

              <div className="space-y-4">
                <div className="bg-[#2a4a7f] p-3 pixel-stats-box">
                  <div className="flex justify-between items-center">
                    <span className="text-[#ffcc00] pixel-text">Room ID:</span>
                    <span className="text-white pixel-text">{roomId}</span>
                  </div>
                </div>

                {/* <div className="bg-[#2a4a7f] p-3 pixel-stats-box"> */}
                {/*   <div className="flex justify-between items-center"> */}
                {/*     <span className="text-[#ffcc00] pixel-text">Game Mode:</span> */}
                {/*     <span className="text-white pixel-text">{roomMode}</span> */}
                {/*   </div> */}
                {/* </div> */}

                {/* <div className="bg-[#2a4a7f] p-3 pixel-stats-box"> */}
                {/*   <div className="flex justify-between items-center"> */}
                {/*     <span className="text-[#ffcc00] pixel-text">Map:</span> */}
                {/*     <span className="text-white pixel-text">{roomMap}</span> */}
                {/*   </div> */}
                {/* </div> */}

                <div className="bg-[#2a4a7f] p-3 pixel-stats-box">
                  <div className="flex justify-between items-center">
                    <span className="text-[#ffcc00] pixel-text">Players:</span>
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-1 text-[#8aa8d0]" />
                      <span className="text-white pixel-text">
                        {players.length}/{maxPlayers}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#2a4a7f] p-3 pixel-stats-box">
                  <div className="flex justify-between items-center">
                    <span className="text-[#ffcc00] pixel-text">Host:</span>
                    <div className="flex items-center">
                      <Crown className="h-4 w-4 mr-1 text-[#ffcc00]" />
                      <span className="text-white pixel-text">{host?.name || "Unknown"}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#2a4a7f] p-3 pixel-stats-box">
                  <div className="flex justify-between items-center">
                    <span className="text-[#ffcc00] pixel-text">Ready:</span>
                    <span className="text-white pixel-text">
                      {readyCount}/{players.length}
                    </span>
                  </div>
                  <div className="mt-2 w-full bg-[#1a2e4a] h-2">
                    <div
                      className="h-full bg-[#50c878]"
                      style={{ width: `${(readyCount / players.length) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t-2 border-dashed border-[#1a2e4a]">
                {isHost ? (
                  <Button
                    className={`w-full pixel-button ${canStart ? "bg-[#50c878] hover:bg-[#3da15e]" : "bg-gray-500"}`}
                    disabled={!canStart}
                    onClick={startGame}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Game
                  </Button>
                ) : (
                  <Button
                    className={`w-full pixel-button ${isReady ? "bg-[#e83b3b] hover:bg-[#c52f2f]" : "bg-[#50c878] hover:bg-[#3da15e]"}`}
                    onClick={toggleReady}
                  >
                    {isReady ? (
                      <>
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancel Ready
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Ready Up
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* {isHost && ( */}
              {/*   <div className="mt-4"> */}
              {/*     <Button className="w-full pixel-button bg-[#3b82e8] hover:bg-[#2f6ac5]"> */}
              {/*       <Settings className="h-4 w-4 mr-2" /> */}
              {/*       Room Settings */}
              {/*     </Button> */}
              {/*   </div> */}
              {/* )} */}

            </div>
          </div>

          {/* Right Panel - Players & Chat */}
          <div className="lg:col-span-2">
            <div className="pixel-container bg-[#2a4a7f] p-1">
              <div className="pixel-inner bg-[#4a6ea5] p-4">
                {countdown !== null && (
                  <div className="mb-4 pixel-countdown">
                    <div className="text-center">
                      <h3 className="text-2xl text-white font-bold pixel-title">GAME STARTING IN</h3>
                      <div className="text-6xl text-[#ffcc00] font-bold mt-2 countdown-number">{countdown}</div>
                      <p className="text-white pixel-text mt-2">Get ready to play!</p>
                    </div>
                  </div>
                )}

                <Tabs defaultValue="players" className="w-full" onValueChange={setActiveTab}>
                  {/* <TabsList className="grid w-full grid-cols-3 mb-6 pixel-tabs"> */}
                  <TabsList className="grid w-full grid-cols-1 mb-6 pixel-tabs">
                    <TabsTrigger value="players" className="pixel-tab">
                      Players
                    </TabsTrigger>
                    {/* <TabsTrigger value="chat" className="pixel-tab"> */}
                    {/*   Chat */}
                    {/* </TabsTrigger> */}
                    {/* <TabsTrigger value="map" className="pixel-tab"> */}
                    {/*   Map Info */}
                    {/* </TabsTrigger> */}
                  </TabsList>

                  <TabsContent value="players" className="space-y-3">
                    <div className="flex justify-between items-center mb-2">
                      <h2 className="text-xl text-white font-bold pixel-title">PLAYERS</h2>
                      <div className="text-[#8aa8d0] text-xs pixel-text">
                        {players.length}/{maxPlayers} players
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {players.map((player) => (
                        <div
                          key={player.id}
                          className={`bg-[#2a4a7f] p-3 pixel-player ${player.isCurrentUser ? "border-2 border-[#ffcc00]" : ""}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="player-avatar mr-3">{player.avatar}</div>
                              <div>
                                <div className="flex items-center">
                                  <span className="text-white font-bold pixel-text">{player.name}</span>
                                  {player.isHost && <Crown className="h-4 w-4 ml-1 text-[#ffcc00]" />}
                                  {player.isCurrentUser && (
                                    <span className="ml-1 text-xs text-[#50c878] pixel-text">(You)</span>
                                  )}
                                </div>
                                <div className="text-xs text-[#8aa8d0] pixel-text">Level {player.level}</div>
                              </div>
                            </div>
                            <div>
                              {player.isReady ? (
                                <div className="flex items-center text-[#50c878]">
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  <span className="text-xs pixel-text">Ready</span>
                                </div>
                              ) : (
                                <div className="flex items-center text-[#e83b3b]">
                                  <XCircle className="h-4 w-4 mr-1" />
                                  <span className="text-xs pixel-text">Not Ready</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Empty slots */}
                      {Array.from({ length: maxPlayers - players.length }).map((_, index) => (
                        <div key={`empty-${index}`} className="bg-[#2a4a7f] p-3 pixel-player opacity-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="player-avatar mr-3">❓</div>
                              <div>
                                <span className="text-white font-bold pixel-text">Empty Slot</span>
                                <div className="text-xs text-[#8aa8d0] pixel-text">Waiting for player...</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {!allReady && players.length > 1 && (
                      <div className="mt-4 p-3 bg-[rgba(255,204,0,0.1)] border-2 border-[#ffcc00] pixel-notice">
                        <div className="flex items-start">
                          <AlertTriangle className="h-5 w-5 mr-2 text-[#ffcc00] flex-shrink-0 mt-0.5" />
                          <p className="text-[#ffcc00] pixel-text">
                            Waiting for all players to be ready before the game can start.
                          </p>
                        </div>
                      </div>
                    )}

                    {players.length < 2 && (
                      <div className="mt-4 p-3 bg-[rgba(255,204,0,0.1)] border-2 border-[#ffcc00] pixel-notice">
                        <div className="flex items-start">
                          <Info className="h-5 w-5 mr-2 text-[#ffcc00] flex-shrink-0 mt-0.5" />
                          <p className="text-[#ffcc00] pixel-text">
                            At least 2 players are needed to start a game. Invite some friends!
                          </p>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* <TabsContent value="chat"> */}
                  {/*   <div className="flex justify-between items-center mb-2"> */}
                  {/*     <h2 className="text-xl text-white font-bold pixel-title">CHAT</h2> */}
                  {/*     <div className="text-[#8aa8d0] text-xs pixel-text">{chatMessages.length} messages</div> */}
                  {/*   </div> */}

                  {/*   <div className="pixel-chat-container bg-[#2a4a7f] p-2 h-[300px] overflow-y-auto"> */}
                  {/*     {chatMessages.map((message) => ( */}
                  {/*       <div */}
                  {/*         key={message.id} */}
                  {/*         className={`mb-2 ${message.isSystem ? "pixel-system-message" : "pixel-chat-message"}`} */}
                  {/*       > */}
                  {/*         {message.isSystem ? ( */}
                  {/*           <div className="text-[#8aa8d0] text-xs pixel-text text-center py-1"> */}
                  {/*             {message.content} • {message.timestamp} */}
                  {/*           </div> */}
                  {/*         ) : ( */}
                  {/*           <div className="flex"> */}
                  {/*             <div className="chat-avatar mr-2">{message.avatar}</div> */}
                  {/*             <div className="flex-1"> */}
                  {/*               <div className="flex justify-between items-center"> */}
                  {/*                 <span className="text-[#ffcc00] text-sm font-bold pixel-text">{message.sender}</span> */}
                  {/*                 <span className="text-[#8aa8d0] text-xs pixel-text">{message.timestamp}</span> */}
                  {/*               </div> */}
                  {/*               <p className="text-white text-sm pixel-text">{message.content}</p> */}
                  {/*             </div> */}
                  {/*           </div> */}
                  {/*         )} */}
                  {/*       </div> */}
                  {/*     ))} */}
                  {/*   </div> */}

                  {/*   <form onSubmit={sendMessage} className="mt-3 flex"> */}
                  {/*     <Input */}
                  {/*       placeholder="Type your message..." */}
                  {/*       value={newMessage} */}
                  {/*       onChange={(e) => setNewMessage(e.target.value)} */}
                  {/*       className="pixel-input flex-1" */}
                  {/*     /> */}
                  {/*     <Button type="submit" className="ml-2 pixel-button bg-[#3b82e8] hover:bg-[#2f6ac5]"> */}
                  {/*       <Send className="h-4 w-4" /> */}
                  {/*     </Button> */}
                  {/*   </form> */}
                  {/* </TabsContent> */}

                  {/* <TabsContent value="map"> */}
                  {/*   <div className="flex justify-between items-center mb-2"> */}
                  {/*     <h2 className="text-xl text-white font-bold pixel-title">MAP INFO</h2> */}
                  {/*     <div className="text-[#8aa8d0] text-xs pixel-text">{roomMap}</div> */}
                  {/*   </div> */}

                  {/*   <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> */}
                  {/*     <div className="pixel-map-preview bg-[#2a4a7f] p-2"> */}
                  {/*       <div className="pixel-map-image bg-[#1a2e4a] h-[200px] flex items-center justify-center"> */}
                  {/*         <Map className="h-16 w-16 text-[#4a6ea5]" /> */}
                  {/*         <span className="text-white pixel-text ml-2">{roomMap}</span> */}
                  {/*       </div> */}
                  {/*     </div> */}

                  {/*     <div className="space-y-3"> */}
                  {/*       <div className="bg-[#2a4a7f] p-3 pixel-stats-box"> */}
                  {/*         <div className="flex justify-between items-center"> */}
                  {/*           <span className="text-[#ffcc00] pixel-text">Difficulty:</span> */}
                  {/*           <span className="text-white pixel-text"> */}
                  {/*             {mapDetails[roomMap as keyof typeof mapDetails]?.difficulty || "Unknown"} */}
                  {/*           </span> */}
                  {/*         </div> */}
                  {/*       </div> */}

                  {/*       <div className="bg-[#2a4a7f] p-3 pixel-stats-box"> */}
                  {/*         <div className="flex justify-between items-center"> */}
                  {/*           <span className="text-[#ffcc00] pixel-text">Size:</span> */}
                  {/*           <span className="text-white pixel-text"> */}
                  {/*             {mapDetails[roomMap as keyof typeof mapDetails]?.size || "Unknown"} */}
                  {/*           </span> */}
                  {/*         </div> */}
                  {/*       </div> */}

                  {/*       <div className="bg-[#2a4a7f] p-3 pixel-stats-box"> */}
                  {/*         <span className="text-[#ffcc00] pixel-text">Features:</span> */}
                  {/*         <div className="mt-2 flex flex-wrap gap-2"> */}
                  {/*           {mapDetails[roomMap as keyof typeof mapDetails]?.features.map((feature, index) => ( */}
                  {/*             <span key={index} className="text-xs bg-[#1a2e4a] text-[#ffcc00] px-2 py-1 pixel-tag"> */}
                  {/*               {feature} */}
                  {/*             </span> */}
                  {/*           ))} */}
                  {/*         </div> */}
                  {/*       </div> */}
                  {/*     </div> */}
                  {/*   </div> */}

                  {/*   <div className="mt-4 bg-[#2a4a7f] p-3 pixel-stats-box"> */}
                  {/*     <span className="text-[#ffcc00] pixel-text">Description:</span> */}
                  {/*     <p className="mt-2 text-white pixel-text"> */}
                  {/*       {mapDetails[roomMap as keyof typeof mapDetails]?.description || "No description available."} */}
                  {/*     </p> */}
                  {/*   </div> */}

                  {/*   <div className="mt-4 p-3 bg-[rgba(59,130,232,0.1)] border-2 border-[#3b82e8] pixel-notice"> */}
                  {/*     <div className="flex items-start"> */}
                  {/*       <Info className="h-5 w-5 mr-2 text-[#3b82e8] flex-shrink-0 mt-0.5" /> */}
                  {/*       <p className="text-[#3b82e8] pixel-text"> */}
                  {/*         Only the host can change the map. The game will use this map when it starts. */}
                  {/*       </p> */}
                  {/*     </div> */}
                  {/*   </div> */}
                  {/* </TabsContent> */}
                </Tabs>
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
                <span className="text-white pixel-text">BOMB MAN Game Room</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1 text-[#8aa8d0]" />
                <span className="text-[#8aa8d0] text-xs pixel-text">Room created 5 minutes ago</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

