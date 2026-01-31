import { useState } from "react";

const Lobby = ({ joinRoom }) => {
  const [user, setUser] = useState({ name: "", roomId: "" });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!user.name || !user.roomId)
      return alert("Please Enter Room name and ID");

    joinRoom(user);
  };

  const generateRoomId = () => {
    const randomId = Math.random().toString(36).substring(2, 7);
    setUser({ ...user, roomId: randomId });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-blue-50">
      <div className="bg-white p-8 rounded-lg shadow-xl w-96">
        <h1 className="text-3xl font-bold text-center mb-8 text-blue-600">
          DoodleQuest
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Name
            </label>
            <input
              type="text"
              placeholder="Enter your name"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={user.name}
              onChange={(e) => setUser({ ...user, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Room Code
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: ab12c"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                value={user.roomId}
                onChange={(e) => setUser({ ...user, roomId: e.target.value })}
              />
              <button
                type="button"
                onClick={generateRoomId}
                className="bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded-lg text-sm"
              >
                Random
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors mt-4"
          >
            Enter Room
          </button>
        </form>
      </div>
    </div>
  );
};


export default Lobby;