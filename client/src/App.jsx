import { useEffect, useState } from "react";
import { useSocket } from "./context/SocketContext";
import "./App.css"; 

import WhiteBoard from "./components/WhiteBoard.jsx";
import Lobby from "./components/Lobby.jsx";
import Chat from "./components/Chat.jsx";
import PlayerList from "./components/PlayerList.jsx";
import AuthPage from "./components/AuthPage.jsx";

function App() {
  const socket = useSocket();

  // STATE
  const [user, setUser] = useState(null); 
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [isDrawer, setIsDrawer] = useState(false);
  const [secretWord, setSecretWord] = useState("");
  const [gameStatus, setGameStatus] = useState("waiting");
  const [timer, setTimer] = useState(0); 
  const [hostId, setHostId] = useState(null);
  const [amIReady, setAmIReady] = useState(false); 
  const [winner, setWinner] = useState(null); 
  const [players, setPlayers] = useState([]); 
  const [tool, setTool] = useState({ color: "black", size: 5 }); 

  // SOCKETS
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleGameStart = ({ drawerId, wordLength }) => {
      setGameStatus("playing"); setAmIReady(false);
      if (socket.id === drawerId) { setIsDrawer(true); } else { setIsDrawer(false); setSecretWord("_ ".repeat(wordLength)); }
    };
    const handleWord = (word) => setSecretWord(word);
    const handleUpdatePlayers = (list) => setPlayers(list);
    const handleTimerUpdate = (t) => setTimer(t);
    const handleRoomData = ({ hostId }) => setHostId(hostId);
    const handleGameOver = ({ winnerName, winnerScore }) => {
      setWinner({ name: winnerName, score: winnerScore });
      setGameStatus("waiting"); setSecretWord("Done!"); setIsDrawer(false); setTimer(0); setAmIReady(false);
      setTimeout(() => { setWinner(null); setSecretWord(""); }, 5000);
    };
    const handleKicked = () => { alert("Host kicked you."); handleLeaveRoom(); };

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

  // ACTIONS
  const joinRoom = ({ roomId }) => {
    if (!user) return;
    socket.emit("join_room", { room: roomId, name: user.username, userId: user.id });
    setUser((prev) => ({ ...prev, roomId }));
    setIsGameStarted(true);
    setAmIReady(false);
  };
  const handleStartGame = () => socket.emit("start_game", user.roomId);
  const handleAuthSuccess = (u) => setUser(u);
  const handleLeaveRoom = () => { if (user?.roomId) socket.emit("leave_room", { room: user.roomId }); setGameStatus("waiting"); setIsGameStarted(false); setPlayers([]); setUser((prev) => ({ ...prev, roomId: null })); setAmIReady(false); };
  const handleKick = (id) => socket.emit("kick_player", { room: user.roomId, targetSocketId: id });
  const handleToggleReady = () => { setAmIReady(!amIReady); socket.emit("toggle_ready", user.roomId); };
  const handleLogout = () => { localStorage.removeItem("token"); localStorage.removeItem("user"); setUser(null); setIsGameStarted(false); };
  const amIHost = socket?.id === hostId;

  // RENDER
  if (!user) return <AuthPage onAuthSuccess={handleAuthSuccess} />;

  return (
    <div className="min-h-screen p-4 flex flex-col items-center justify-center font-['Fredoka'] relative">
      
      {/* WINNER STICKER */}
      {winner && (
        <div className="fixed inset-0 bg-white/80 flex flex-col items-center justify-center z-50">
          <div className="sketch-card p-12 text-center transform rotate-2 animate-bounce border-4 border-yellow-400">
            <h2 className="text-6xl font-black text-gray-800 mb-2 font-['Patrick_Hand']">🏆 {winner.name} Wins!</h2>
            <div className="text-3xl font-bold text-yellow-600 bg-yellow-100 px-6 py-2 rounded-full inline-block">+{winner.score} Points</div>
          </div>
        </div>
      )}

      {!isGameStarted ? (
        <Lobby joinRoom={joinRoom} defaultName={user.username} userId={user.id} onLogout={handleLogout} />
      ) : (
        <div className="w-full max-w-7xl flex flex-col gap-6 animate-fadeIn">
          
          {/* TOP BAR */}
          <div className="sketch-card px-8 py-4 flex items-center justify-between pt-6">
            <div className="flex items-center gap-6">
              <h1 className="text-3xl font-bold text-gray-800 font-['Patrick_Hand'] hidden md:block">
                Doodle<span className="text-blue-500">Quest</span>
              </h1>
              <div className={`px-4 py-1 rounded-full font-bold uppercase text-xs tracking-wider border-2 border-black ${isDrawer ? "bg-orange-300" : "bg-blue-300"}`}>
                {gameStatus === "waiting" ? "Waiting..." : isDrawer ? "✏️ Draw!" : "👀 Guess!"}
              </div>
            </div>

            <div className="flex-1 flex justify-center">
              {gameStatus === "waiting" ? (
                amIHost ? (
                  <button onClick={handleStartGame} className="btn-sketch-primary bg-green-400 hover:bg-green-300 text-green-900 border-green-900 animate-pulse">Start Class!</button>
                ) : (
                  <button onClick={handleToggleReady} className={`btn-sketch-secondary ${amIReady ? "bg-green-100 text-green-700 border-green-500" : "bg-red-50 text-red-500"}`}>
                    {amIReady ? "✅ I'm Ready!" : "❌ Not Ready"}
                  </button>
                )
              ) : (
                <div className="flex items-center gap-4 bg-gray-100 px-8 py-2 rounded-lg border-2 border-gray-300">
                  <span className={`text-3xl font-bold font-['Patrick_Hand'] ${timer < 10 ? "text-red-500" : "text-gray-700"}`}>{timer}s</span>
                  <div className="w-0.5 h-8 bg-gray-300"></div>
                  <span className="text-2xl font-bold font-['Patrick_Hand'] tracking-widest uppercase text-blue-600">{secretWord}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
               <div className="flex flex-col items-end">
                 <span className="font-bold text-gray-700 font-['Patrick_Hand'] text-lg">{user?.username}</span>
                 <div className="bg-yellow-50 text-yellow-800 px-2 py-0.5 border border-yellow-200 text-sm font-bold transform rotate-1">Room: {user?.roomId}</div>
               </div>
               <button onClick={handleLeaveRoom} className="btn-sketch-danger">Exit</button>
            </div>
          </div>

          {/* MAIN GRID */}
          <div className="flex flex-col md:flex-row gap-6 h-[600px]">
            {/* Players */}
            <div className="sketch-card w-full md:w-64 p-4 overflow-hidden flex flex-col pt-6">
              <h3 className="text-gray-500 font-bold text-xl font-['Patrick_Hand'] mb-4 text-center border-b-2 border-dashed border-gray-200 pb-2">Classmates</h3>
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <PlayerList players={players} currentUserId={socket?.id} hostId={hostId} onKick={handleKick} />
              </div>
            </div>

            {/* Canvas */}
            <div className="sketch-card flex-1 p-2 relative flex flex-col overflow-hidden pt-6">
              {isDrawer && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 bg-white p-2 rounded-lg border-2 border-gray-800 shadow-md flex gap-2">
                   {/* COLOR PALETTE */}
                   {['black', '#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#f97316'].map(c => (
                     <button key={c} onClick={() => setTool({ ...tool, color: c, size: 5 })} className={`w-8 h-8 rounded-full border-2 border-white shadow-sm hover:scale-110 ${tool.color === c && tool.size === 5 ? 'ring-2 ring-gray-400 scale-110' : ''}`} style={{ backgroundColor: c }} />
                   ))}
                   <div className="w-0.5 h-8 bg-gray-200 mx-1"></div>
                   
                   {/* ERASER BUTTON - Sets color to white and size to 20 */}
                   <button onClick={() => setTool({ ...tool, color: 'white', size: 20 })} className={`text-2xl hover:-translate-y-1 ${tool.color === 'white' ? 'opacity-100 scale-125' : 'opacity-50'}`}>🧽</button>
                   
                   {/* PENCIL BUTTON - Resets to black and size 5 */}
                   <button onClick={() => setTool({ ...tool, color: 'black', size: 5 })} className="text-2xl hover:-translate-y-1">✏️</button>
                </div>
              )}
              <div className="flex-1 border-2 border-dashed border-gray-300 rounded bg-white relative cursor-crosshair m-2">
                <WhiteBoard roomId={user?.roomId} readOnly={gameStatus === "playing" && !isDrawer} color={tool.color} size={tool.size} />
                {gameStatus === "playing" && !isDrawer && <div className="absolute inset-0 z-10 cursor-default"></div>}
              </div>
            </div>

            {/* Chat */}
            <div className="sketch-card w-full md:w-80 p-0 overflow-hidden flex flex-col pt-6">
              <Chat roomId={user?.roomId} userName={user?.username} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;