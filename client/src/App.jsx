import { useEffect, useState } from "react";
import { useSocket } from "./context/SocketContext";
import "./App.css";

// Importing all our sub-components. 
// These handle specific parts of the game (Drawing, Chatting, Player List, etc.)
import WhiteBoard from "./components/WhiteBoard.jsx";
import Lobby from "./components/Lobby.jsx";
import Chat from "./components/Chat.jsx";
import PlayerList from "./components/PlayerList.jsx";
import AuthPage from "./components/AuthPage.jsx";

function App() {
  // We use our custom hook to get the active socket connection.
  // This is the bridge that lets us talk to the backend server.
  const socket = useSocket();

  // --------------------------------------------------------------------------
  // 1. STATE MANAGEMENT
  // This is where we keep track of everything happening in the app.
  // --------------------------------------------------------------------------
  
  // Who is currently logged in? (id, username, room they are in)
  const [user, setUser] = useState(null); 
  
  // Are we in the Lobby (false) or inside a Game Room (true)?
  const [isGameStarted, setIsGameStarted] = useState(false);

  // --- Game Mechanics ---
  const [isDrawer, setIsDrawer] = useState(false); // True if it's MY turn to draw
  const [secretWord, setSecretWord] = useState(""); // The word to draw OR underscores for guessers
  const [gameStatus, setGameStatus] = useState("waiting"); // 'waiting' = Lobby phase, 'playing' = Timer running
  const [timer, setTimer] = useState(0); // The countdown timer shown at the top

  // --- Room Coordination ---
  const [hostId, setHostId] = useState(null); // The socket ID of the room owner (boss)
  const [amIReady, setAmIReady] = useState(false); // Tracks if I clicked the "Ready" button

  // --- Victory Screen ---
  const [winner, setWinner] = useState(null); // If this has data, we show the big Trophy overlay

  // --- UI Data ---
  const [players, setPlayers] = useState([]); // List of everyone in the room (for the leaderboard)
  const [tool, setTool] = useState({ color: "black", size: 5 }); // My current pencil settings

  // --------------------------------------------------------------------------
  // 2. INITIALIZATION
  // --------------------------------------------------------------------------

  // When the app loads, check if the user was already logged in previously.
  // If yes, we restore their session so they don't have to login again.
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // --------------------------------------------------------------------------
  // 3. SOCKET EVENT LISTENERS
  // This is the most important part! We listen for messages from the server.
  // --------------------------------------------------------------------------
  useEffect(() => {
    // If the socket isn't ready yet, don't do anything.
    if (!socket) return;

    // EVENT: The host started the game!
    const handleGameStart = ({ drawerId, wordLength }) => {
      setGameStatus("playing"); // Switch UI to game mode
      setAmIReady(false); // Reset ready status so I'm not stuck as "Ready" for the next round
      
      // Check if I am the chosen one (The Drawer)
      if (socket.id === drawerId) {
        setIsDrawer(true); // Enable my whiteboard tools
      } else {
        setIsDrawer(false); // Disable my whiteboard (View Only)
        setSecretWord("_ ".repeat(wordLength)); // Show mystery blanks (e.g. "_ _ _ _")
      }
    };

    // EVENT: Receive the secret word (Only the Drawer gets the real word)
    const handleWord = (word) => {
      setSecretWord(word);
    };

    // EVENT: Someone joined, left, or changed score. Update the list.
    const handleUpdatePlayers = (playerList) => {
      setPlayers(playerList);
    };

    // EVENT: The server sent a timer update (tick... tock...)
    const handleTimerUpdate = (time) => {
      setTimer(time);
    };

    // EVENT: Update who the Host is (in case the old host disconnected)
    const handleRoomData = ({ hostId }) => {
      setHostId(hostId);
    };

    // EVENT: The round finished! Show who won.
    const handleGameOver = ({ winnerName, winnerScore }) => {
      // 1. Show the Victory Overlay
      setWinner({ name: winnerName, score: winnerScore });
      
      // 2. Reset the game state back to "Waiting" mode
      setGameStatus("waiting");
      setSecretWord("Round Over");
      setIsDrawer(false);
      setTimer(0);
      setAmIReady(false); // Important: Force everyone to click Ready again for next round
      
      // 3. Hide the overlay after 5 seconds automatically
      setTimeout(() => {
        setWinner(null);
        setSecretWord("");
      }, 5000);
    };

    // EVENT: I got kicked out of the room by the Host.
    const handleKicked = () => {
      alert("You were kicked from the room.");
      handleLeaveRoom(); // Trigger the leave logic to clean up my screen
    };

    // --- Attach all these listeners to the socket ---
    socket.on("game_started", handleGameStart);
    socket.on("your_word", handleWord);
    socket.on("update_players", handleUpdatePlayers);
    socket.on("game_over", handleGameOver);
    socket.on("timer_update", handleTimerUpdate);
    socket.on("room_data", handleRoomData);
    socket.on("kicked", handleKicked);

    // --- Cleanup: Remove listeners when this component unmounts ---
    // This prevents bugs where events fire multiple times.
    return () => {
      socket.off("game_started", handleGameStart);
      socket.off("your_word", handleWord);
      socket.off("update_players", handleUpdatePlayers);
      socket.off("timer_update", handleTimerUpdate);
      socket.off("game_over", handleGameOver);
      socket.off("room_data", handleRoomData);
      socket.off("kicked", handleKicked);
    };
  }, [socket]); // Run this effect whenever the 'socket' object changes

  // --------------------------------------------------------------------------
  // 4. ACTION HANDLERS (Button Clicks)
  // --------------------------------------------------------------------------

  // Called when user enters a Room ID in the Lobby
  const joinRoom = ({ roomId }) => {
    if (!user) return;
    
    // Tell server we are joining
    socket.emit("join_room", { 
      room: roomId, 
      name: user.username, 
      userId: user.id 
    });
    
    // Update local state to show the Game UI
    setUser((prev) => ({ ...prev, roomId }));
    setIsGameStarted(true);
    setAmIReady(false);
  };

  // Called when Host clicks "Start Game"
  const handleStartGame = () => {
    socket.emit("start_game", user.roomId);
  };

  // Called when AuthPage finishes login successfully
  const handleAuthSuccess = (userData) => {
    setUser(userData);
  };

  // Log out: Clear everything and go back to Login screen
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setIsGameStarted(false);
  };

  // Gracefully leave the room without logging out entirely
  const handleLeaveRoom = () => {
    if (user?.roomId) {
      socket.emit("leave_room", { room: user.roomId });
    }
    // Reset all game state so we are fresh for the next room
    setGameStatus("waiting");
    setIsGameStarted(false);
    setPlayers([]);
    setUser((prev) => ({ ...prev, roomId: null }));
    setAmIReady(false);
  };

  // Host wants to kick a specific player
  const handleKick = (targetSocketId) => {
    socket.emit("kick_player", { room: user.roomId, targetSocketId });
  };

  // Toggle my "Ready" status (Green badge)
  const handleToggleReady = () => {
    setAmIReady(!amIReady); // Flip true/false
    socket.emit("toggle_ready", user.roomId); // Tell server
  };

  // Helper boolean: Am I the Host?
  const amIHost = socket?.id === hostId;

  // --------------------------------------------------------------------------
  // 5. RENDER LOGIC (What the user sees)
  // --------------------------------------------------------------------------

  // SCENE 1: If not logged in, show the Login/Register Page
  if (!user) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans relative">
      
      {/* OVERLAY: Victory Screen (Only shows if 'winner' state is set) */}
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

      {/* SCENE 2: The Main Application */}
      {!isGameStarted ? (
        // A. LOBBY VIEW (Create or Join Room)
        <Lobby
          joinRoom={joinRoom}
          defaultName={user.username}
          userId={user.id}
          onLogout={handleLogout}
        />
      ) : (
        // B. GAME ROOM VIEW
        <div className="flex flex-col items-center p-4">
          
          {/* --- TOP BAR: Header, Timer, User Info --- */}
          <div className="w-full max-w-7xl bg-white shadow-md rounded-lg p-3 mb-4 flex items-center">
            
            {/* Left Section: Title & My Role Badge */}
            <div className="flex-1 flex items-center gap-4 justify-start">
              <h1 className="text-2xl font-black text-blue-600 tracking-tight whitespace-nowrap hidden md:block">
                DoodleQuest
              </h1>
              
              {/* Dynamic Badge: Shows if I am Waiting, Drawing, or Guessing */}
              <div className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider shadow-sm border ${
                isDrawer 
                  ? "bg-yellow-100 text-yellow-700 border-yellow-200" 
                  : "bg-blue-50 text-blue-600 border-blue-100"
              }`}>
                {gameStatus === "waiting" ? "⏳ WAITING" : isDrawer ? "✏️ DRAWER" : "👀 GUESSER"}
              </div>
            </div>

            {/* Center Section: The Action Area */}
            <div className="flex-1 flex justify-center">
              {gameStatus === "waiting" ? (
                // WAITING PHASE: Show buttons to get ready
                <div className="flex flex-col items-center gap-1">
                  {amIHost ? (
                    // Host sees "Start Game"
                    <button
                      onClick={handleStartGame}
                      className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-full font-black text-sm md:text-base shadow-lg transition transform hover:scale-105 whitespace-nowrap"
                    >
                      START GAME
                    </button>
                  ) : (
                    // Players see "I'm Ready"
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
                  {/* Helper text for non-hosts */}
                  {!amIHost && amIReady && <p className="text-[10px] text-gray-400 animate-pulse">Waiting for host...</p>}
                </div>
              ) : (
                // PLAYING PHASE: Show Timer & Secret Word
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

            {/* Right Section: My Profile & Exit Button */}
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

          {/* --- MAIN GAME LAYOUT (3 Columns) --- */}
          <div className="w-full max-w-7xl h-[600px] border-4 border-gray-800 rounded-xl overflow-hidden shadow-2xl bg-white flex flex-row">
            
            {/* 1. Left Column: Player Leaderboard */}
            <div className="w-1/5 h-full border-r-4 border-gray-800 hidden md:block bg-gray-50">
              <PlayerList 
                players={players} 
                currentUserId={socket?.id} 
                hostId={hostId} 
                onKick={handleKick} 
              />
            </div>

            {/* 2. Middle Column: Whiteboard Canvas */}
            <div className="w-3/5 h-full relative border-r-4 border-gray-800 flex flex-col">
              {/* Show drawing tools only if I am the drawer */}
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
                {/* Overlay to block interaction if it's not my turn */}
                {!isDrawer && <div className="absolute inset-0 z-10 cursor-default"></div>}
              </div>
            </div>

            {/* 3. Right Column: Chat Box */}
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