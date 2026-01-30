import { createContext, useContext, useEffect, useState } from "react";
import io from "socket.io-client";

const SocketContext = createContext();

//we are making custom hook to use Socket in more easy way
export const useSocket = () => useContext(SocketContext);


//this is basically a provdider we made in same file since we can't write this big code in vale: in app.jsx
export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {

    const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";
    const newSocket = io(serverUrl);
    setSocket(newSocket);

    //this basically does cleanup
    return () => newSocket.close();
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
