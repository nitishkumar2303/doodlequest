import { useEffect, useState } from "react";
import { useSocket } from "./context/SocketContext";
import "./App.css";
import WhiteBoard from "./components/WhiteBoard.jsx";
import Lobby from "./components/Lobby.jsx";

function App() {
  const socket = useSocket();
  const [user, setUser] = useState(null); // Tracks { name, roomId }
  const [isGameStarted, setIsGameStarted] = useState(false);

  const [isDrawer, setIsDrawer] = useState(false);
  const [secretWord, setSecretWord] = useState("");
  const [gameStatus, setGameStatus] = useState("waiting"); // waiting, playing

  useEffect(() => {
    if (!socket) return;

    const handleGameStart = ({ drawerId, wordLength }) => {
      setGameStatus("playing");

      if (socket.id === drawerId) {
        setIsDrawer(true); // FIX: Use function, not assignment
      } else {
        setIsDrawer(false);
        setSecretWord("_ ".repeat(wordLength)); // Show blanks to guessers
      }
    };

    const handleWord = (word) => {
      setSecretWord(word);
    };

    socket.on("game_started", handleGameStart);
    socket.on("your_word", handleWord);

    return () => {
      socket.off("game_started", handleGameStart);
      socket.off("your_word", handleWord);
    };
  }, [socket]);

  const joinRoom = ({ name, roomId }) => {
    // 1. Tell Server to join the room
    socket.emit("join_room", { room: roomId, name: name });

    // 2. Save local state
    setUser({ name, roomId });
    setIsGameStarted(true);
  };

  const handleStartGame = () => {
    socket.emit("start_game", user.roomId);
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      {!isGameStarted ? (
        <Lobby joinRoom={joinRoom} />
      ) : (
        <div className="flex flex-col items-center p-4">
          {/* TOP BAR */}
          <div className="w-full max-w-6xl bg-white shadow-md rounded-lg p-4 mb-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-blue-600">DoodleQuest</h1>

            {/* CENTER: Game Controls & Status */}
            <div className="flex flex-col items-center">
              {gameStatus === "waiting" ? (
                <button
                  onClick={handleStartGame}
                  className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-full font-bold shadow transition"
                >
                  Start Game
                </button>
              ) : (
                <div className="text-center">
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

            {/* RIGHT: Player Info */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-bold text-gray-800">{user?.name}</p>
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

          {/* GAME BOARD */}
          <div className="w-full max-w-6xl aspect-video border-4 border-gray-800 rounded-xl overflow-hidden shadow-2xl bg-white relative">
            <WhiteBoard
              roomId={user?.roomId}
              readOnly={!isDrawer} // FIX: Lock canvas if not drawer
            />

            {/* Overlay for guessers if needed, or just rely on readOnly */}
            {!isDrawer && gameStatus === "playing" && (
              <div className="absolute top-4 right-4 pointer-events-none">
                {/* Optional: Visual cue that they can't draw */}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
