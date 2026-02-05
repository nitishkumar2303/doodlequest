import { createContext, useContext, useEffect, useState } from "react";
import io from "socket.io-client";

// 1. Create the Context Object
// This acts like a global "container" that will hold our active connection
const SocketContext = createContext();

// 2. Custom Hook: useSocket()
// This is a shortcut. Instead of importing useContext and SocketContext in every file,
// components can just import { useSocket } from here to get the connection.
export const useSocket = () => useContext(SocketContext);

// 3. The Provider Component
// This wraps our entire App (in main.jsx) and manages the actual connection logic.
export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // A. Determine which server to connect to.
    // ⚠️ HARDCODED FIX: We force the app to talk to Render, never localhost.
    const serverUrl = "https://doodlequest-dfgy.onrender.com";
    
    // B. Initialize the connection
    // We add 'transports' to ensure it works smoothly on cloud networks like Render
    const newSocket = io(serverUrl, {
      transports: ["websocket", "polling"]
    });
    
    setSocket(newSocket);

    // C. Cleanup Function
    // If this component unmounts (e.g., user closes tab or app crashes),
    // we strictly close the connection to prevent memory leaks on the server.
    return () => newSocket.close();
  }, []); // Empty dependency array [] means this runs ONLY once when the app starts.

  return (
    // D. Expose the 'socket' variable to all child components (the whole App)
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};