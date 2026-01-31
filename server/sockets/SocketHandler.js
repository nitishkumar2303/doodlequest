//temprory data
// Store game state in memory
// Structure: { "room_id": { drawer: "socket_id", word: "apple", players: [] } }
const rooms = {};

const WORDS = ["Apple", "Banana", "Car", "Dog", "Elephant", "Guitar", "House"];

export const setupSocketEvents = (io) => {
  io.on("connection", (socket) => {
    console.log(`User Connected: ${socket.id}`);

    socket.on("join_room", ({ room, name }) => {
      socket.join(room);

      if (!rooms[room]) {
        rooms[room] = {
          players: [],
          drawer: null,
          word: null,
        };
      }

      rooms[room].players.push({ id: socket.id, name: name, score: 0 });
      console.log(`User ${name} ${socket.id} joined room : ${room}`);
      io.to(room).emit("update_players", rooms[room].players);
    });

    socket.on("start_game", (room) => {
      const roomData = rooms[room];
      if (!roomData) return;

      const randomIndex = Math.floor(Math.random() * roomData.players.length);
      const drawer = roomData.players[randomIndex];
      roomData.drawer = drawer.id;

      const word = WORDS[Math.floor(Math.random() * WORDS.length)];
      roomData.word = word;

      console.log(
        `Game started in room ${room}. Drawer is${drawer}. Word is ${word} `,
      );

      io.to(room).emit("game_started", {
        drawerId: drawer.id,
        wordLength: word.length,
      });

      io.to(drawer.id).emit("your_word", word);
    });

    socket.on("begin_path", ({ room, x, y }) => {
      socket.to(room).emit("begin_path", { x, y });
    });

    socket.on("draw_line", ({ room, x, y }) => {
      socket.to(room).emit("draw_line", { x, y });
    });

    socket.on("disconnect", () => {
      console.log(`User Diconnected ${socket.id}`);
    });
  });
};
