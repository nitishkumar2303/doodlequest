import { useEffect, useState } from "react";
import { useSocket } from "./context/SocketContext";
import "./App.css";

// Components
import WhiteBoard from "./components/WhiteBoard.jsx";
import Lobby from "./components/Lobby.jsx";
import Chat from "./components/Chat.jsx";
import PlayerList from "./components/PlayerList.jsx";
import AuthPage from "./components/AuthPage.jsx"; // We need this to handle Login/Register

function App() {
  const socket = useSocket();

  // --- STATE MANAGEMENT ---
  
  // 'user' holds the logged-in player's info (id, username, token)
  const [user, setUser] = useState(null); 
  
  // Tracks if we are in the Lobby or actually playing
  const [isGameStarted, setIsGameStarted] = useState(false);

  // Game Logic States
  const [isDrawer, setIsDrawer] = useState(false); // Am I the one drawing?
  const [secretWord, setSecretWord] = useState(""); // The word to draw or guess
  const [gameStatus, setGameStatus] = useState("waiting"); // 'waiting' | 'playing'
  const [timer, setTimer] = useState(0);

  // Data for the UI
  const [players, setPlayers] = useState([]); // List of everyone in the room
  const [tool, setTool] = useState({ color: "black", size: 5 }); // Drawing settings

  // --- EFFECT 1: CHECK LOGIN ON LOAD ---
  // When the app first opens, we check if the user is already logged in
  // by looking for their data in the browser's LocalStorage.
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // --- EFFECT 2: SOCKET EVENT LISTENERS ---
  // This is where we listen for all the game updates coming from the server.
  useEffect(() => {
    if (!socket) return; // Wait until socket connection is established

    // 1. GAME STARTED
    // The server tells us who is drawing and how long the word is.
    const handleGameStart = ({ drawerId, wordLength }) => {
      setGameStatus("playing");

      if (socket.id === drawerId) {
        setIsDrawer(true); // I am the artist!
      } else {
        setIsDrawer(false); // I am a guesser.
        // Show blanks like "_ _ _ _ _" instead of the word
        setSecretWord("_ ".repeat(wordLength)); 
      }
    };

    // 2. RECEIVE WORD
    // If I am the drawer, the server sends me the actual word to draw.
    const handleWord = (word) => {
      setSecretWord(word);
    };

    // 3. PLAYER UPDATES
    // Someone joined, left, or scored points. Update the leaderboard.
    const handleUpdatePlayers = (playerList) => {
      setPlayers(playerList);
    };

    // 4. TIMER UPDATE
    // The server counts down; we just display what it tells us.
    const handleTimerUpdate = (time) => {
      setTimer(time);
    };

    // 5. GAME OVER (ROUND END)
    // Reset everything back to the "Waiting" state.
    const handleGameOver = () => {
      setGameStatus("waiting");
      setSecretWord("Round Over");
      setIsDrawer(false);
      setTimer(0);
    };

    // Attach the listeners
    socket.on("game_started", handleGameStart);
    socket.on("your_word", handleWord);
    socket.on("update_players", handleUpdatePlayers);
    socket.on("game_over", handleGameOver);
    socket.on("timer_update", handleTimerUpdate);

    // CLEANUP: If this component unmounts, remove listeners to avoid duplicates
    return () => {
      socket.off("game_started", handleGameStart);
      socket.off("your_word", handleWord);
      socket.off("update_players", handleUpdatePlayers);
      socket.off("timer_update", handleTimerUpdate);
      socket.off("game_over", handleGameOver);
    };
  }, [socket]);

  // --- HELPER FUNCTIONS ---

  // Called when user clicks "Join Room" in the Lobby
  const joinRoom = ({ roomId }) => {
    if (!user) return; // Safety check
    
    // We send the 'username' from our database, so no one can fake a name.
    socket.emit("join_room", { room: roomId, name: user.username });
    
    // Update local state so UI knows we are in a room
    setUser((prev) => ({ ...prev, roomId }));
    setIsGameStarted(true);
  };

  // Only the host or drawer usually clicks this (logic handled on server)
  const handleStartGame = () => {
    socket.emit("start_game", user.roomId);
  };

  // Called by AuthPage after successful login
  const handleAuthSuccess = (userData) => {
    setUser(userData);
  };

  // Clears data and kicks user back to Login screen
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setIsGameStarted(false);
  };

  // --- RENDER: THE GATEKEEPER ---
  // If user is NOT logged in, stop here and show the Auth Page.
  if (!user) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  // --- RENDER: THE MAIN APP ---
  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      
      {/* SCENARIO A: User is logged in but hasn't joined a room yet */}
      {!isGameStarted ? (
        <Lobby 
            joinRoom={joinRoom} 
            defaultName={user.username} // Pass their DB username
            onLogout={handleLogout} 
        />
      ) : (
        
        /* SCENARIO B: User is in a room (Waiting or Playing) */
        <div className="flex flex-col items-center p-4">
          
          {/* --- TOP BAR (Header & Status) --- */}
          <div className="w-full max-w-7xl bg-white shadow-md rounded-lg p-4 mb-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-blue-600">DoodleQuest</h1>

            {/* CENTER: Status Indicators */}
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
                  {/* Timer turns red when low */}
                  <div className={`text-2xl font-bold mb-1 ${timer < 10 ? "text-red-600 animate-pulse" : "text-gray-700"}`}>
                    ⏱️ {timer}s
                  </div>

                  {/* The Word (or blanks) */}
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
                <p className="text-xs text-gray-500 uppercase">Room: {user?.roomId}</p>
              </div>
              
              <div className={`px-4 py-2 rounded-full text-sm font-bold ${isDrawer ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-600"}`}>
                {gameStatus === "waiting" ? "Waiting..." : isDrawer ? "✏️ Drawer" : "👀 Guesser"}
              </div>
            </div>
          </div>

          {/* --- GAME AREA (3 Columns) --- */}
          <div className="w-full max-w-7xl h-[600px] border-4 border-gray-800 rounded-xl overflow-hidden shadow-2xl bg-white flex flex-row">
            
            {/* COLUMN 1: Leaderboard */}
            <div className="w-1/5 h-full border-r-4 border-gray-800 hidden md:block">
              <PlayerList players={players} />
            </div>

            {/* COLUMN 2: Whiteboard & Tools */}
            <div className="w-3/5 h-full relative border-r-4 border-gray-800 flex flex-col">
              
              {/* Toolbar (Only visible to Drawer) */}
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

              {/* The Canvas */}
              <div className="flex-1 relative w-full h-full">
                <WhiteBoard
                  roomId={user?.roomId}
                  readOnly={!isDrawer} // Disable drawing if not the drawer
                  color={tool.color}
                  size={tool.size}
                />
                
                {/* Invisible blocker to prevent Guessers from clicking canvas */}
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