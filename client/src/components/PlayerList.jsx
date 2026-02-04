import { useState } from "react";
import ProfileModal from "./ProfileModal";

const PlayerList = ({ players, currentUserId, hostId, onKick }) => {
  // --------------------------------------------------------------------------
  // STATE MANAGEMENT
  // --------------------------------------------------------------------------
  
  // Tracks which user's profile modal is currently open (stores the userId)
  const [selectedProfileId, setSelectedProfileId] = useState(null);

  // Helper boolean: Am I the Room Host?
  // We use this to decide if we should show the "Kick" (X) buttons.
  const amIHost = currentUserId === hostId;

  // --------------------------------------------------------------------------
  // RENDER UI
  // --------------------------------------------------------------------------
  return (
    <div className="h-full flex flex-col bg-gray-50">
      
      {/* HEADER: Player Count & Host Name */}
      <div className="p-4 bg-gray-800 text-white font-bold text-lg flex justify-between items-center">
        <span>Players ({players.length})</span>
        {/* Find the host's name from the list to display in the corner */}
        <span className="text-xs bg-gray-700 px-2 py-1 rounded">
          Host: {players.find((p) => p.id === hostId)?.name || "?"}
        </span>
      </div>

      {/* SCROLLABLE LIST AREA */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {players.map((player) => (
          <div
            key={player.id}
            // Dynamic Styling: Highlight "My" card in Blue so I can find myself easily
            className={`flex items-center justify-between p-2 rounded-lg border-2 transition ${
              player.id === currentUserId
                ? "border-blue-400 bg-blue-50"
                : "border-gray-200 bg-white"
            }`}
          >
            {/* LEFT SECTION: Avatar + Name + Status */}
            {/* Clicking this whole area opens the Profile Modal */}
            <div
              onClick={() => setSelectedProfileId(player.userId)}
              className="flex items-center gap-3 cursor-pointer hover:opacity-75"
            >
              {/* Avatar Image (Generated based on username seed) */}
              <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border shrink-0">
                <img
                  src={`https://api.dicebear.com/9.x/pixel-art/svg?seed=${player.name}`}
                  alt="av"
                />
              </div>
              
              <div className="flex flex-col">
                <p className="font-bold text-sm text-gray-800 flex items-center gap-2">
                  {/* Player Name */}
                  <span>{player.name}</span>

                  {/* Crown Icon for Host */}
                  {player.id === hostId && <span title="Host">👑</span>}

                  {/* --- STATUS BADGES (After Name) --- */}
                  {/* We don't show "Ready" status for the Host, only for guests */}
                  {!player.isHost && (
                    <>
                      {player.isReady ? (
                        <span className="text-green-600 bg-green-100 px-1.5 py-0.5 rounded-[4px] text-[9px] border border-green-200 font-bold uppercase tracking-wide">
                          READY
                        </span>
                      ) : (
                        <span className="text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-[4px] text-[9px] border border-gray-200 font-bold uppercase tracking-wide">
                          NOT READY
                        </span>
                      )}
                    </>
                  )}
                </p>
                {/* Score Display */}
                <p className="text-xs text-gray-500 font-mono">
                  {player.score} pts
                </p>
              </div>
            </div>

            {/* RIGHT SECTION: Kick Button */}
            <div className="flex items-center gap-2">
              {/* Show Kick button ONLY if:
                  1. I am the Host
                  2. This player is NOT me (can't kick yourself)
              */}
              {amIHost && player.id !== currentUserId && (
                <button
                  onClick={() => onKick(player.id)}
                  className="text-gray-300 hover:text-red-500 font-bold px-2 transition-colors"
                  title="Kick Player"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* PROFILE POPUP */}
      {/* This modal sits "outside" the list but is controlled by the state here */}
      <ProfileModal
        isOpen={!!selectedProfileId} // Converts ID string to boolean (true if ID exists)
        onClose={() => setSelectedProfileId(null)} // Close by clearing state
        userId={selectedProfileId}
      />
    </div>
  );
};

export default PlayerList;