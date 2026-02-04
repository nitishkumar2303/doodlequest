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

  // NEW: Winner State for Victory Screen
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

    // UPDATED: Handle Game Over & Show Winner
    const handleGameOver = ({ winnerName, winnerScore }) => {
      // 1. Set Winner Data (Triggers Overlay)
      setWinner({ name: winnerName, score: winnerScore });

      // 2. Reset Game State
      setGameStatus("waiting");
      setSecretWord("Round Over");
      setIsDrawer(false);
      setTimer(0);

      // 3. Clear Winner after 5 seconds (Auto-hide overlay)
      setTimeout(() => {
        setWinner(null);
        setSecretWord("");
      }, 5000);
    };

    socket.on("game_started", handleGameStart);
    socket.on("your_word", handleWord);
    socket.on("update_players", handleUpdatePlayers);
    socket.on("game_over", handleGameOver);
    socket.on("timer_update", handleTimerUpdate);

    return () => {
      socket.off("game_started", handleGameStart);
      socket.off("your_word", handleWord);
      socket.off("update_players", handleUpdatePlayers);
      socket.off("timer_update", handleTimerUpdate);
      socket.off("game_over", handleGameOver);
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

  if (!user) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans relative">
      {/* --- NEW: VICTORY OVERLAY --- */}
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

            <div className="flex flex-col items-center">
              {gameStatus === "waiting" ? (
                <button
                  onClick={handleStartGame}
                  className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-full font-bold shadow transition"
                >
                  Start Game
                </button>
              ) : (
                <div className="flex flex-col items-center">
                  <div
                    className={`text-2xl font-bold mb-1 ${timer < 10 ? "text-red-600 animate-pulse" : "text-gray-700"}`}
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

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-bold text-gray-800">{user?.username}</p>
                <p className="text-xs text-gray-500 uppercase">
                  Room: {user?.roomId}
                </p>
              </div>
              <div
                className={`px-4 py-2 rounded-full text-sm font-bold ${isDrawer ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-600"}`}
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
            <div className="w-1/5 h-full border-r-4 border-gray-800 hidden md:block">
              <PlayerList players={players} />
            </div>

            <div className="w-3/5 h-full relative border-r-4 border-gray-800 flex flex-col">
              {isDrawer && (
                <div className="bg-gray-100 p-2 flex justify-center gap-4 border-b-2 border-gray-300 shrink-0">
                  <button
                    onClick={() => setTool({ color: "black", size: 5 })}
                    className={`flex items-center gap-2 px-4 py-1 rounded font-bold transition ${tool.color === "black" ? "bg-blue-600 text-white shadow-lg" : "bg-white text-gray-700 border hover:bg-gray-50"}`}
                  >
                    ✏️ Pencil
                  </button>
                  <button
                    onClick={() => setTool({ color: "white", size: 20 })}
                    className={`flex items-center gap-2 px-4 py-1 rounded font-bold transition ${tool.color === "white" ? "bg-blue-600 text-white shadow-lg" : "bg-white text-gray-700 border hover:bg-gray-50"}`}
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
