// 1. Define constants
const WORDS = [
  "Apple",
  "Banana",
  "Car",
  "Dog",
  "Elephant",
  "Guitar",
  "House",
  "Pizza",
  "Rocket",
  "Tree",
];

// 2. Memory Storage
const rooms = {};

export const setupSocketEvents = (io) => {
  io.on("connection", (socket) => {
    console.log(`User Connected: ${socket.id}`);

    // --- JOIN ROOM ---
    socket.on("join_room", ({ room, name }) => {
      socket.join(room);

      if (!rooms[room]) {
        rooms[room] = {
          players: [],
          drawer: null,
          word: null,
          correctGuesses: [],
        };
      }

      // Add player
      rooms[room].players.push({ id: socket.id, name: name, score: 0 });
      console.log(`User ${name} joined ${room}`);

      // NOTIFY EVERYONE (Updates the Leaderboard)
      io.to(room).emit("update_players", rooms[room].players);
    });

    // --- START GAME ---
    socket.on("start_game", (room) => {
      const roomData = rooms[room];
      if (!roomData) return;

      //clear previous timer
      if (roomData.timer) {
        clearInterval(roomData.timer);
      }

      // Reset previous round data
      roomData.correctGuesses = [];

      // Pick Drawer & Word
      const drawer =
        roomData.players[Math.floor(Math.random() * roomData.players.length)];
      roomData.drawer = drawer.id;

      const word = WORDS[Math.floor(Math.random() * WORDS.length)];
      roomData.word = word;

      let timeLeft = 60;

      io.to(room).emit("timer_update", timeLeft);

      roomData.timer = setInterval(() => {
        timeLeft--;
        io.to(room).emit("timer_update", timeLeft);

        if (timeLeft === 0) {
          // TIME IS UP!
          clearInterval(roomData.timer);

          // Reveal the word
          io.to(room).emit("receive_message", {
            user: "System",
            message: `Time's up! The word was ${word}`,
            time: new Date().toLocaleTimeString(),
          });

          // Optional: Reset drawer so no one can draw anymore
          roomData.drawer = null;
          io.to(room).emit("game_over"); // We will handle this in client later
        }
      }, 1000);

      console.log(`Game Started: Room ${room}, Word: ${word}`);
      io.to(room).emit("clear_canvas");
      io.to(room).emit("game_started", {
        drawerId: drawer.id,
        wordLength: word.length,
      });
      io.to(drawer.id).emit("your_word", word);
    });

    // --- CHAT & GUESSING ---
    socket.on("send_message", ({ room, user, message, time }) => {
      const roomData = rooms[room];
      if (!roomData) return;

      const secretWord = roomData.word;
      const isGameRunning = roomData.drawer !== null;

      // Check Guess Logic
      const cleanMsg = message.toLowerCase().replace(/[^a-z0-9 ]/g, "");
      const words = cleanMsg.split(" ");
      const isCorrect =
        isGameRunning && secretWord && words.includes(secretWord.toLowerCase());

      if (isCorrect) {
        if (roomData.drawer === socket.id) return; // Drawer can't guess

        // Prevent Double Guessing
        if (!roomData.correctGuesses) roomData.correctGuesses = [];
        if (roomData.correctGuesses.includes(socket.id)) return;

        // --- SCORING FIX ---
        roomData.correctGuesses.push(socket.id);

        // 1. Find and update score
        const player = roomData.players.find((p) => p.id === socket.id);
        if (player) {
          player.score += 10;
        }

        // 2. IMPORTANT: Broadcast NEW scores immediately!
        io.to(room).emit("update_players", roomData.players);
        // -------------------

        io.to(room).emit("receive_message", {
          user: "System",
          message: `${user} guessed the word!`,
          time: time,
        });
      } else {
        // Normal Chat
        io.to(room).emit("receive_message", { user, message, time });
      }
    });

    // --- DRAWING ---
    socket.on("begin_path", ({ x, y, room }) => {
      socket.to(room).emit("begin_path", { x, y });
    });

    socket.on("draw_line", ({ x, y, room }) => {
      socket.to(room).emit("draw_line", { x, y });
    });

    // --- DISCONNECT (CLEANUP GHOSTS) ---
    socket.on("disconnect", () => {
      // Loop through all rooms to find where this user was
      for (const roomId in rooms) {
        const room = rooms[roomId];
        const playerIndex = room.players.findIndex((p) => p.id === socket.id);

        if (playerIndex !== -1) {
          // Remove the player
          const removedPlayer = room.players.splice(playerIndex, 1)[0];
          console.log(`User ${removedPlayer.name} left room ${roomId}`);

          // Notify remaining players (Removes them from Leaderboard)
          io.to(roomId).emit("update_players", room.players);

          // Optional: If room is empty, delete it to save memory
          if (room.players.length === 0) {
            delete rooms[roomId];
          }
          break; // User found and removed, stop looping
        }

        //stop timer if player inside room becomes 0;
        if (room.players.length === 0) {
          if (room.timer) clearInterval(room.timer);
          delete rooms[roomId];
        }
      }
    });
  });
};
