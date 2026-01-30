import { useEffect, useState } from "react";
import { useSocket } from "./context/SocketContext";
import "./App.css";

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
      <h1>Doodle Quest</h1>
      <p>Status: {isConnected ? "🟢 Connected" : "🔴 Disconnected"}</p>
    </div>
  );
}

export default App;
