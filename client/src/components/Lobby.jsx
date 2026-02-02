import { useState } from "react";

// NEW PROPS: defaultName (from DB) and onLogout
const Lobby = ({ joinRoom, defaultName, onLogout }) => {
  // We only need to track roomId now, name is fixed!
  const [roomId, setRoomId] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!roomId) return alert("Please Enter a Room ID");

    // Pass ONLY the roomId back to App.jsx
    joinRoom({ roomId });
  };

  const generateRoomId = () => {
    const randomId = Math.random().toString(36).substring(2, 7);
    setRoomId(randomId);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-blue-50">
      <div className="bg-white p-8 rounded-lg shadow-xl w-96">
        
        {/* HEADER */}
        <h1 className="text-3xl font-bold text-center mb-2 text-blue-600">
          DoodleQuest
        </h1>
        
        {/* WELCOME MESSAGE (Replaces Name Input) */}
        <p className="text-center text-gray-500 mb-6">
          Welcome back, <span className="font-bold text-gray-800">{defaultName}</span>!
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {/* ROOM CODE INPUT */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Room Code
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: ab12c"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
              />
              <button
                type="button"
                onClick={generateRoomId}
                className="bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded-lg text-sm transition"
              >
                Random
              </button>
            </div>
          </div>

          {/* JOIN BUTTON */}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors mt-2"
          >
            Enter Room
          </button>
        </form>

        {/* LOGOUT BUTTON */}
        <div className="mt-6 border-t pt-4 text-center">
          <button
            onClick={onLogout}
            className="text-sm text-red-500 hover:text-red-700 hover:underline font-medium"
          >
            Log Out
          </button>
        </div>

      </div>
    </div>
  );
};

export default Lobby;