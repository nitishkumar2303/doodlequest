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
    // In production, this uses the variable from Vercel/Render.
    // In local development, it falls back to localhost:3001.
    const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";
    
    // B. Initialize the connection
    const newSocket = io(serverUrl);
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