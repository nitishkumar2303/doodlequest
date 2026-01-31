import { useEffect, useState } from "react";
import { useSocket } from "./context/SocketContext";
import "./App.css";
import WhiteBoard from "./components/WhiteBoard.jsx";
import Lobby from "./components/Lobby.jsx";

function App() {
  const socket = useSocket();
  const [user, setUser] = useState(null); // Tracks { name, roomId }
  const [isGameStarted, setIsGameStarted] = useState(false);

  const joinRoom = ({ name, roomId }) => {
    // 1. Tell Server to join the room
    socket.emit("join_room", roomId);

    // 2. Save local state
    setUser({ name, roomId });
    setIsGameStarted(true);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {!isGameStarted ? (
        // SHOW LOBBY
        <Lobby joinRoom={joinRoom} />
      ) : (
        // SHOW GAME BOARD
        <div className="flex flex-col items-center">
          <div className="w-full bg-white shadow-md p-4 mb-4 flex justify-between items-center">
            <h1 className="text-xl font-bold text-blue-600">DoodleQuest</h1>
            <div className="flex gap-4">
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                Room: {user?.roomId}
              </span>
              <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                Player: {user?.name}
              </span>
            </div>
          </div>

          <div className="border-4 border-gray-800 rounded-lg overflow-hidden shadow-2xl bg-white">
            {/* Pass roomId to Whiteboard so it knows where to emit events */}
            <WhiteBoard roomId={user?.roomId} />
          </div>
        </div>
      )}
    </div>
  );  
}

export default App;
