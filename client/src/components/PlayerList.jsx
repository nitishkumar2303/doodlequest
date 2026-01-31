const PlayerList = ({ players }) => {
  // Sort players by score (Highest at top)
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="bg-white border-r-4 border-gray-800 h-full flex flex-col">
      <div className="bg-yellow-400 text-gray-900 p-4 font-bold text-center border-b-4 border-gray-800">
        Leaderboard 🏆
      </div>

      <div className="p-2 space-y-2 overflow-y-auto">
        {sortedPlayers.map((player) => (
          <div
            key={player.id}
            className="flex justify-between items-center bg-gray-100 p-2 rounded-lg border-2 border-gray-200"
          >
            <div className="font-bold text-gray-700 truncate w-24">
              {player.name}
            </div>
            <div className="bg-blue-600 text-white text-sm font-bold px-2 py-1 rounded-full">
              {player.score} pts
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlayerList;
