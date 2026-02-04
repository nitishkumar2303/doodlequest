import { useState } from "react";
import ProfileModal from "./ProfileModal"; // <--- Import Component

// Added 'userId' prop so we know whose profile to fetch
const Lobby = ({ joinRoom, defaultName, userId, onLogout }) => {
  const [roomId, setRoomId] = useState("");
  const [showProfile, setShowProfile] = useState(false); // <--- State for Modal

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!roomId) return alert("Please Enter a Room ID");
    joinRoom({ roomId });
  };

  const generateRoomId = () => {
    const randomId = Math.random().toString(36).substring(2, 7);
    setRoomId(randomId);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-blue-50">
      <div className="bg-white p-8 rounded-lg shadow-xl w-96">
        
        <h1 className="text-3xl font-bold text-center mb-2 text-blue-600">
          DoodleQuest
        </h1>
        
        <p className="text-center text-gray-500 mb-6">
          Welcome back, <span className="font-bold text-gray-800">{defaultName}</span>!
        </p>

        {/* --- NEW: PROFILE BUTTON --- */}
        <button 
          onClick={() => setShowProfile(true)}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded-lg mb-4 transition shadow-md flex items-center justify-center gap-2"
        >
          👤 My Profile
        </button>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors mt-2"
          >
            Enter Room
          </button>
        </form>

        <div className="mt-6 border-t pt-4 text-center">
          <button
            onClick={onLogout}
            className="text-sm text-red-500 hover:text-red-700 hover:underline font-medium"
          >
            Log Out
          </button>
        </div>
      </div>

      {/* --- RENDER MODAL --- */}
      <ProfileModal 
        isOpen={showProfile} 
        onClose={() => setShowProfile(false)} 
        userId={userId} 
      />
    </div>
  );
};

export default Lobby;