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

  // NEW: Host & Ready State
  const [hostId, setHostId] = useState(null);
  const [amIReady, setAmIReady] = useState(false);

  // Winner State for Victory Screen
  const [winner, setWinner] = useState(null);

  // Data for the UI
  const [players, setPlayers] = useState([]);
  const [tool, setTool] = useState({ color: "black", size: 5 });

  // --- EFFECT 1: CHECK LOGIN ON LOAD ---
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // --- EFFECT 2: SOCKET EVENT LISTENERS ---
  useEffect(() => {
    if (!socket) return;

    const handleGameStart = ({ drawerId, wordLength }) => {
      setGameStatus("playing");
      setAmIReady(false); // Reset ready status on game start
      if (socket.id === drawerId) {
        setIsDrawer(true);
      } else {
        setIsDrawer(false);
        setSecretWord("_ ".repeat(wordLength));
      }
    };

    const handleWord = (word) => {
      setSecretWord(word);
    };

    const handleUpdatePlayers = (playerList) => {
      setPlayers(playerList);
    };

    const handleTimerUpdate = (time) => {
      setTimer(time);
    };

    const handleGameOver = ({ winnerName, winnerScore }) => {
      setWinner({ name: winnerName, score: winnerScore });
      setGameStatus("waiting");
      setSecretWord("Round Over");
      setIsDrawer(false);
      setTimer(0);
      setAmIReady(false); // Reset ready for next round

      setTimeout(() => {
        setWinner(null);
        setSecretWord("");
      }, 5000);
    };

    // --- NEW: Handle Room Data (Host Info) ---
    const handleRoomData = ({ hostId }) => {
      setHostId(hostId);
    };

    // --- NEW: Handle Being Kicked ---
    const handleKicked = () => {
      alert("You were kicked from the room.");
      setGameStatus("waiting");
      setIsGameStarted(false);
      setUser((prev) => ({ ...prev, roomId: null }));
    };

    socket.on("game_started", handleGameStart);
    socket.on("your_word", handleWord);
    socket.on("update_players", handleUpdatePlayers);
    socket.on("game_over", handleGameOver);
    socket.on("timer_update", handleTimerUpdate);
    socket.on("room_data", handleRoomData); // Listen for host updates
    socket.on("kicked", handleKicked); // Listen for kicks

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

  // --- HELPER FUNCTIONS ---
  const joinRoom = ({ roomId }) => {
    if (!user) return;
    socket.emit("join_room", {
      room: roomId,
      name: user.username,
      userId: user.id,
    });
    setUser((prev) => ({ ...prev, roomId }));
    setIsGameStarted(true);
    setAmIReady(false);
  };

  const handleStartGame = () => {
    socket.emit("start_game", user.roomId);
  };

  const handleAuthSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setIsGameStarted(false);
  };

  // --- NEW ACTIONS ---
  const handleKick = (targetSocketId) => {
    socket.emit("kick_player", { room: user.roomId, targetSocketId });
  };

  const handleToggleReady = () => {
    const newReadyStatus = !amIReady;
    setAmIReady(newReadyStatus);
    socket.emit("toggle_ready", user.roomId);
  };

  const amIHost = socket?.id === hostId;

  if (!user) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans relative">
      {/* --- VICTORY OVERLAY --- */}
      {winner && (
        <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
          <div className="bg-white p-10 rounded-3xl shadow-2xl text-center border-8 border-yellow-400 transform scale-110 transition-transform">
            <h2 className="text-5xl font-black text-yellow-500 mb-4">
              🏆 WINNER! 🏆
            </h2>
            <p className="text-4xl font-bold text-gray-800 mb-2">
              {winner.name || "No one"}
            </p>
            <p className="text-xl text-gray-500 font-mono">
              Score: {winner.score || 0} pts
            </p>
          </div>
          <p className="text-white mt-8 text-lg font-bold animate-pulse">
            Next round starting soon...
          </p>
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
          {/* TOP BAR */}
          <div className="w-full max-w-7xl bg-white shadow-md rounded-lg p-4 mb-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-blue-600">DoodleQuest</h1>

            {/* CENTER: Game Controls & Status */}
            <div className="flex flex-col items-center">
              {gameStatus === "waiting" ? (
                <div className="flex flex-col items-center gap-2">
                  {/* HOST sees START, OTHERS see READY */}
                  {amIHost ? (
                    <button
                      onClick={handleStartGame}
                      className="bg-green-500 hover:bg-green-600 text-white px-8 py-2 rounded-full font-black text-lg shadow-lg transition transform hover:scale-105"
                    >
                      START GAME
                    </button>
                  ) : (
                    <button
                      onClick={handleToggleReady}
                      className={`px-8 py-2 rounded-full font-black text-lg shadow-lg transition transform hover:scale-105 ${
                        amIReady
                          ? "bg-gray-400 text-gray-700 hover:bg-gray-500"
                          : "bg-blue-500 text-white hover:bg-blue-600"
                      }`}
                    >
                      {amIReady ? "NOT READY" : "I'M READY!"}
                    </button>
                  )}

                  {!amIHost && amIReady && (
                    <p className="text-xs text-gray-500 animate-pulse">
                      Waiting for host...
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div
                    className={`text-2xl font-bold mb-1 ${
                      timer < 10 ? "text-red-600 animate-pulse" : "text-gray-700"
                    }`}
                  >
                    ⏱️ {timer}s
                  </div>
                  <p className="text-3xl font-mono tracking-widest font-bold text-gray-800">
                    {secretWord}
                  </p>
                  {isDrawer && (
                    <span className="text-xs text-blue-500 font-semibold uppercase tracking-wide">
                      Your Turn to Draw!
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT: User Profile & Role */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-bold text-gray-800">{user?.username}</p>
                <p className="text-xs text-gray-500 uppercase">
                  Room: {user?.roomId}
                </p>
              </div>
              <div
                className={`px-4 py-2 rounded-full text-sm font-bold ${
                  isDrawer
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {gameStatus === "waiting"
                  ? "Waiting..."
                  : isDrawer
                  ? "✏️ Drawer"
                  : "👀 Guesser"}
              </div>
            </div>
          </div>

          {/* GAME COLUMNS */}
          <div className="w-full max-w-7xl h-[600px] border-4 border-gray-800 rounded-xl overflow-hidden shadow-2xl bg-white flex flex-row">
            {/* COLUMN 1: Leaderboard (Updated with Host/Kick Props) */}
            <div className="w-1/5 h-full border-r-4 border-gray-800 hidden md:block">
              <PlayerList
                players={players}
                currentUserId={socket?.id}
                hostId={hostId}
                onKick={handleKick}
              />
            </div>

            {/* COLUMN 2: Whiteboard & Tools */}
            <div className="w-3/5 h-full relative border-r-4 border-gray-800 flex flex-col">
              {isDrawer && (
                <div className="bg-gray-100 p-2 flex justify-center gap-4 border-b-2 border-gray-300 shrink-0">
                  <button
                    onClick={() => setTool({ color: "black", size: 5 })}
                    className={`flex items-center gap-2 px-4 py-1 rounded font-bold transition ${
                      tool.color === "black"
                        ? "bg-blue-600 text-white shadow-lg"
                        : "bg-white text-gray-700 border hover:bg-gray-50"
                    }`}
                  >
                    ✏️ Pencil
                  </button>
                  <button
                    onClick={() => setTool({ color: "white", size: 20 })}
                    className={`flex items-center gap-2 px-4 py-1 rounded font-bold transition ${
                      tool.color === "white"
                        ? "bg-blue-600 text-white shadow-lg"
                        : "bg-white text-gray-700 border hover:bg-gray-50"
                    }`}
                  >
                    🧼 Eraser
                  </button>
                </div>
              )}

              <div className="flex-1 relative w-full h-full">
                <WhiteBoard
                  roomId={user?.roomId}
                  readOnly={!isDrawer}
                  color={tool.color}
                  size={tool.size}
                />
                {!isDrawer && (
                  <div className="absolute inset-0 z-10 cursor-default"></div>
                )}
              </div>
            </div>

            {/* COLUMN 3: Chat */}
            <div className="w-1/5 h-full flex flex-col">
              <Chat roomId={user?.roomId} userName={user?.username} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;