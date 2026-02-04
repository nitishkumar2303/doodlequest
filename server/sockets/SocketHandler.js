import pool from "../config/db.js"; 

const rooms = {}; 

export const setupSocketEvents = (io) => {
  io.on("connection", (socket) => {
    
    // --- JOIN ROOM ---
    socket.on("join_room", async ({ room, name, userId }) => {
      socket.join(room);
      
      try {
        // ... (Keep your existing DB Code here) ...
        // ... (For brevity, I am assuming the DB Insert code is same as before) ...
        let matchId;
        const [existingMatch] = await pool.query("SELECT id FROM matches WHERE room_code = ? AND end_time IS NULL", [room]);
        if (existingMatch.length === 0) {
            const [result] = await pool.query("INSERT INTO matches (room_code, host_id) VALUES (?, ?)", [room, userId]);
            matchId = result.insertId;
        } else {
            matchId = existingMatch[0].id;
        }
        await pool.query("INSERT IGNORE INTO match_participants (match_id, user_id) VALUES (?, ?)", [matchId, userId]);
        const [userData] = await pool.query("SELECT score FROM match_participants WHERE match_id = ? AND user_id = ?", [matchId, userId]);
        const savedScore = userData.length > 0 ? userData[0].score : 0;
        // ... (End of DB Code) ...

        // SETUP MEMORY
        if (!rooms[room]) {
          rooms[room] = {
            matchId: matchId, 
            players: [],
            hostId: socket.id, // --- NEW: First player is Host
            drawer: null,
            word: null,
            correctGuesses: [],
            timer: null,
            timeLeft: 0,
            gameActive: false,
            drawingData: [] 
          };
        }
        
        const existingPlayer = rooms[room].players.find(p => p.userId === userId);
        
        if (existingPlayer) {
            existingPlayer.id = socket.id; 
            existingPlayer.score = savedScore; 
            existingPlayer.isReady = false; // Reset ready on rejoin
        } else {
            rooms[room].players.push({ 
                id: socket.id, 
                userId: userId, 
                name: name, 
                score: savedScore,
                isReady: false, // --- NEW: Track Ready Status
                isHost: rooms[room].players.length === 0 // First joiner is host
            });
        }

        // Emit updated list AND host ID so clients know permissions
        io.to(room).emit("update_players", rooms[room].players);
        io.to(room).emit("room_data", { hostId: rooms[room].hostId });

        // Late Joiner Sync
        if (rooms[room].gameActive) {
            io.to(socket.id).emit("game_started", { 
                drawerId: rooms[room].drawer, 
                wordLength: rooms[room].word.length 
            });
            io.to(socket.id).emit("timer_update", rooms[room].timeLeft);
            rooms[room].drawingData.forEach(a => socket.emit(a.type, a.data));
        }

      } catch (err) {
        console.error("DB Error:", err);
      }
    });

    // --- NEW: TOGGLE READY ---
    socket.on("toggle_ready", (room) => {
        if (!rooms[room]) return;
        const player = rooms[room].players.find(p => p.id === socket.id);
        if (player) {
            player.isReady = !player.isReady;
            io.to(room).emit("update_players", rooms[room].players);
        }
    });

    // --- NEW: KICK PLAYER ---
    socket.on("kick_player", ({ room, targetSocketId }) => {
        if (!rooms[room]) return;
        
        // Security: Only Host can kick
        if (rooms[room].hostId !== socket.id) return;

        // Notify the kicked user
        io.to(targetSocketId).emit("kicked");
        
        // Remove from memory
        const pIndex = rooms[room].players.findIndex(p => p.id === targetSocketId);
        if (pIndex !== -1) {
            rooms[room].players.splice(pIndex, 1);
            io.to(room).emit("update_players", rooms[room].players);
        }

        // Force disconnect socket from room
        const targetSocket = io.sockets.sockets.get(targetSocketId);
        if (targetSocket) {
            targetSocket.leave(room);
        }
    });

    // --- START GAME (UPDATED) ---
    socket.on("start_game", (room) => {
      const roomData = rooms[room];
      if (!roomData) return;

      // Security: Only Host can start
      if (roomData.hostId !== socket.id) return;

      // Logic: Everyone (except host) must be ready? 
      // Or just enforce > 1 player. Let's stick to > 1 player for now.
      if (roomData.players.length < 2) return; 

      // ... (Keep existing Game Loop Logic exactly the same) ...
      // ... (Copy/Paste your previous start_game logic here) ...
      
      // Just ensure you set:
      roomData.gameActive = true;
      roomData.drawingData = [];
      io.to(room).emit("clear_canvas");
      
      // ... (Standard Drawer/Word/Timer setup) ...
      // For brevity, I'm skipping repeating the 50 lines of timer code 
      // assuming you keep the previous logic.
    });

    // ... (Keep Chat, Drawing, Disconnect logic same) ...
    
    // UPDATE DISCONNECT TO HANDLE HOST LEAVING
    socket.on("disconnect", () => {
        for (const roomId in rooms) {
            const room = rooms[roomId];
            const pIndex = room.players.findIndex(p => p.id === socket.id);
            if (pIndex !== -1) {
                const wasHost = room.hostId === socket.id;
                room.players.splice(pIndex, 1);
                
                // If host left, assign new host
                if (wasHost && room.players.length > 0) {
                    room.hostId = room.players[0].id; // Next player becomes host
                    room.players[0].isHost = true;
                    io.to(roomId).emit("room_data", { hostId: room.hostId });
                }

                io.to(roomId).emit("update_players", room.players);
                // ... (End game if drawer left logic) ...
            }
        }
    });
  });
};