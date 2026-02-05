import pool from "../config/db.js"; 

// Memory Storage
const rooms = {}; 

// ------------------------------------------------------------------------
// 🎨 DRAWABLE WORD BANK (Visual Items Only)
// Removed abstract concepts like "Behave", "Behind", "Logic", etc.
// ------------------------------------------------------------------------
const WORD_LIST = [
  // --- ANIMALS & CREATURES ---
  "Cat", "Dog", "Fish", "Bird", "Lion", "Tiger", "Elephant", "Giraffe", "Monkey", "Bear",
  "Rabbit", "Snake", "Turtle", "Frog", "Horse", "Cow", "Pig", "Chicken", "Duck", "Penguin",
  "Shark", "Whale", "Dolphin", "Octopus", "Spider", "Butterfly", "Bee", "Ant", "Snail", "Dragon",
  "Unicorn", "Dinosaur", "Alien", "Monster", "Ghost", "Robot", "Vampire", "Zombie", "Werewolf", "Mermaid",
  
  // --- FOOD & DRINK ---
  "Apple", "Banana", "Grapes", "Orange", "Strawberry", "Watermelon", "Pineapple", "Cherry", "Lemon", "Pizza",
  "Burger", "Fries", "Hot Dog", "Sandwich", "Taco", "Sushi", "Spaghetti", "Steak", "Egg", "Cheese",
  "Bread", "Cake", "Cupcake", "Donut", "Cookie", "Ice Cream", "Chocolate", "Candy", "Popcorn", "Soda",
  "Coffee", "Tea", "Milk", "Juice", "Water", "Carrot", "Corn", "Potato", "Tomato", "Pumpkin",

  // --- HOUSEHOLD OBJECTS ---
  "Table", "Chair", "Bed", "Sofa", "Lamp", "Clock", "Door", "Window", "Key", "Lock",
  "Phone", "Computer", "TV", "Radio", "Camera", "Book", "Pen", "Pencil", "Scissors", "Broom",
  "Bucket", "Mop", "Toothbrush", "Comb", "Mirror", "Glass", "Cup", "Plate", "Fork", "Spoon",
  "Knife", "Bottle", "Bag", "Backpack", "Umbrella", "Wallet", "Watch", "Glasses", "Ring", "Necklace",

  // --- OUTDOORS & NATURE ---
  "Tree", "Flower", "Grass", "Leaf", "Sun", "Moon", "Star", "Cloud", "Rain", "Snow",
  "Fire", "Water", "Mountain", "River", "Ocean", "Beach", "Island", "Volcano", "Cave", "Rock",
  "Stone", "Dirt", "Sand", "Rainbow", "Tornado", "Lightning", "Earth", "Planet", "Comet", "Rocket",

  // --- VEHICLES & TRANSPORT ---
  "Car", "Bus", "Truck", "Train", "Bike", "Motorcycle", "Boat", "Ship", "Submarine", "Airplane",
  "Helicopter", "Rocket", "UFO", "Taxi", "Ambulance", "Police Car", "Fire Truck", "Tractor", "Scooter", "Skateboard",

  // --- CLOTHING & ACCESSORIES ---
  "Shirt", "Pants", "Shorts", "Dress", "Skirt", "Hat", "Cap", "Shoes", "Socks", "Boots",
  "Gloves", "Scarf", "Tie", "Belt", "Coat", "Jacket", "Suit", "Pyjamas", "Mask", "Cape",

  // --- BODY PARTS ---
  "Head", "Face", "Eye", "Nose", "Ear", "Mouth", "Teeth", "Tongue", "Hand", "Finger",
  "Thumb", "Arm", "Leg", "Foot", "Toe", "Hair", "Beard", "Mustache", "Bone", "Skull",
  "Heart", "Brain", "Muscle", "Skeleton", "Ghost", "Smile", "Tears", "Sweat", "Blood", "Footprint",

  // --- JOBS & CHARACTERS ---
  "Doctor", "Nurse", "Police", "Fireman", "Teacher", "Chef", "Artist", "Singer", "Dancer", "Clown",
  "King", "Queen", "Prince", "Princess", "Pirate", "Ninja", "Wizard", "Witch", "Superhero", "Santa",

  // --- SPORTS & HOBBIES ---
  "Ball", "Bat", "Football", "Basketball", "Soccer", "Tennis", "Golf", "Hockey", "Baseball", "Bowling",
  "Boxing", "Swimming", "Running", "Dancing", "Singing", "Painting", "Drawing", "Fishing", "Camping", "Hiking",
  "Guitar", "Piano", "Drum", "Violin", "Flute", "Trumpet", "Microphone", "Headphones", "Controller", "Cards"
];

