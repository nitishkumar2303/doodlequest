import { useState } from "react";
import ProfileModal from "./ProfileModal";

const Lobby = ({ joinRoom, defaultName, userId, onLogout }) => {
  // --------------------------------------------------------------------------
  // STATE MANAGEMENT
  // --------------------------------------------------------------------------
  
  // The room code user types in (only used in Join mode)
  const [roomId, setRoomId] = useState("");
  
  // Controls which "Screen" we are showing inside the box:
  // 'menu'   = Main buttons (Create / Join / Profile)
  // 'join'   = Input field to type a code
  const [mode, setMode] = useState("menu"); 
  
  // Toggles the Profile popup modal
  const [showProfile, setShowProfile] = useState(false);

  // --------------------------------------------------------------------------
  // ACTIONS
  // --------------------------------------------------------------------------

  // CREATE ROOM: Makes a random ID and instantly joins it
  const handleCreate = () => {
    // Generate a random 5-character string (e.g., "7X29A")
    const newId = Math.random().toString(36).substring(2, 7).toUpperCase();
    
    // Call the parent function in App.jsx to actually connect
    joinRoom({ roomId: newId });
  };

  // JOIN ROOM: Validates input and joins existing room
  const handleJoin = (e) => {
    e.preventDefault(); // Stop page reload
    
    // Basic validation
    if (!roomId) return alert("Enter Room Code");
    
    // Join using the code typed (force Uppercase to match server format)
    joinRoom({ roomId: roomId.toUpperCase() });
  };

  // --------------------------------------------------------------------------
  // RENDER UI
  // --------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
      
      {/* The White Card Container */}
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md relative">
        
        {/* HEADER: Title & Welcome Message */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-gray-800 tracking-tight">DoodleQuest</h1>
          <p className="text-gray-500 mt-2 font-medium">Welcome, {defaultName}!</p>
        </div>

        {/* --- SCENE 1: MAIN MENU --- */}
        {mode === "menu" && (
          <div className="space-y-4">
            {/* 1. Create Button */}
            <button 
              onClick={handleCreate}
              className="w-full py-4 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-black text-xl rounded-2xl shadow-lg transform transition hover:scale-105"
            >
              🚀 CREATE ROOM
            </button>
            
            {/* 2. Join Button (Switches to 'join' mode) */}
            <button 
              onClick={() => setMode("join")}
              className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xl rounded-2xl border-2 border-gray-200 transition"
            >
              👋 JOIN ROOM
            </button>

            {/* 3. Bottom Row: Profile & Logout */}
            <div className="flex gap-2 mt-4">
                <button 
                  onClick={() => setShowProfile(true)}
                  className="flex-1 py-2 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-100 transition"
                >
                  👤 Profile
                </button>
                <button 
                  onClick={onLogout}
                  className="flex-1 py-2 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition"
                >
                  🚪 Logout
                </button>
            </div>
          </div>
        )}

        {/* --- SCENE 2: JOIN ROOM FORM --- */}
        {mode === "join" && (
          <form onSubmit={handleJoin} className="animate-fadeIn">
            <label className="block text-sm font-bold text-gray-500 mb-2">ENTER ROOM CODE</label>
            
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full bg-gray-100 border-2 border-gray-200 rounded-xl p-4 text-center text-2xl font-black tracking-widest uppercase focus:border-blue-500 focus:outline-none mb-4"
              placeholder="A B C 1 2"
              autoFocus
            />
            
            <div className="flex gap-3">
              {/* Back Button: Go to Menu */}
              <button 
                type="button" 
                onClick={() => setMode("menu")}
                className="flex-1 py-3 bg-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-300"
              >
                Back
              </button>
              
              {/* Submit Button: Join Room */}
              <button 
                type="submit"
                className="flex-[2] py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg"
              >
                Let's Go!
              </button>
            </div>
          </form>
        )}
      </div>

      {/* PROFILE POPUP MODAL */}
      <ProfileModal 
        isOpen={showProfile} 
        onClose={() => setShowProfile(false)} 
        userId={userId} 
      />
    </div>
  );
};

export default Lobby;