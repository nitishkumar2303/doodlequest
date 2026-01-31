import { useState, useEffect, useRef } from "react";

import { useSocket } from "../context/SocketContext";

const Chat = ({ roomId, userName }) => {
  const socket = useSocket();
  const [message, setMessage] = useState([]);
  const [input, setInput] = useState("");
  const messageEndRef = useRef(null); //using this to auto scroll the message to bottom

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (data) => {
      setMessage((prev) => [...prev, data]);
    };

    socket.on("receive_message", handleMessage);

    return () => {
      socket.off("receive_message", handleMessage);
    };
  }, [socket]);

  //this whill autoscroll out message when the new message arrives
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [message]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (input.trim() === "") return;

    const messageData = {
      room: roomId,
      user: userName,
      message: input,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    socket.emit("send_message", messageData);

    setInput("");
  };

  return (
    <div className="flex flex-col h-full bg-white border-l-4 border-gray-800 relative z-40">
      {/* HEADER */}
      <div className="bg-gray-800 text-white p-4 font-bold text-center">
        Game Chat
      </div>

      {/* MESSAGES AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {message.map((msg, index) => (
          <div
            key={index}
            className={`text-sm p-2 rounded-lg break-words ${
              msg.user === "System"
                ? "bg-green-100 text-green-800 font-bold text-center" // System/Correct Guess style
                : "bg-gray-100 text-gray-800" // Normal Chat style
            }`}
          >
            {msg.user !== "System" && (
              <span className="font-bold text-blue-600">{msg.user}: </span>
            )}
            {msg.message}
          </div>
        ))}
        <div ref={messageEndRef} />
      </div>

      {/* INPUT AREA */}
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
