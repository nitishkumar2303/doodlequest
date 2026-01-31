import { useEffect, useState } from "react";
import { useSocket } from "./context/SocketContext";
import "./App.css";
import WhiteBoard from "./components/WhiteBoard.jsx";
import Lobby from "./components/Lobby.jsx";
import Chat from "./components/Chat.jsx";
import PlayerList from "./components/PlayerList.jsx"; // <--- NEW: Import Component

function App() {
  const socket = useSocket();
  const [user, setUser] = useState(null);
  const [isGameStarted, setIsGameStarted] = useState(false);

  const [isDrawer, setIsDrawer] = useState(false);
  const [secretWord, setSecretWord] = useState("");
  const [gameStatus, setGameStatus] = useState("waiting");

  const [players, setPlayers] = useState([]); // <--- NEW: State to store player list

  const [timer, setTimer] = useState(0);

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

    // <--- NEW: Function to handle player updates (scores/joins)
    const handleUpdatePlayers = (playerList) => {
      setPlayers(playerList);
    };

    socket.on("timer_update", (time) => {
      setTimer(time);
    });

    // <--- NEW: Attach Listeners
    socket.on("game_started", handleGameStart);
    socket.on("your_word", handleWord);
    socket.on("update_players", handleUpdatePlayers);

    return () => {
      // <--- NEW: Detach Listeners
      socket.off("game_started", handleGameStart);
      socket.off("your_word", handleWord);
      socket.off("update_players", handleUpdatePlayers);
      socket.off("timer_update");
    };
  }, [socket]);

  const joinRoom = ({ name, roomId }) => {
    socket.emit("join_room", { room: roomId, name: name });
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
          <div className="w-full max-w-7xl bg-white shadow-md rounded-lg p-4 mb-4 flex justify-between items-center">
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
                <div className="flex flex-col items-center">
                  {/* <--- NEW: TIMER DISPLAY */}
                  <div
                    className={`text-2xl font-bold mb-1 ${timer < 10 ? "text-red-600 animate-pulse" : "text-gray-700"}`}
                  >
                    ⏱️ {timer}s
                  </div>
                  {/* ----------------------- */}

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

          {/* 3-COLUMN LAYOUT CONTAINER */}
          <div className="w-full max-w-7xl h-[600px] border-4 border-gray-800 rounded-xl overflow-hidden shadow-2xl bg-white flex flex-row">
            {/* LEFT COLUMN - LEADERBOARD (20%) */}
            <div className="w-1/5 h-full border-r-4 border-gray-800 hidden md:block">
              <PlayerList players={players} />
            </div>

            {/* MIDDLE COLUMN - WHITEBOARD (60%) */}
            <div className="w-3/5 h-full relative border-r-4 border-gray-800">
              <WhiteBoard roomId={user?.roomId} readOnly={!isDrawer} />
              {!isDrawer && (
                <div className="absolute inset-0 z-10 cursor-default"></div>
              )}
            </div>

            {/* RIGHT COLUMN - CHAT (20%) */}
            <div className="w-1/5 h-full flex flex-col">
              <Chat roomId={user?.roomId} userName={user?.name} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
