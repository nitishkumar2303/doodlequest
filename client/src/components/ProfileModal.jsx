import { useEffect, useState } from "react";
import axios from "axios";

const ProfileModal = ({ userId, isOpen, onClose }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && userId) {
      fetchStats();
    }
  }, [isOpen, userId]);

  const fetchStats = async () => {
    try {
      // STRICTLY use the env variable
      const API_URL = import.meta.env.VITE_API_URL;
      
      const { data } = await axios.get(`${API_URL}/api/auth/profile/${userId}`);
      setStats(data);
    } catch (err) {
      console.error("Failed to load profile", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-96 relative border-4 border-blue-500">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 font-bold text-xl"
        >
          ✕
        </button>

        {loading || !stats ? (
          <div className="text-center py-10 font-bold text-gray-500">Loading Stats...</div>
        ) : (
          <div className="flex flex-col items-center">
            <img 
              src={`https://api.dicebear.com/9.x/pixel-art/svg?seed=${stats.avatar_seed}`} 
              alt="Avatar" 
              className="w-24 h-24 rounded-full border-4 border-blue-200 mb-4 bg-gray-100 shadow-inner"
            />
            
            <h2 className="text-2xl font-black text-gray-800 mb-1">{stats.username}</h2>
            <p className="text-sm text-gray-500 mb-6">Joined: {new Date(stats.created_at).toLocaleDateString()}</p>

            <div className="grid grid-cols-3 gap-4 w-full mb-6">
              <div className="text-center bg-blue-50 p-3 rounded-lg">
                <p className="text-xl font-bold text-blue-600">{stats.games_played}</p>
                <p className="text-xs text-gray-500 uppercase font-bold">Games</p>
              </div>
              <div className="text-center bg-green-50 p-3 rounded-lg">
                <p className="text-xl font-bold text-green-600">{stats.wins}</p>
                <p className="text-xs text-gray-500 uppercase font-bold">Wins</p>
              </div>
              <div className="text-center bg-purple-50 p-3 rounded-lg">
                <p className="text-xl font-bold text-purple-600">{stats.total_score}</p>
                <p className="text-xs text-gray-500 uppercase font-bold">Score</p>
              </div>
            </div>

            <div className="bg-gray-100 rounded-full px-4 py-1 text-sm font-semibold text-gray-600">
               Win Rate: {stats.games_played > 0 ? Math.round((stats.wins / stats.games_played) * 100) : 0}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileModal;