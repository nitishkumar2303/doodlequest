import { useEffect, useState } from "react";
import { useSocket } from "./context/SocketContext";
import "./App.css";
import WhiteBoard from "./components/WhiteBoard.jsx";

function App() {
  const socket = useSocket();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!socket) return;

    socket.on("connect", () => {
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });
  }, [socket]);

  return (
    <div className="App">
      <h1>DoodleQuest</h1>
      {/* The Whiteboard takes up most of the screen */}
      <div className="board-container">
        <WhiteBoard />
      </div>
    </div>
  );
}

export default App;
