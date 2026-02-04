import pool from "../config/db.js"; 

// We store active game state in memory (RAM) for speed.
// Ideally, for a massive production app, you'd use Redis, but a JS object works great here.
const rooms = {}; 

export const setupSocketEvents = (io) => {
  io.on("connection", (socket) => {
    
    // ------------------------------------------------------------------------
    // JOIN ROOM LOGIC
    // Handles database recording, in-memory setup, and syncing late joiners.
    // ------------------------------------------------------------------------
    socket.on("join_room", async ({ room, name, userId }) => {
      socket.join(room);
      console.log(`User ${name} (${userId}) joined room ${room}`);
      
      try {
        // 1. DATABASE LOGIC (PERSISTENCE)
        // We want to keep a history of games played.
        
        let matchId;
        // Check if there is already an active match (one that hasn't ended yet)
        const [existingMatch] = await pool.query(
          "SELECT id FROM matches WHERE room_code = ? AND end_time IS NULL", 
          [room]
        );

        // If no match exists, create a fresh one.
        if (existingMatch.length === 0) {
          const [result] = await pool.query(
            "INSERT INTO matches (room_code, host_id) VALUES (?, ?)", 
            [room, userId]
          );
          matchId = result.insertId;
        } else {
          matchId = existingMatch[0].id;
        }

        // Add this user to the 'participants' table so we can track their score later
        await pool.query(
          "INSERT IGNORE INTO match_participants (match_id, user_id) VALUES (?, ?)",
          [matchId, userId]
        );

        // Fetch their saved score (in case they got disconnected and are rejoining)
        const [userData] = await pool.query(
            "SELECT score FROM match_participants WHERE match_id = ? AND user_id = ?",
            [matchId, userId]
        );
        const savedScore = userData.length > 0 ? userData[0].score : 0;

        // 2. IN-MEMORY STATE SETUP
        // If this is the first time anyone has joined this room ID, initialize the state object.
        if (!rooms[room]) {
          rooms[room] = {
            matchId: matchId, 
            players: [],
            hostId: socket.id, // The first person to create the room becomes the Host
            drawer: null,
            word: null,
            correctGuesses: [],
            timer: null,
            timeLeft: 0,
            gameActive: false,
            drawingData: [] // We store all drawing strokes here to replay them for new people
          };
          console.log(`Room ${room} created. Host: ${socket.id}`);
        }
        
        // 3. HANDLE PLAYER LIST
        // Check if this user is already in our memory list (Reconnection Logic)
        const existingPlayer = rooms[room].players.find(p => p.userId === userId);
        
        if (existingPlayer) {
            // User is rejoining! Update their socket ID (since it changes on refresh)
            existingPlayer.id = socket.id; 
            existingPlayer.score = savedScore; 
            existingPlayer.isReady = false; 

            // IMPORTANT: If they were the host before leaving, give them back the crown 👑
            if (existingPlayer.isHost) {
                rooms[room].hostId = socket.id;
            }
        } else {
            // This is a brand new player. Add them to the list.
            const isFirst = rooms[room].players.length === 0;
            rooms[room].players.push({ 
                id: socket.id, 
                userId: userId, 
                name: name, 
                score: savedScore,
                isReady: false, 
                isHost: isFirst // If they are the only one here, they are the Host
            });

            // Double check host assignment
            if (isFirst) {
                rooms[room].hostId = socket.id;
            }
        }

        // Broadcast the new player list to everyone in the room
        io.to(room).emit("update_players", rooms[room].players);
        io.to(room).emit("room_data", { hostId: rooms[room].hostId });

        // 4. LATE JOINER SYNC
        // If a game is currently in progress, we need to catch this new person up!
        if (rooms[room].gameActive) {
            // Tell them who is drawing and how long the word is
            io.to(socket.id).emit("game_started", { 
                drawerId: rooms[room].drawer, 
                wordLength: rooms[room].word.length 
            });
            
            // Sync their timer with the server's time
            io.to(socket.id).emit("timer_update", rooms[room].timeLeft);
            
            // Replay the entire drawing history so they don't see a blank canvas
            rooms[room].drawingData.forEach((action) => {
                if (action.type === 'begin_path') {
                    io.to(socket.id).emit('begin_path', action.data);
                } else if (action.type === 'draw_line') {
                    io.to(socket.id).emit('draw_line', action.data);
                }
            });
        }

      } catch (err) {
        console.error("DB Error:", err);
      }
    });

    // ------------------------------------------------------------------------
    // PLAYER ACTIONS
    // ------------------------------------------------------------------------

    // Toggle the "Ready" status (Green badge in UI)
    socket.on("toggle_ready", (room) => {
        if (!rooms[room]) return;
        const player = rooms[room].players.find(p => p.id === socket.id);
        if (player) {
            player.isReady = !player.isReady;
            io.to(room).emit("update_players", rooms[room].players);
        }
    });

    // Kick Player (Host Only function)
    socket.on("kick_player", ({ room, targetSocketId }) => {
        if (!rooms[room]) return;
        
        // Security Check: Only the Host can kick people!
        if (rooms[room].hostId !== socket.id) return;

        // 1. Tell the user they are being kicked
        io.to(targetSocketId).emit("kicked");
        
        // 2. Remove them from our memory list
        const pIndex = rooms[room].players.findIndex(p => p.id === targetSocketId);
        if (pIndex !== -1) {
            rooms[room].players.splice(pIndex, 1);
            io.to(room).emit("update_players", rooms[room].players);
        }

        // 3. Force their socket to leave the room channel
        const targetSocket = io.sockets.sockets.get(targetSocketId);
        if (targetSocket) {
            targetSocket.leave(room);
        }
    });

    // ------------------------------------------------------------------------
    // GAME LOOP LOGIC
    // ------------------------------------------------------------------------

    socket.on("start_game", (room) => {
      const roomData = rooms[room];
      if (!roomData) return;

      // Security: Only Host can start
      if (roomData.hostId !== socket.id) return;

      // Rule: You need at least 2 people to play (One draws, one guesses)
      // NOTE: Comment this out if you are testing by yourself!
      if (roomData.players.length < 2) return; 

      // --- RESET GAME STATE ---
      if (roomData.timer) clearInterval(roomData.timer);
      roomData.correctGuesses = [];
      roomData.gameActive = true;
      roomData.drawingData = []; // Clear old drawing history
      
      io.to(room).emit("clear_canvas"); // Tell clients to wipe their boards

      // --- SETUP ROUND ---
      // Pick a random drawer
      const drawer = roomData.players[Math.floor(Math.random() * roomData.players.length)];
      roomData.drawer = drawer.id;

      // Pick a random word
      const WORDS = ["Apple", "Banana", "Car", "House", "Sun", "Tree", "Dog", "Cat", "Computer", "Pizza"];
      const word = WORDS[Math.floor(Math.random() * WORDS.length)];
      roomData.word = word;

      // --- START TIMER LOOP ---
      roomData.timeLeft = 60;
      io.to(room).emit("timer_update", roomData.timeLeft);

      roomData.timer = setInterval(async () => {
        roomData.timeLeft--;
        io.to(room).emit("timer_update", roomData.timeLeft);

        // Time is up!
        if (roomData.timeLeft <= 0) {
          clearInterval(roomData.timer);
          roomData.gameActive = false;
          
          // Calculate Winner (Player with highest score)
          const sortedPlayers = [...roomData.players].sort((a, b) => b.score - a.score);
          const winner = sortedPlayers[0];

          // Save the winner to the database
          if (winner && winner.score > 0) {
             try {
               await pool.query(
                 "UPDATE match_participants SET is_winner = 1 WHERE match_id = ? AND user_id = ?",
                 [roomData.matchId, winner.userId]
               );
             } catch (err) {
               console.error("Failed to save winner:", err);
             }
          }

          io.to(room).emit("game_over", {
             winnerName: winner ? winner.name : "No one",
             winnerScore: winner ? winner.score : 0
          });
          
          roomData.drawer = null;
        }
      }, 1000); // Run every 1 second

      // Notify clients the game has started
      io.to(room).emit("game_started", { 
        drawerId: drawer.id, 
        wordLength: word.length 
      });
      
      // Send the secret word ONLY to the drawer
      io.to(drawer.id).emit("your_word", word);
    });

    // ------------------------------------------------------------------------
    // LEAVING & DISCONNECTS
    // ------------------------------------------------------------------------

    // User explicitly clicks "Exit Room"
    socket.on("leave_room", ({ room }) => {
        const roomData = rooms[room];
        if (!roomData) return;

        const pIndex = roomData.players.findIndex(p => p.id === socket.id);
        if (pIndex !== -1) {
            const wasHost = roomData.hostId === socket.id;
            const wasDrawer = roomData.drawer === socket.id;

            // Remove player from list
            roomData.players.splice(pIndex, 1);

            // HOST MIGRATION: If host left, pass the crown to the next person
            if (wasHost && roomData.players.length > 0) {
                roomData.hostId = roomData.players[0].id;
                roomData.players[0].isHost = true;
                io.to(room).emit("room_data", { hostId: roomData.hostId });
            }

            // GAME END: If the Drawer left mid-game, we have to end the round
            if (wasDrawer && roomData.gameActive) {
                clearInterval(roomData.timer);
                roomData.gameActive = false;
                roomData.drawer = null;
                io.to(room).emit("receive_message", { user: "System", message: "Drawer left! Round ended.", isSystem: true });
                io.to(room).emit("game_over", { winnerName: "No one (Drawer Left)", winnerScore: 0 });
            }

            io.to(room).emit("update_players", roomData.players);
            
            // Cleanup: If room is empty, delete it from memory
            if (roomData.players.length === 0) {
                if (roomData.timer) clearInterval(roomData.timer);
                delete rooms[room];
            }
            
            socket.leave(room);
        }
    });

    // ------------------------------------------------------------------------
    // CHAT & GUESSING SYSTEM
    // ------------------------------------------------------------------------
    socket.on("send_message", async ({ room, message, user }) => {
      const roomData = rooms[room];
      if (!roomData) return;

      const isGameRunning = roomData.drawer !== null;
      
      // Normalize text (lowercase, remove punctuation) to make guessing easier
      const cleanMsg = message.toLowerCase().replace(/[^a-z0-9 ]/g, "");
      const msgWords = cleanMsg.split(" ");
      
      const isCorrect = isGameRunning && 
                        roomData.word && 
                        msgWords.includes(roomData.word.toLowerCase());

      if (isCorrect) {
        // Prevent Drawer from guessing their own word
        if (roomData.drawer === socket.id) return; 
        // Prevent spamming points (only 1 guess per person per round)
        if (roomData.correctGuesses.includes(socket.id)) return; 

        roomData.correctGuesses.push(socket.id);

        // Update Score
        const player = roomData.players.find((p) => p.id === socket.id);
        if (player) {
            player.score += 10;
            // Update DB immediately
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
        
        // HIDE THE GUESS: Don't show the word in chat, just show "User guessed it!"
        io.to(room).emit("receive_message", {
          user: "System",
          message: `${user} guessed the word!`,
          isSystem: true
        });

      } else {
        // Just a normal chat message
        io.to(room).emit("receive_message", { user: user, message: message });
      }
    });

    // ------------------------------------------------------------------------
    // DRAWING SYNC
    // ------------------------------------------------------------------------
    
    // Mouse Down Event (Start Drawing)
    socket.on("begin_path", ({ x, y, room, color, size }) => {
      const drawData = { x, y, colour: color, size };
      // Save to history so we can show it to late joiners
      if (rooms[room]) {
          rooms[room].drawingData.push({ type: 'begin_path', data: drawData });
      }
      // Send to everyone else
      socket.to(room).emit("begin_path", drawData);
    });

    // Mouse Move Event (Drawing Lines)
    socket.on("draw_line", ({ x, y, room }) => {
      const drawData = { x, y };
      if (rooms[room]) {
          rooms[room].drawingData.push({ type: 'draw_line', data: drawData });
      }
      socket.to(room).emit("draw_line", drawData);
    });

    // ------------------------------------------------------------------------
    // DISCONNECT HANDLER (Browser Close / Refresh)
    // ------------------------------------------------------------------------
    socket.on("disconnect", () => {
      // Loop through all rooms to find where this socket was
      for (const roomId in rooms) {
        const room = rooms[roomId];
        const pIndex = room.players.findIndex((p) => p.id === socket.id);

        if (pIndex !== -1) {
            const wasHost = room.hostId === socket.id;
            const wasDrawer = room.drawer === socket.id;

            room.players.splice(pIndex, 1);
            
            // Host Migration (Reuse logic)
            if (wasHost && room.players.length > 0) {
                room.hostId = room.players[0].id; 
                room.players[0].isHost = true;
                io.to(roomId).emit("room_data", { hostId: room.hostId });
            }

            io.to(roomId).emit("update_players", room.players);

            // End game if drawer vanished
            if (wasDrawer && room.gameActive) {
                clearInterval(room.timer);
                room.gameActive = false;
                room.drawer = null;
                io.to(roomId).emit("receive_message", {
                    user: "System",
                    message: "Drawer disconnected! Round ended.",
                    isSystem: true
                });
                io.to(roomId).emit("game_over", {
                    winnerName: "No one (Drawer Left)",
                    winnerScore: 0
                });
            }

            // Clean up empty room
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