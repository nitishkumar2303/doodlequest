import pool from "../config/db.js";

const rooms = {};

export const setupSocketEvents = (io) => {
  io.on("connection", (socket) => {
    // --- JOIN ROOM ---
    socket.on("join_room", async ({ room, name, userId }) => {
      socket.join(room);
      console.log(`User ${name} (${userId}) joined room ${room}`);

      try {
        // 1. DATABASE LOGIC
        let matchId;
        const [existingMatch] = await pool.query(
          "SELECT id FROM matches WHERE room_code = ? AND end_time IS NULL",
          [room],
        );

        if (existingMatch.length === 0) {
          const [result] = await pool.query(
            "INSERT INTO matches (room_code, host_id) VALUES (?, ?)",
            [room, userId],
          );
          matchId = result.insertId;
        } else {
          matchId = existingMatch[0].id;
        }

        await pool.query(
          "INSERT IGNORE INTO match_participants (match_id, user_id) VALUES (?, ?)",
          [matchId, userId],
        );

        const [userData] = await pool.query(
          "SELECT score FROM match_participants WHERE match_id = ? AND user_id = ?",
          [matchId, userId],
        );
        const savedScore = userData.length > 0 ? userData[0].score : 0;

        // 2. MEMORY SETUP
        if (!rooms[room]) {
          rooms[room] = {
            matchId: matchId,
            players: [],
            hostId: socket.id, // First player is Host
            drawer: null,
            word: null,
            correctGuesses: [],
            timer: null,
            timeLeft: 0,
            gameActive: false,
            drawingData: [],
          };
          console.log(`Room ${room} created. Host: ${socket.id}`);
        }

        // 3. HANDLE PLAYER JOIN / RECONNECT
        const existingPlayer = rooms[room].players.find(
          (p) => p.userId === userId,
        );

        if (existingPlayer) {
          // Reconnect Logic
          existingPlayer.id = socket.id;
          existingPlayer.score = savedScore;
          existingPlayer.isReady = false;

          // Restore Host Powers if they were the host
          if (existingPlayer.isHost) {
            rooms[room].hostId = socket.id;
          }
        } else {
          // New Player Logic
          const isFirst = rooms[room].players.length === 0;
          rooms[room].players.push({
            id: socket.id,
            userId: userId,
            name: name,
            score: savedScore,
            isReady: false,
            isHost: isFirst, // First joiner is host
          });

          if (isFirst) {
            rooms[room].hostId = socket.id;
          }
        }

        io.to(room).emit("update_players", rooms[room].players);
        io.to(room).emit("room_data", { hostId: rooms[room].hostId });

        // 4. LATE JOINER SYNC
        if (rooms[room].gameActive) {
          io.to(socket.id).emit("game_started", {
            drawerId: rooms[room].drawer,
            wordLength: rooms[room].word.length,
          });

          io.to(socket.id).emit("timer_update", rooms[room].timeLeft);

          rooms[room].drawingData.forEach((action) => {
            if (action.type === "begin_path") {
              io.to(socket.id).emit("begin_path", action.data);
            } else if (action.type === "draw_line") {
              io.to(socket.id).emit("draw_line", action.data);
            }
          });
        }
      } catch (err) {
        console.error("DB Error:", err);
      }
    });

    // --- TOGGLE READY ---
    socket.on("toggle_ready", (room) => {
      if (!rooms[room]) return;
      const player = rooms[room].players.find((p) => p.id === socket.id);
      if (player) {
        player.isReady = !player.isReady;
        io.to(room).emit("update_players", rooms[room].players);
      }
    });

    // --- KICK PLAYER ---
    socket.on("kick_player", ({ room, targetSocketId }) => {
      if (!rooms[room]) return;

      // Security: Only Host can kick
      if (rooms[room].hostId !== socket.id) return;

      // Notify and Remove
      io.to(targetSocketId).emit("kicked");

      const pIndex = rooms[room].players.findIndex(
        (p) => p.id === targetSocketId,
      );
      if (pIndex !== -1) {
        rooms[room].players.splice(pIndex, 1);
        io.to(room).emit("update_players", rooms[room].players);
      }

      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (targetSocket) {
        targetSocket.leave(room);
      }
    });

    // --- START GAME (THIS WAS MISSING!) ---
    socket.on("start_game", (room) => {
      const roomData = rooms[room];
      if (!roomData) return;

      // 1. Security Check
      if (roomData.hostId !== socket.id) return;

      // 2. Minimum Players Check (MUST be at least 2)
      // NOTE: Comment this line out if you want to test alone!
      if (roomData.players.length < 2) return;

      // 3. Reset Game State
      if (roomData.timer) clearInterval(roomData.timer);
      roomData.correctGuesses = [];
      roomData.gameActive = true;
      roomData.drawingData = [];

      io.to(room).emit("clear_canvas");

      // 4. Pick Drawer & Word
      const drawer =
        roomData.players[Math.floor(Math.random() * roomData.players.length)];
      roomData.drawer = drawer.id;

      const WORDS = [
        "Apple",
        "Banana",
        "Car",
        "House",
        "Sun",
        "Tree",
        "Dog",
        "Cat",
        "Computer",
        "Pizza",
      ];
      const word = WORDS[Math.floor(Math.random() * WORDS.length)];
      roomData.word = word;

      // 5. Start Timer
      roomData.timeLeft = 60;
      io.to(room).emit("timer_update", roomData.timeLeft);

      roomData.timer = setInterval(async () => {
        roomData.timeLeft--;
        io.to(room).emit("timer_update", roomData.timeLeft);

        if (roomData.timeLeft <= 0) {
          clearInterval(roomData.timer);
          roomData.gameActive = false;

          // Determine Winner
          const sortedPlayers = [...roomData.players].sort(
            (a, b) => b.score - a.score,
          );
          const winner = sortedPlayers[0];

          if (winner && winner.score > 0) {
            try {
              await pool.query(
                "UPDATE match_participants SET is_winner = 1 WHERE match_id = ? AND user_id = ?",
                [roomData.matchId, winner.userId],
              );
            } catch (err) {
              console.error("Failed to save winner:", err);
            }
          }

          io.to(room).emit("game_over", {
            winnerName: winner ? winner.name : "No one",
            winnerScore: winner ? winner.score : 0,
          });

          roomData.drawer = null;
        }
      }, 1000);

      io.to(room).emit("game_started", {
        drawerId: drawer.id,
        wordLength: word.length,
      });
      io.to(drawer.id).emit("your_word", word);
    });

    // --- CHAT & GUESSING ---
    socket.on("send_message", async ({ room, message, user }) => {
      const roomData = rooms[room];
      if (!roomData) return;

      const isGameRunning = roomData.drawer !== null;

      const cleanMsg = message.toLowerCase().replace(/[^a-z0-9 ]/g, "");
      const msgWords = cleanMsg.split(" ");

      const isCorrect =
        isGameRunning &&
        roomData.word &&
        msgWords.includes(roomData.word.toLowerCase());

      if (isCorrect) {
        if (roomData.drawer === socket.id) return;
        if (roomData.correctGuesses.includes(socket.id)) return;

        roomData.correctGuesses.push(socket.id);

        const player = roomData.players.find((p) => p.id === socket.id);
        if (player) {
          player.score += 10;
          try {
            await pool.query(
              "UPDATE match_participants SET score = score + 10 WHERE match_id = ? AND user_id = ?",
              [roomData.matchId, player.userId],
            );
          } catch (err) {
            console.error("Score Update Failed:", err);
          }
        }

        io.to(room).emit("update_players", roomData.players);
        io.to(room).emit("receive_message", {
          user: "System",
          message: `${user} guessed the word!`,
          isSystem: true,
        });
      } else {
        io.to(room).emit("receive_message", { user: user, message: message });
      }
    });

    // --- DRAWING ---
    socket.on("begin_path", ({ x, y, room, color, size }) => {
      const drawData = { x, y, colour: color, size };
      if (rooms[room]) {
        rooms[room].drawingData.push({ type: "begin_path", data: drawData });
      }
      socket.to(room).emit("begin_path", drawData);
    });

    socket.on("draw_line", ({ x, y, room }) => {
      const drawData = { x, y };
      if (rooms[room]) {
        rooms[room].drawingData.push({ type: "draw_line", data: drawData });
      }
      socket.to(room).emit("draw_line", drawData);
    });

    // --- LEAVE ROOM ---
    socket.on("leave_room", ({ room }) => {
      const roomData = rooms[room];
      if (!roomData) return;

      const pIndex = roomData.players.findIndex((p) => p.id === socket.id);
      if (pIndex !== -1) {
        const wasHost = roomData.hostId === socket.id;
        const wasDrawer = roomData.drawer === socket.id;

        // Remove player
        roomData.players.splice(pIndex, 1);

        // Host Migration
        if (wasHost && roomData.players.length > 0) {
          roomData.hostId = roomData.players[0].id;
          roomData.players[0].isHost = true;
          io.to(room).emit("room_data", { hostId: roomData.hostId });
        }

        // End Game if Drawer Leaves
        if (wasDrawer && roomData.gameActive) {
          clearInterval(roomData.timer);
          roomData.gameActive = false;
          roomData.drawer = null;
          io.to(room).emit("receive_message", {
            user: "System",
            message: "Drawer left! Round ended.",
            isSystem: true,
          });
          io.to(room).emit("game_over", {
            winnerName: "No one (Drawer Left)",
            winnerScore: 0,
          });
        }

        // Update remaining players
        io.to(room).emit("update_players", roomData.players);

        // Delete room if empty
        if (roomData.players.length === 0) {
          if (roomData.timer) clearInterval(roomData.timer);
          delete rooms[room];
        }

        // Actually leave the socket channel
        socket.leave(room);
      }
    });

    // --- DISCONNECT ---
    socket.on("disconnect", () => {
      for (const roomId in rooms) {
        const room = rooms[roomId];
        const pIndex = room.players.findIndex((p) => p.id === socket.id);

        if (pIndex !== -1) {
          const wasHost = room.hostId === socket.id;
          const wasDrawer = room.drawer === socket.id;

          room.players.splice(pIndex, 1);

          // Host Migration
          if (wasHost && room.players.length > 0) {
            room.hostId = room.players[0].id;
            room.players[0].isHost = true;
            io.to(roomId).emit("room_data", { hostId: room.hostId });
          }

          io.to(roomId).emit("update_players", room.players);

          // End Game if Drawer Leaves
          if (wasDrawer && room.gameActive) {
            clearInterval(room.timer);
            room.gameActive = false;
            room.drawer = null;

            io.to(roomId).emit("receive_message", {
              user: "System",
              message: "Drawer disconnected! Round ended.",
              isSystem: true,
            });

            io.to(roomId).emit("game_over", {
              winnerName: "No one (Drawer Left)",
              winnerScore: 0,
            });
          }

          if (room.players.length === 0) {
            if (room.timer) clearInterval(room.timer);
            delete rooms[roomId];
          }
          break;
        }
      }
    });
  });
};