export const setupSocketEvents = (io) => {
  io.on("connection", (socket) => {
    
    // ========================================================================
    // 1. JOINING A ROOM
    // ========================================================================
    socket.on("join_room", async ({ room, name, userId }) => {
      socket.join(room);
      console.log(`User ${name} (${userId}) joined room ${room}`);
      
      try {
        // --- DB SYNC ---
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

        await pool.query(
          "INSERT IGNORE INTO match_participants (match_id, user_id) VALUES (?, ?)",
          [matchId, userId]
        );

        const [userData] = await pool.query(
            "SELECT score FROM match_participants WHERE match_id = ? AND user_id = ?",
            [matchId, userId]
        );
        const savedScore = userData.length > 0 ? userData[0].score : 0;

        // --- ROOM INIT ---
        if (!rooms[room]) {
          rooms[room] = {
            matchId: matchId, 
            players: [],
            hostId: socket.id, 
            drawer: null,      
            word: null,        
            correctGuesses: [], 
            timer: null,       
            timeLeft: 0,
            gameActive: false,
            drawingData: []    
          };
          console.log(`Room ${room} created. Host: ${socket.id}`);
        }
        
        // --- ADD PLAYER ---
        const existingPlayer = rooms[room].players.find(p => p.userId === userId);
        
        if (existingPlayer) {
            existingPlayer.id = socket.id; 
            existingPlayer.score = savedScore;
            existingPlayer.isReady = false; 

            if (existingPlayer.isHost) {
                rooms[room].hostId = socket.id;
            }
        } else {
            const isFirst = rooms[room].players.length === 0;
            rooms[room].players.push({ 
                id: socket.id, 
                userId: userId, 
                name: name, 
                score: savedScore,
                isReady: false, 
                isHost: isFirst
            });

            if (isFirst) {
                rooms[room].hostId = socket.id;
            }
        }

        io.to(room).emit("update_players", rooms[room].players);
        io.to(room).emit("room_data", { hostId: rooms[room].hostId });

        // --- LATE JOIN SYNC ---
        if (rooms[room].gameActive) {
            io.to(socket.id).emit("game_started", { 
                drawerId: rooms[room].drawer, 
                wordLength: rooms[room].word.length 
            });
            
            io.to(socket.id).emit("timer_update", rooms[room].timeLeft);
            
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

    // ========================================================================
    // 2. LOBBY ACTIONS
    // ========================================================================
    socket.on("toggle_ready", (room) => {
        if (!rooms[room]) return;
        const player = rooms[room].players.find(p => p.id === socket.id);
        if (player) {
            player.isReady = !player.isReady;
            io.to(room).emit("update_players", rooms[room].players);
        }
    });

    socket.on("kick_player", ({ room, targetSocketId }) => {
        if (!rooms[room]) return;
        if (rooms[room].hostId !== socket.id) return;

        io.to(targetSocketId).emit("kicked");
        
        const pIndex = rooms[room].players.findIndex(p => p.id === targetSocketId);
        if (pIndex !== -1) {
            rooms[room].players.splice(pIndex, 1);
            io.to(room).emit("update_players", rooms[room].players);
        }

        const targetSocket = io.sockets.sockets.get(targetSocketId);
        if (targetSocket) {
            targetSocket.leave(room);
        }
    });

    // ========================================================================
    // 3. GAME LOOP
    // ========================================================================
    socket.on("start_game", (room) => {
      const roomData = rooms[room];
      if (!roomData) return;

      if (roomData.hostId !== socket.id) return;
      if (roomData.players.length < 2) return; 

      if (roomData.timer) clearInterval(roomData.timer);
      roomData.correctGuesses = [];
      roomData.gameActive = true;
      roomData.drawingData = [];
      
      io.to(room).emit("clear_canvas");

      const drawer = roomData.players[Math.floor(Math.random() * roomData.players.length)];
      roomData.drawer = drawer.id;

      const word = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
      roomData.word = word;

      roomData.timeLeft = 60;
      io.to(room).emit("timer_update", roomData.timeLeft);

      roomData.timer = setInterval(async () => {
        roomData.timeLeft--;
        io.to(room).emit("timer_update", roomData.timeLeft);

        if (roomData.timeLeft <= 0) {
          clearInterval(roomData.timer);
          roomData.gameActive = false;
          
          const sortedPlayers = [...roomData.players].sort((a, b) => b.score - a.score);
          const winner = sortedPlayers[0];

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
      }, 1000);

      io.to(room).emit("game_started", { 
        drawerId: drawer.id, 
        wordLength: word.length 
      });
      
      io.to(drawer.id).emit("your_word", word);
    });

    // ========================================================================
    // 4. CLEANUP
    // ========================================================================
    socket.on("leave_room", ({ room }) => {
        handlePlayerLeave(room, socket);
    });

    socket.on("disconnect", () => {
      for (const roomId in rooms) {
        const room = rooms[roomId];
        const pIndex = room.players.findIndex((p) => p.id === socket.id);

        if (pIndex !== -1) {
            handlePlayerLeave(roomId, socket);
            break;
        }
      }
    });

    const handlePlayerLeave = (roomId, socket) => {
        const room = rooms[roomId];
        if (!room) return;

        const pIndex = room.players.findIndex((p) => p.id === socket.id);
        if (pIndex !== -1) {
            const wasHost = room.hostId === socket.id;
            const wasDrawer = room.drawer === socket.id;

            room.players.splice(pIndex, 1);

            if (wasHost && room.players.length > 0) {
                room.hostId = room.players[0].id;
                room.players[0].isHost = true;
                io.to(roomId).emit("room_data", { hostId: room.hostId });
            }

            if (wasDrawer && room.gameActive) {
                clearInterval(room.timer);
                room.gameActive = false;
                room.drawer = null;
                io.to(roomId).emit("receive_message", { user: "System", message: "Drawer left! Round ended.", isSystem: true });
                io.to(roomId).emit("game_over", { winnerName: "No one (Drawer Left)", winnerScore: 0 });
            }

            io.to(roomId).emit("update_players", room.players);
            
            if (room.players.length === 0) {
                if (room.timer) clearInterval(room.timer);
                delete rooms[roomId];
            }
            
            socket.leave(roomId);
        }
    };

    // ========================================================================
    // 5. CHAT & GUESSING
    // ========================================================================
    socket.on("send_message", async ({ room, message, user }) => {
      const roomData = rooms[room];
      if (!roomData) return;

      const isGameRunning = roomData.drawer !== null;
      
      const cleanMsg = message.toLowerCase().replace(/[^a-z0-9 ]/g, "");
      const msgWords = cleanMsg.split(" ");
      
      const isCorrect = isGameRunning && 
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
                    [roomData.matchId, player.userId]
                );
            } catch (err) {
                console.error("Score Update Failed:", err);
            }
        }

        io.to(room).emit("update_players", roomData.players);
        
        io.to(room).emit("receive_message", {
          user: "System",
          message: `${user} guessed the word!`,
          isSystem: true
        });

      } else {
        io.to(room).emit("receive_message", { user: user, message: message });
      }
    });

    // ========================================================================
    // 6. DRAWING (FIXED ERASER BUG)
    // ========================================================================
    socket.on("begin_path", ({ x, y, room, color, size }) => {
      // ⚠️ IMPORTANT FIX:
      // We accept 'color' (client sends this) and emit 'color'.
      // DO NOT rename to 'colour' or the eraser (white) will break.
      const drawData = { x, y, color: color, size }; 
      
      if (rooms[room]) {
          rooms[room].drawingData.push({ type: 'begin_path', data: drawData });
      }
      
      socket.to(room).emit("begin_path", drawData);
    });

    socket.on("draw_line", ({ x, y, room }) => {
      const drawData = { x, y };
      if (rooms[room]) {
          rooms[room].drawingData.push({ type: 'draw_line', data: drawData });
      }
      socket.to(room).emit("draw_line", drawData);
    });
  });
};