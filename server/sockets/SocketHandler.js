import pool from "../config/db.js"; 

const rooms = {}; 

export const setupSocketEvents = (io) => {
  io.on("connection", (socket) => {
    
    // --- JOIN ROOM (Restores Score from DB) ---
    socket.on("join_room", async ({ room, name, userId }) => {
      socket.join(room);
      
      try {
        // 1. GET / CREATE MATCH ID
        let matchId;
        const [existingMatch] = await pool.query(
          "SELECT id FROM matches WHERE room_code = ? AND end_time IS NULL", 
          [room]
        );

        if (existingMatch.length === 0) {
          const [result] = await pool.query(
            "INSERT INTO matches (room_code, host_id) VALUES (?, ?)", 
            [room, userId]
          );
          matchId = result.insertId;
        } else {
          matchId = existingMatch[0].id;
        }

        // 2. REGISTER USER (Trigger 'after_participant_insert' fires here)
        // We use INSERT IGNORE. If they are already there, it does nothing.
        await pool.query(
          "INSERT IGNORE INTO match_participants (match_id, user_id) VALUES (?, ?)",
          [matchId, userId]
        );

        // 3. FETCH EXISTING SCORE (Crucial for Refresh!)
        // If they played before refreshing, this pulls their score back.
        const [userData] = await pool.query(
            "SELECT score FROM match_participants WHERE match_id = ? AND user_id = ?",
            [matchId, userId]
        );
        const savedScore = userData.length > 0 ? userData[0].score : 0;

        // 4. SETUP MEMORY STATE
        if (!rooms[room]) {
          rooms[room] = {
            matchId: matchId, 
            players: [],
            drawer: null,
            word: null,
            correctGuesses: [],
            timer: null
          };
        }
        
        // Add to RAM (or update socket ID if reconnecting)
        const existingPlayer = rooms[room].players.find(p => p.userId === userId);
        
        if (existingPlayer) {
            existingPlayer.id = socket.id; // Update Socket ID
            existingPlayer.score = savedScore; // Restore Score
        } else {
            rooms[room].players.push({ 
                id: socket.id, 
                userId: userId, 
                name: name, 
                score: savedScore 
            });
        }

        io.to(room).emit("update_players", rooms[room].players);

      } catch (err) {
        console.error("DB Error:", err);
      }
    });

    // --- START GAME ---
    socket.on("start_game", (room) => {
      const roomData = rooms[room];
      if (!roomData) return;

      if (roomData.timer) clearInterval(roomData.timer);
      roomData.correctGuesses = []; // Reset guessers for new round

      // Pick Drawer
      const drawer = roomData.players[Math.floor(Math.random() * roomData.players.length)];
      roomData.drawer = drawer.id;

      // Pick Word
      const WORDS = ["Apple", "Banana", "Car", "House", "Sun", "Tree"];
      const word = WORDS[Math.floor(Math.random() * WORDS.length)];
      roomData.word = word;

      // Start Timer
      let timeLeft = 60;
      io.to(room).emit("timer_update", timeLeft);

      roomData.timer = setInterval(async () => {
        timeLeft--;
        io.to(room).emit("timer_update", timeLeft);

        if (timeLeft <= 0) {
          clearInterval(roomData.timer);
          
          // HANDLE ROUND END
          io.to(room).emit("receive_message", {
            user: "System",
            text: `Time's up! The word was ${word}`,
            isSystem: true
          });
          
          roomData.drawer = null;
          io.to(room).emit("game_over");

          // OPTIONAL: Check for Game Winner here and update 'is_winner' in DB
          // For now, we just keep the round scores.
        }
      }, 1000);

      io.to(room).emit("game_started", { 
        drawerId: drawer.id, 
        wordLength: word.length 
      });
      io.to(drawer.id).emit("your_word", word);
    });

    // --- GUESSING (Triggers DB Update) ---
    socket.on("send_message", async ({ room, message, userName }) => {
      const roomData = rooms[room];
      if (!roomData) return;

      const isGameRunning = roomData.drawer !== null;
      const isCorrect = isGameRunning && roomData.word && message.toLowerCase().trim() === roomData.word.toLowerCase();

      if (isCorrect) {
        // Prevent cheating
        if (roomData.drawer === socket.id) return; 
        if (roomData.correctGuesses.includes(socket.id)) return; 

        roomData.correctGuesses.push(socket.id);

        // 1. UPDATE RAM
        const player = roomData.players.find((p) => p.id === socket.id);
        if (player) {
            player.score += 10;
            
            // 2. UPDATE DATABASE (This fires your 'after_participant_update' Trigger!)
            try {
                await pool.query(
                    "UPDATE match_participants SET score = score + 10 WHERE match_id = ? AND user_id = ?",
                    [roomData.matchId, player.userId]
                );
            } catch (err) {
                console.error("Score Update Failed:", err);
            }
        }

        io.to(room).emit("update_players", roomData.players);
        io.to(room).emit("receive_message", {
          user: "System",
          text: `${userName} guessed the word!`,
          isSystem: true
        });

      } else {
        io.to(room).emit("receive_message", { user: userName, text: message });
      }
    });

    // --- DRAWING ---
    socket.on("draw_line", ({ prevPoint, currentPoint, color, size, roomId }) => {
      socket.to(roomId).emit("draw_line", { prevPoint, currentPoint, color, size });
    });

    socket.on("disconnect", () => {
      // We do NOT remove them from DB here.
      // We only remove them from RAM so they don't get 'drawing turns' while offline.
      // If they reconnect, the 'join_room' logic above restores them.
      for (const roomId in rooms) {
        const room = rooms[roomId];
        const playerIndex = room.players.findIndex((p) => p.id === socket.id);

        if (playerIndex !== -1) {
          room.players.splice(playerIndex, 1);
          io.to(roomId).emit("update_players", room.players);
          break;
        }
      }
    });
  });
};