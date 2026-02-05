import { useState } from "react";
import ProfileModal from "./ProfileModal";

const Lobby = ({ joinRoom, defaultName, userId, onLogout }) => {
  const [roomId, setRoomId] = useState("");
  const [mode, setMode] = useState("menu"); 
  const [showProfile, setShowProfile] = useState(false);

  const handleCreate = () => {
    const newId = Math.random().toString(36).substring(2, 7).toUpperCase();
    joinRoom({ roomId: newId });
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!roomId) return alert("Enter Room Code");
    joinRoom({ roomId: roomId.toUpperCase() });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      
      {/* LOBBY CARD */}
      <div className="sketch-card w-full max-w-lg p-10 pt-12 text-center">
        
        {/* LOGO */}
        <div className="mb-10">
          <h1 className="text-6xl font-bold text-gray-800 mb-2 font-['Patrick_Hand']">
            Doodle<span className="text-blue-500 underline decoration-wavy decoration-2">Quest</span>
          </h1>
          <div className="inline-block bg-yellow-100 px-4 py-1 border border-yellow-300 rounded-full transform -rotate-1">
            <span className="text-yellow-700 font-bold font-['Patrick_Hand'] text-xl">Hello, {defaultName}! 👋</span>
          </div>
        </div>

        {/* MENU */}
        {mode === "menu" && (
          <div className="flex flex-col gap-5 animate-fadeIn">
            <button onClick={handleCreate} className="btn-sketch-primary bg-yellow-400 hover:bg-yellow-300 text-yellow-900 border-yellow-900">
              ✨ Start New Canvas
            </button>
            
            <button onClick={() => setMode("join")} className="btn-sketch-secondary">
              🔍 Find a Room
            </button>

            <div className="grid grid-cols-2 gap-4 mt-2">
                <button onClick={() => setShowProfile(true)} className="btn-sketch-secondary text-lg">
                  👤 ID Card
                </button>
                <button onClick={onLogout} className="btn-sketch-secondary text-red-500 border-red-200 hover:bg-red-50">
                  🚪 Leave
                </button>
            </div>
          </div>
        )}

        {/* JOIN INPUT */}
        {mode === "join" && (
          <form onSubmit={handleJoin} className="flex flex-col gap-6 animate-fadeIn">
            <div className="p-6 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
              <label className="block text-gray-500 text-xl font-bold mb-2 font-['Patrick_Hand']">Room Code on the Board:</label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full bg-transparent text-center text-5xl font-bold text-blue-600 outline-none font-['Patrick_Hand'] uppercase tracking-widest"
                placeholder="ABC12"
                autoFocus
                maxLength={5}
              />
            </div>
            
            <div className="flex gap-4">
               <button type="button" onClick={() => setMode("menu")} className="btn-sketch-secondary w-1/3">
                 Cancel
               </button>
               <button type="submit" className="btn-sketch-primary w-2/3">
                 Let's Go! 🚀
               </button>
            </div>
          </form>
        )}
      </div>

      <ProfileModal isOpen={showProfile} onClose={() => setShowProfile(false)} userId={userId} />
    </div>
  );
};

export default Lobby;