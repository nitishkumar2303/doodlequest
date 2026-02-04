import { useState, useEffect, useRef } from "react";
import { useSocket } from "../context/SocketContext";

const Chat = ({ roomId, userName }) => {
  const socket = useSocket();
  
  // --------------------------------------------------------------------------
  // STATE & REFS
  // --------------------------------------------------------------------------
  
  // Stores the entire history of messages for this session
  const [message, setMessage] = useState([]);
  
  // Stores what the user is currently typing
  const [input, setInput] = useState("");
  
  // A reference to the bottom of the chat list.
  // We use this to automatically scroll down when a new message pops up.
  const messageEndRef = useRef(null);

  // --------------------------------------------------------------------------
  // SOCKET LISTENERS
  // --------------------------------------------------------------------------
  
  useEffect(() => {
    if (!socket) return;

    // EVENT: Server sent a new message (could be a user chat OR a system alert)
    const handleMessage = (data) => {
      setMessage((prev) => [...prev, data]);
    };

    socket.on("receive_message", handleMessage);

    // Cleanup: Remove listener so we don't get duplicate messages
    return () => {
      socket.off("receive_message", handleMessage);
    };
  }, [socket]);

  // --------------------------------------------------------------------------
  // AUTO-SCROLL LOGIC
  // --------------------------------------------------------------------------
  
  // Whenever the 'message' array changes (new text arrives), 
  // scroll the view to the little invisible div at the bottom.
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [message]);

  // --------------------------------------------------------------------------
  // ACTIONS
  // --------------------------------------------------------------------------
  
  const sendMessage = (e) => {
    e.preventDefault(); // Stop form submit refresh
    
    // Don't send empty spaces
    if (input.trim() === "") return;

    const messageData = {
      room: roomId,
      user: userName,
      message: input,
      // Add a timestamp just in case we want to show it later
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    // Send to server
    socket.emit("send_message", messageData);

    // Clear the input box so they can type again
    setInput("");
  };

  // --------------------------------------------------------------------------
  // RENDER UI
  // --------------------------------------------------------------------------
  return (
    <div className="flex flex-col h-full bg-white border-l-4 border-gray-800 relative z-40">
      
      {/* HEADER: Simple Title */}
      <div className="bg-gray-800 text-white p-4 font-bold text-center">
        Game Chat
      </div>

      {/* MESSAGES AREA: The scrollable list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {message.map((msg, index) => (
          <div
            key={index}
            // CONDITIONAL STYLING:
            // If it's a "System" message (someone guessed right), make it Green & Centered.
            // Otherwise, make it Gray (normal chat).
            className={`text-sm p-2 rounded-lg break-words ${
              msg.user === "System"
                ? "bg-green-100 text-green-800 font-bold text-center" 
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {/* Show Username only for normal messages */}
            {msg.user !== "System" && (
              <span className="font-bold text-blue-600">{msg.user}: </span>
            )}
            {msg.message}
          </div>
        ))}
        {/* Invisible element at the bottom to target for auto-scrolling */}
        <div ref={messageEndRef} />
      </div>

      {/* INPUT AREA: Text box + Enter key support */}
      <form onSubmit={sendMessage} className="p-4 border-t border-gray-300">
        <input
          type="text"
          placeholder="Type your guess..."
          className="w-full px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
      </form>
    </div>
  );
};

export default Chat;