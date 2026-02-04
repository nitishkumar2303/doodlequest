import { useEffect, useState } from "react";
import { useSocket } from "./context/SocketContext";
import "./App.css";

// Components
import WhiteBoard from "./components/WhiteBoard.jsx";
import Lobby from "./components/Lobby.jsx";
import Chat from "./components/Chat.jsx";
import PlayerList from "./components/PlayerList.jsx";
import AuthPage from "./components/AuthPage.jsx";

function App() {
  const socket = useSocket();

  // --- STATE MANAGEMENT ---
  const [user, setUser] = useState(null);
  const [isGameStarted, setIsGameStarted] = useState(false);

  // Game Logic States
  const [isDrawer, setIsDrawer] = useState(false);
  const [secretWord, setSecretWord] = useState("");
  const [gameStatus, setGameStatus] = useState("waiting");
  const [timer, setTimer] = useState(0);

  // Host & Ready State
  const [hostId, setHostId] = useState(null);
  const [amIReady, setAmIReady] = useState(false);

  // Winner State
  const [winner, setWinner] = useState(null);

  // UI Data
  const [players, setPlayers] = useState([]);
  const [tool, setTool] = useState({ color: "black", size: 5 });

  // --- EFFECT 1: CHECK LOGIN ---
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  // --- EFFECT 2: SOCKET LISTENERS ---
  useEffect(() => {
    if (!socket) return;

    const handleGameStart = ({ drawerId, wordLength }) => {
      setGameStatus("playing");
      setAmIReady(false);
      if (socket.id === drawerId) {
        setIsDrawer(true);
      } else {
        setIsDrawer(false);
        setSecretWord("_ ".repeat(wordLength));
      }
    };

    const handleWord = (word) => setSecretWord(word);
    const handleUpdatePlayers = (playerList) => setPlayers(playerList);
    const handleTimerUpdate = (time) => setTimer(time);
    const handleRoomData = ({ hostId }) => setHostId(hostId);

    const handleGameOver = ({ winnerName, winnerScore }) => {
      setWinner({ name: winnerName, score: winnerScore });
      setGameStatus("waiting");
      setSecretWord("Round Over");
      setIsDrawer(false);
      setTimer(0);
      setAmIReady(false);
      setTimeout(() => {
        setWinner(null);
        setSecretWord("");
      }, 5000);
    };

    const handleKicked = () => {
      alert("You were kicked from the room.");
      handleLeaveRoom(); // Reuse logic
    };

    socket.on("game_started", handleGameStart);
    socket.on("your_word", handleWord);
    socket.on("update_players", handleUpdatePlayers);
    socket.on("game_over", handleGameOver);
    socket.on("timer_update", handleTimerUpdate);
    socket.on("room_data", handleRoomData);
    socket.on("kicked", handleKicked);

    return () => {
      socket.off("game_started", handleGameStart);
      socket.off("your_word", handleWord);
      socket.off("update_players", handleUpdatePlayers);
      socket.off("timer_update", handleTimerUpdate);
      socket.off("game_over", handleGameOver);
      socket.off("room_data", handleRoomData);
      socket.off("kicked", handleKicked);
    };
  }, [socket]);

  // --- ACTIONS ---
  const joinRoom = ({ roomId }) => {
    if (!user) return;
    socket.emit("join_room", { room: roomId, name: user.username, userId: user.id });
    setUser((prev) => ({ ...prev, roomId }));
    setIsGameStarted(true);
    setAmIReady(false);
  };

  const handleStartGame = () => socket.emit("start_game", user.roomId);

  const handleAuthSuccess = (userData) => setUser(userData);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setIsGameStarted(false);
  };

  const handleLeaveRoom = () => {
    if (user?.roomId) socket.emit("leave_room", { room: user.roomId });
    setGameStatus("waiting");
    setIsGameStarted(false);
    setPlayers([]);
    setUser((prev) => ({ ...prev, roomId: null }));
    setAmIReady(false);
  };

  const handleKick = (targetSocketId) => {
    socket.emit("kick_player", { room: user.roomId, targetSocketId });
  };

  const handleToggleReady = () => {
    setAmIReady(!amIReady);
    socket.emit("toggle_ready", user.roomId);
  };

  const amIHost = socket?.id === hostId;

  if (!user) return <AuthPage onAuthSuccess={handleAuthSuccess} />;

  return (
    <div className="min-h-screen bg-gray-100 font-sans relative">
      {/* --- VICTORY OVERLAY --- */}
      {winner && (
        <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
          <div className="bg-white p-10 rounded-3xl shadow-2xl text-center border-8 border-yellow-400 transform scale-110 transition-transform">
            <h2 className="text-5xl font-black text-yellow-500 mb-4">🏆 WINNER! 🏆</h2>
            <p className="text-4xl font-bold text-gray-800 mb-2">{winner.name || "No one"}</p>
            <p className="text-xl text-gray-500 font-mono">Score: {winner.score || 0} pts</p>
          </div>
          <p className="text-white mt-8 text-lg font-bold animate-pulse">Next round starting soon...</p>
        </div>
      )}

      {/* --- MAIN APP UI --- */}
      {!isGameStarted ? (
        <Lobby
          joinRoom={joinRoom}
          defaultName={user.username}
          userId={user.id}
          onLogout={handleLogout}
        />
      ) : (
        <div className="flex flex-col items-center p-4">
          
          {/* --- TOP BAR (FIXED LAYOUT) --- */}
          <div className="w-full max-w-7xl bg-white shadow-md rounded-lg p-3 mb-4 flex items-center">
            
            {/* 1. LEFT COLUMN (Title + Badge) - Flex 1 */}
            <div className="flex-1 flex items-center gap-4 justify-start">
              <h1 className="text-2xl font-black text-blue-600 tracking-tight whitespace-nowrap hidden md:block">
                DoodleQuest
              </h1>
              
              <div className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider shadow-sm border ${
                isDrawer 
                  ? "bg-yellow-100 text-yellow-700 border-yellow-200" 
                  : "bg-blue-50 text-blue-600 border-blue-100"
              }`}>
                {gameStatus === "waiting" ? "⏳ WAITING" : isDrawer ? "✏️ DRAWER" : "👀 GUESSER"}
              </div>
            </div>

            {/* 2. CENTER COLUMN (Timer + Word) - Flex 1 (Strictly Centered) */}
            <div className="flex-1 flex justify-center">
              {gameStatus === "waiting" ? (
                <div className="flex flex-col items-center gap-1">
                  {amIHost ? (
                    <button
                      onClick={handleStartGame}
                      className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-full font-black text-sm md:text-base shadow-lg transition transform hover:scale-105 whitespace-nowrap"
                    >
                      START GAME
                    </button>
                  ) : (
                    <button
                      onClick={handleToggleReady}
                      className={`px-6 py-2 rounded-full font-black text-sm md:text-base shadow-lg transition transform hover:scale-105 whitespace-nowrap ${
                        amIReady 
                          ? "bg-gray-400 text-gray-700 hover:bg-gray-500" 
                          : "bg-blue-500 text-white hover:bg-blue-600"
                      }`}
                    >
                      {amIReady ? "NOT READY" : "I'M READY!"}
                    </button>
                  )}
                  {!amIHost && amIReady && <p className="text-[10px] text-gray-400 animate-pulse">Waiting for host...</p>}
                </div>
              ) : (
                <div className="flex items-center gap-4 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 shadow-inner">
                  <div className={`text-2xl font-black whitespace-nowrap ${timer < 10 ? "text-red-600 animate-pulse" : "text-gray-800"}`}>
                    ⏱️ {timer}s
                  </div>
                  <div className="w-px h-6 bg-gray-300"></div>
                  <p className="text-lg font-mono tracking-[0.2em] font-bold text-gray-700 whitespace-nowrap">
                    {secretWord}
                  </p>
                </div>
              )}
            </div>

            {/* 3. RIGHT COLUMN (User + Exit) - Flex 1 (Aligned Right) */}
            <div className="flex-1 flex flex-col items-end justify-center">
              <span className="font-black text-gray-800 text-sm md:text-lg tracking-tight leading-none truncate max-w-[150px]">
                {user?.username}
              </span>
              
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-2 py-1 mt-1 border border-gray-200">
                 <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest hidden sm:block">
                   ROOM: {user?.roomId}
                 </span>
                 <div className="w-px h-3 bg-gray-300 hidden sm:block"></div> 
                 <button 
                   onClick={handleLeaveRoom}
                   className="text-[10px] font-black text-red-500 hover:text-red-700 hover:bg-red-100 px-1 rounded transition-colors whitespace-nowrap"
                   title="Leave Room"
                 >
                   EXIT 🚪
                 </button>
              </div>
            </div>

          </div>

          {/* --- GAME COLUMNS --- */}
          <div className="w-full max-w-7xl h-[600px] border-4 border-gray-800 rounded-xl overflow-hidden shadow-2xl bg-white flex flex-row">
            {/* LEFT: Leaderboard */}
            <div className="w-1/5 h-full border-r-4 border-gray-800 hidden md:block bg-gray-50">
              <PlayerList players={players} currentUserId={socket?.id} hostId={hostId} onKick={handleKick} />
            </div>

            {/* MIDDLE: Canvas */}
            <div className="w-3/5 h-full relative border-r-4 border-gray-800 flex flex-col">
              {isDrawer && (
                <div className="bg-gray-100 p-2 flex justify-center gap-4 border-b-2 border-gray-300 shrink-0">
                  <button
                    onClick={() => setTool({ color: "black", size: 5 })}
                    className={`flex items-center gap-2 px-3 py-1 rounded font-bold text-sm transition ${tool.color === "black" ? "bg-blue-600 text-white shadow" : "bg-white text-gray-700 border"}`}
                  >
                    ✏️ Pencil
                  </button>
                  <button
                    onClick={() => setTool({ color: "white", size: 20 })}
                    className={`flex items-center gap-2 px-3 py-1 rounded font-bold text-sm transition ${tool.color === "white" ? "bg-blue-600 text-white shadow" : "bg-white text-gray-700 border"}`}
                  >
                    🧼 Eraser
                  </button>
                </div>
              )}
              <div className="flex-1 relative w-full h-full">
                <WhiteBoard roomId={user?.roomId} readOnly={!isDrawer} color={tool.color} size={tool.size} />
                {!isDrawer && <div className="absolute inset-0 z-10 cursor-default"></div>}
              </div>
            </div>

            {/* RIGHT: Chat */}
            <div className="w-1/5 h-full flex flex-col bg-white">
              <Chat roomId={user?.roomId} userName={user?.username} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;