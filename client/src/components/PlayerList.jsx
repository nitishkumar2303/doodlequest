import { useState } from "react";
import ProfileModal from "./ProfileModal";

const PlayerList = ({ players, currentUserId, hostId, onKick }) => {
  const [selectedProfileId, setSelectedProfileId] = useState(null);

  const amIHost = currentUserId === hostId;

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="p-4 bg-gray-800 text-white font-bold text-lg flex justify-between items-center">
        <span>Players ({players.length})</span>
        <span className="text-xs bg-gray-700 px-2 py-1 rounded">
          Host: {players.find((p) => p.id === hostId)?.name || "?"}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {players.map((player) => (
          <div
            key={player.id}
            className={`flex items-center justify-between p-2 rounded-lg border-2 transition ${
              player.id === currentUserId
                ? "border-blue-400 bg-blue-50"
                : "border-gray-200 bg-white"
            }`}
          >
            {/* LEFT: Avatar + Name (Clickable) */}
            <div
              onClick={() => setSelectedProfileId(player.userId)}
              className="flex items-center gap-3 cursor-pointer hover:opacity-75"
            >
              <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border shrink-0">
                <img
                  src={`https://api.dicebear.com/9.x/pixel-art/svg?seed=${player.name}`}
                  alt="av"
                />
              </div>
              
              <div className="flex flex-col">
                <p className="font-bold text-sm text-gray-800 flex items-center gap-2">
                  {/* Name */}
                  <span>{player.name}</span>

                  {/* Host Icon */}
                  {player.id === hostId && <span title="Host">👑</span>}

                  {/* --- STATUS (After Name) --- */}
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
                <p className="text-xs text-gray-500 font-mono">
                  {player.score} pts
                </p>
              </div>
            </div>

            {/* RIGHT: Kick Button (Only for Host) */}
            <div className="flex items-center gap-2">
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

      <ProfileModal
        isOpen={!!selectedProfileId}
        onClose={() => setSelectedProfileId(null)}
        userId={selectedProfileId}
      />
    </div>
  );
};

export default PlayerList;