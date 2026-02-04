import pool from "../config/db.js"; 

// We keep the game state in this 'rooms' object (in memory).
// Why? Because reading/writing to a database 60 times a second for drawings would be too slow.
// RAM is instant. ⚡
const rooms = {}; 

// ------------------------------------------------------------------------
// 📚 MASSIVE WORD BANK (500+ WORDS)
// This list is categorized so the game stays fun and replayable.
// ------------------------------------------------------------------------
const WORD_LIST = [
  // --- LEVEL 1: EASY (Simple Objects & Animals) ---
  "Apple", "Ball", "Banana", "Bed", "Bird", "Book", "Box", "Boy", "Bread", "Bus",
  "Cake", "Car", "Cat", "Chair", "Chicken", "Circle", "Clock", "Cloud", "Coat", "Cow",
  "Cup", "Dog", "Doll", "Door", "Duck", "Ear", "Egg", "Eye", "Face", "Farm",
  "Fish", "Flag", "Flower", "Fly", "Foot", "Fork", "Fox", "Frog", "Girl", "Goat",
  "Grass", "Hair", "Hand", "Hat", "Head", "Heart", "Home", "Horse", "House", "Ice",
  "Key", "Kite", "Lamp", "Leaf", "Leg", "Lion", "Lips", "Lock", "Map", "Milk",
  "Moon", "Mouse", "Mouth", "Nest", "Nose", "Owl", "Pen", "Pig", "Pizza", "Plane",
  "Rain", "Ring", "Road", "Rock", "Roof", "Room", "Rose", "Salt", "School", "Seed",
  "Sheep", "Ship", "Shirt", "Shoe", "Shop", "Sink", "Sky", "Sleep", "Smile", "Snake",
  "Snow", "Sock", "Spoon", "Star", "Stop", "Sun", "Table", "Tail", "Tea", "Tie",
  "Toe", "Train", "Tree", "Truck", "Wall", "Water", "Wave", "Wind", "Wolf", "Worm",
  "Zero", "Zoo", "Ant", "Bat", "Bee", "Can", "Cap", "Corn", "Dot", "Drum",
  "Fan", "Gem", "Gun", "Hen", "Ink", "Jar", "Jet", "Jug", "Kid", "Lid",
  "Log", "Man", "Mop", "Mug", "Nut", "Pan", "Pea", "Pie", "Pin", "Pot",
  "Rat", "Rug", "Run", "Saw", "Sit", "Ski", "Tag", "Tap", "Top", "Toy",
  "Van", "Vet", "Web", "Wig", "Zip", "Arm", "Axe", "Bag", "Bar", "Bib",

  // --- LEVEL 2: MEDIUM (Actions, Places, & Jobs) ---
  "Airplane", "Airport", "Alien", "Ambulance", "Angel", "Angry", "Animal", "Ankle", "Apple Pie", "Apron",
  "Artist", "Baby", "Backpack", "Balloon", "Bamboo", "Baseball", "Basket", "Bathtub", "Battery", "Beach",
  "Bear", "Beaver", "Beetle", "Belt", "Bench", "Bicycle", "Bikini", "Biscuit", "Blanket", "Blender",
  "Blind", "Blizzard", "Bottle", "Bow", "Bowl", "Bracelet", "Brain", "Branch", "Bridge", "Broom",
  "Brush", "Bubble", "Bucket", "Button", "Cactus", "Camera", "Camp", "Candle", "Candy", "Canoe",
  "Captain", "Carrot", "Castle", "Cave", "Ceiling", "Cell", "Cereal", "Chain", "Chalk", "Cheese",
  "Cherry", "Chess", "Chimney", "Chin", "Church", "Cigar", "Circle", "Circus", "Clam", "Clap",
  "Clown", "Coffee", "Comb", "Comet", "Compass", "Computer", "Cookie", "Corn", "Cowboy", "Crab",
  "Crayon", "Cream", "Creek", "Crib", "Cross", "Crow", "Crown", "Crust", "Crystal", "Cube",
  "Cupcake", "Curtain", "Cycle", "Dance", "Dart", "Deer", "Dentist", "Desk", "Diamond", "Dice",
  "Dinosaur", "Dirt", "Disco", "Dish", "Dive", "Doctor", "Dolphin", "Donut", "Dress", "Drill",
  "Drink", "Drive", "Drum", "Dryer", "Duck", "Dust", "Eagle", "Earth", "Easel", "Eel",
  "Elbow", "Elephant", "Elevator", "Elf", "Engine", "Eraser", "Erupt", "Exit", "Explode", "Eye",
  "Factory", "Fairy", "Fall", "Family", "Fan", "Feather", "Fence", "Field", "Finger", "Fire",
  "Fireman", "Fish", "Flag", "Flash", "Flat", "Flood", "Floor", "Flute", "Food", "Forest",
  "Fossil", "Frame", "Fridge", "Fries", "Frog", "Fruit", "Funnel", "Game", "Garage", "Garden",
  "Garlic", "Gate", "Ghost", "Giant", "Gift", "Giraffe", "Glass", "Glasses", "Glove", "Glue",

  // --- LEVEL 3: HARD (Complex Objects & Concepts) ---
  "Accordion", "Acrobat", "Adapter", "Addition", "Address", "Admit", "Advance", "Advice", "Afraid", "Afternoon",
  "Agriculture", "Aircraft", "Airline", "Airmail", "Airport", "Alarm", "Alligator", "Alphabet", "Amazon", "America",
  "Anchor", "Angle", "Animal", "Ankle", "Antarctica", "Antelope", "Antenna", "Anvil", "Apartment", "Applaud",
  "Appliance", "Apricot", "Aquarium", "Archery", "Architect", "Arithmetic", "Armadillo", "Armor", "Arrow", "Artichoke",
  "Artist", "Ash", "Astronaut", "Athlete", "Atmosphere", "Attic", "Audience", "August", "Author", "Autumn",
  "Avenue", "Avocado", "Award", "Awake", "Axe", "Baboon", "Backbone", "Bacon", "Badger", "Bagel",
  "Baggage", "Bagpipes", "Baker", "Bakery", "Balcony", "Bald", "Ballerina", "Balloon", "Bamboo", "Bandage",
  "Banjo", "Bank", "Banker", "Barber", "Bark", "Barn", "Barometer", "Barrel", "Base", "Basement",
  "Basin", "Basket", "Basketball", "Bat", "Bath", "Bathroom", "Battery", "Battle", "Bay", "Beach",
  "Bead", "Beak", "Bean", "Bear", "Beard", "Beast", "Beat", "Beauty", "Beaver", "Bed",
  "Bedroom", "Bee", "Beef", "Beetle", "Beg", "Beginner", "Behave", "Behind", "Belief", "Bell",
  "Belt", "Bench", "Bend", "Benefit", "Berry", "Bicycle", "Big", "Bike", "Bikini", "Bill",
  "Bin", "Biology", "Bird", "Birth", "Birthday", "Biscuit", "Bit", "Bite", "Black", "Blackberry",
  "Blacksmith", "Blade", "Blame", "Blanket", "Blaze", "Bleach", "Blend", "Bless", "Blind", "Blindfold",
  "Blink", "Blizzard", "Block", "Blond", "Blood", "Bloom", "Blossom", "Blouse", "Blow", "Blue",

  // --- LEVEL 4: EXPERT (Abstract & Specific) ---
  "Black Hole", "Time Travel", "Electricity", "Evolution", "Gravity", "Oxygen", "Photosynthesis", "Reflection", "Revolution", "Shadow",
  "Skeleton", "Solar System", "Telescope", "Temperature", "Thermometer", "Thunder", "Universe", "Vaccine", "Velocity", "Vibration",
  "Virtual Reality", "Volcano", "Water Cycle", "Weather", "Weight", "Windmill", "Wireless", "X-ray", "Yeast", "Zinc",
  "Zoology", "Abstract", "Balance", "Chaos", "Charity", "Comfort", "Communication", "Compassion", "Confidence", "Confusion",
  "Courage", "Creativity", "Curiosity", "Danger", "Dedication", "Defeat", "Delight", "Democracy", "Destiny", "Determination",
  "Dignity", "Disaster", "Discovery", "Dream", "Education", "Emotion", "Empathy", "Energy", "Enthusiasm", "Envy",
  "Eternity", "Evil", "Evolution", "Existence", "Failure", "Faith", "Fame", "Fantasy", "Fashion", "Fear",
  "Fiction", "Freedom", "Friendship", "Future", "Generosity", "Genius", "Grief", "Growth", "Guilt", "Happiness",
  "Harmony", "Hate", "Health", "Heaven", "Hell", "History", "Honesty", "Honor", "Hope", "Humor",
  "Hunger", "Idea", "Identity", "Ignorance", "Imagination", "Infinity", "Innocence", "Insanity", "Inspiration", "Intelligence",
  "Jealousy", "Journey", "Joy", "Justice", "Kindness", "Knowledge", "Laughter", "Law", "Liberty", "Life",
  "Logic", "Loneliness", "Love", "Luck", "Luxury", "Magic", "Marriage", "Mathematics", "Memory", "Mercy"
];

export const setupSocketEvents = (io) => {
  io.on("connection", (socket) => {
    
    // ========================================================================
    // 1. JOINING A ROOM
    // This happens immediately when a user types a code or creates a room.
    // ========================================================================
    socket.on("join_room", async ({ room, name, userId }) => {
      // First, physically connect this socket to the room channel
      socket.join(room);
      console.log(`User ${name} (${userId}) joined room ${room}`);
      
      try {
        // --- STEP A: DATABASE SYNC ---
        // We need to record this "Match" in our database so we can track stats later.
        // We check: Is there already a match running with this room code?
        let matchId;
        const [existingMatch] = await pool.query(
          "SELECT id FROM matches WHERE room_code = ? AND end_time IS NULL", 
          [room]
        );

        if (existingMatch.length === 0) {
          // No match found? Create a brand new one!
          const [result] = await pool.query(
            "INSERT INTO matches (room_code, host_id) VALUES (?, ?)", 
            [room, userId]
          );
          matchId = result.insertId;
        } else {
          // Match exists? Just grab its ID.
          matchId = existingMatch[0].id;
        }

        // Add the user to the 'participants' list for this match.
        // 'INSERT IGNORE' prevents crashing if they are already in the DB.
        await pool.query(
          "INSERT IGNORE INTO match_participants (match_id, user_id) VALUES (?, ?)",
          [matchId, userId]
        );

        // Retrieve their score from the DB (important if they got disconnected and came back)
        const [userData] = await pool.query(
            "SELECT score FROM match_participants WHERE match_id = ? AND user_id = ?",
            [matchId, userId]
        );
        const savedScore = userData.length > 0 ? userData[0].score : 0;

        // --- STEP B: INITIALIZE ROOM MEMORY ---
        // If this room doesn't exist in our RAM yet, we build the default state object.
        if (!rooms[room]) {
          rooms[room] = {
            matchId: matchId, 
            players: [],
            hostId: socket.id, // The first person to enter becomes the Host (Boss)
            drawer: null,      // No one is drawing yet
            word: null,        // No secret word yet
            correctGuesses: [], // List of people who guessed right
            timer: null,       // The countdown interval
            timeLeft: 0,
            gameActive: false,
            drawingData: []    // We save every pencil stroke here to replay for new joiners
          };
          console.log(`Room ${room} created. Host: ${socket.id}`);
        }
        
        // --- STEP C: ADD OR UPDATE PLAYER ---
        // Check if this person is already in our list (Reconnection scenario)
        const existingPlayer = rooms[room].players.find(p => p.userId === userId);
        
        if (existingPlayer) {
            // They are back! Update their socket ID because it changes on every page refresh.
            existingPlayer.id = socket.id; 
            existingPlayer.score = savedScore; // Restore their hard-earned points
            existingPlayer.isReady = false; 

            // If they were the Host before leaving, give them the crown back 👑
            if (existingPlayer.isHost) {
                rooms[room].hostId = socket.id;
            }
        } else {
            // Brand new player. Add them to the roster.
            const isFirst = rooms[room].players.length === 0;
            rooms[room].players.push({ 
                id: socket.id, 
                userId: userId, 
                name: name, 
                score: savedScore,
                isReady: false, 
                isHost: isFirst // If they are the only one, they are automatically Host
            });

            // Double check host assignment just to be safe
            if (isFirst) {
                rooms[room].hostId = socket.id;
            }
        }

        // Tell everyone in the room: "Hey, look who's here!" (Update the UI list)
        io.to(room).emit("update_players", rooms[room].players);
        io.to(room).emit("room_data", { hostId: rooms[room].hostId });

        // --- STEP D: LATE JOINER SYNC ---
        // If the game is ALREADY running, we can't show them a blank screen.
        // We must send them the current state so they can catch up.
        if (rooms[room].gameActive) {
            // 1. Tell them who is drawing and the word length (e.g., "_ _ _ _ _")
            io.to(socket.id).emit("game_started", { 
                drawerId: rooms[room].drawer, 
                wordLength: rooms[room].word.length 
            });
            
            // 2. Sync their timer to the server's time
            io.to(socket.id).emit("timer_update", rooms[room].timeLeft);
            
            // 3. Replay the ENTIRE drawing history so their canvas matches everyone else's
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
    // Handling things players do while waiting for the game to start.
    // ========================================================================

    // Player clicks "I'm Ready" button
    socket.on("toggle_ready", (room) => {
        if (!rooms[room]) return;
        const player = rooms[room].players.find(p => p.id === socket.id);
        if (player) {
            // Flip their status (true -> false, false -> true)
            player.isReady = !player.isReady;
            // Update the green badges for everyone
            io.to(room).emit("update_players", rooms[room].players);
        }
    });

    // Host clicks the "X" button to kick someone
    socket.on("kick_player", ({ room, targetSocketId }) => {
        if (!rooms[room]) return;
        
        // SECURITY CHECK: Only the Host is allowed to do this!
        if (rooms[room].hostId !== socket.id) return;

        // 1. Send a polite "You've been kicked" message to the victim
        io.to(targetSocketId).emit("kicked");
        
        // 2. Remove them from our memory list
        const pIndex = rooms[room].players.findIndex(p => p.id === targetSocketId);
        if (pIndex !== -1) {
            rooms[room].players.splice(pIndex, 1);
            io.to(room).emit("update_players", rooms[room].players);
        }

        // 3. Force disconnect their socket from the room
        const targetSocket = io.sockets.sockets.get(targetSocketId);
        if (targetSocket) {
            targetSocket.leave(room);
        }
    });

    // ========================================================================
    // 3. THE GAME LOOP 🎮
    // This is the core engine where the magic happens.
    // ========================================================================
    socket.on("start_game", (room) => {
      const roomData = rooms[room];
      if (!roomData) return;

      // Only Host can start the game
      if (roomData.hostId !== socket.id) return;

      // Rule: Need at least 2 players (1 Drawer + 1 Guesser)
      // *Tip: Comment this check out if you are testing alone!
      if (roomData.players.length < 2) return; 

      // --- RESET EVERYTHING FOR NEW ROUND ---
      if (roomData.timer) clearInterval(roomData.timer); // Kill old timer
      roomData.correctGuesses = []; // Reset winners list
      roomData.gameActive = true;
      roomData.drawingData = []; // Clear the canvas history
      
      io.to(room).emit("clear_canvas"); // Tell clients to wipe their screens

      // --- ASSIGN ROLES ---
      // Pick a random player to be the artist
      const drawer = roomData.players[Math.floor(Math.random() * roomData.players.length)];
      roomData.drawer = drawer.id;

      // --- PICK THE SECRET WORD ---
      // We grab one random word from our massive list defined at the top
      const word = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
      roomData.word = word;

      // --- START THE TIMER ---
      roomData.timeLeft = 60; // 60 seconds per round
      io.to(room).emit("timer_update", roomData.timeLeft);

      // This loop runs every 1 second
      roomData.timer = setInterval(async () => {
        roomData.timeLeft--;
        io.to(room).emit("timer_update", roomData.timeLeft);

        // TIME'S UP! ⏰
        if (roomData.timeLeft <= 0) {
          clearInterval(roomData.timer);
          roomData.gameActive = false;
          
          // Calculate who is leading
          const sortedPlayers = [...roomData.players].sort((a, b) => b.score - a.score);
          const winner = sortedPlayers[0];

          // Save the winner to the database permanently
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

          // Show the Victory Screen to everyone
          io.to(room).emit("game_over", {
             winnerName: winner ? winner.name : "No one",
             winnerScore: winner ? winner.score : 0
          });
          
          roomData.drawer = null;
        }
      }, 1000);

      // --- NOTIFY EVERYONE ---
      // Tell clients "Game On!" + tell them who is drawing
      io.to(room).emit("game_started", { 
        drawerId: drawer.id, 
        wordLength: word.length 
      });
      
      // IMPORTANT: Only tell the Drawer what the word is! 🤫
      io.to(drawer.id).emit("your_word", word);
    });

    // ========================================================================
    // 4. CLEANUP (LEAVING & DISCONNECTING)
    // Handling rage-quits, tab closes, and internet dropouts.
    // ========================================================================

    // User explicitly clicks "Exit Room" button
    socket.on("leave_room", ({ room }) => {
        handlePlayerLeave(room, socket);
    });

    // User closes the browser tab (Connection lost)
    socket.on("disconnect", () => {
      // We have to search all rooms to find where this socket was hanging out
      for (const roomId in rooms) {
        const room = rooms[roomId];
        const pIndex = room.players.findIndex((p) => p.id === socket.id);

        if (pIndex !== -1) {
            handlePlayerLeave(roomId, socket);
            break; // Found them, stop searching
        }
      }
    });

    // Shared logic for removing a player safely
    const handlePlayerLeave = (roomId, socket) => {
        const room = rooms[roomId];
        if (!room) return;

        const pIndex = room.players.findIndex((p) => p.id === socket.id);
        if (pIndex !== -1) {
            const wasHost = room.hostId === socket.id;
            const wasDrawer = room.drawer === socket.id;

            // Remove them from the array
            room.players.splice(pIndex, 1);

            // HOST MIGRATION: If the boss left, promote the next person in line
            if (wasHost && room.players.length > 0) {
                room.hostId = room.players[0].id;
                room.players[0].isHost = true;
                io.to(roomId).emit("room_data", { hostId: room.hostId });
            }

            // GAME ENDER: If the Artist left mid-game, we have to stop the round
            if (wasDrawer && room.gameActive) {
                clearInterval(room.timer);
                room.gameActive = false;
                room.drawer = null;
                io.to(roomId).emit("receive_message", { user: "System", message: "Drawer left! Round ended.", isSystem: true });
                io.to(roomId).emit("game_over", { winnerName: "No one (Drawer Left)", winnerScore: 0 });
            }

            // Update list for everyone else
            io.to(roomId).emit("update_players", room.players);
            
            // If the room is now empty, delete it from memory to save resources
            if (room.players.length === 0) {
                if (room.timer) clearInterval(room.timer);
                delete rooms[roomId];
            }
            
            socket.leave(roomId);
        }
    };

    // ========================================================================
    // 5. CHAT & SMART GUESSING
    // Checking if messages match the secret word.
    // ========================================================================
    socket.on("send_message", async ({ room, message, user }) => {
      const roomData = rooms[room];
      if (!roomData) return;

      const isGameRunning = roomData.drawer !== null;
      
      // Clean up the guess (lowercase, remove symbols) to make it fair
      const cleanMsg = message.toLowerCase().replace(/[^a-z0-9 ]/g, "");
      const msgWords = cleanMsg.split(" ");
      
      // Check if the secret word is inside their message
      const isCorrect = isGameRunning && 
                        roomData.word && 
                        msgWords.includes(roomData.word.toLowerCase());

      if (isCorrect) {
        // Prevent Drawer from cheating (guessing their own word)
        if (roomData.drawer === socket.id) return; 
        
        // Prevent farming points (can only guess correctly once per round)
        if (roomData.correctGuesses.includes(socket.id)) return; 

        // Mark them as a winner for this round
        roomData.correctGuesses.push(socket.id);

        // Give them points!
        const player = roomData.players.find((p) => p.id === socket.id);
        if (player) {
            player.score += 10;
            // Update the DB immediately so stats are safe
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
        
        // KEY FEATURE: Don't show the word in chat!
        // Instead, show a green system message saying they got it right.
        io.to(room).emit("receive_message", {
          user: "System",
          message: `${user} guessed the word!`,
          isSystem: true
        });

      } else {
        // If it's just a normal message (or wrong guess), send it to everyone
        io.to(room).emit("receive_message", { user: user, message: message });
      }
    });

    // ========================================================================
    // 6. REAL-TIME DRAWING
    // Relaying coordinate data from the Artist to the Guessers.
    // ========================================================================
    
    // "Pen Down" Event - Start of a line
    socket.on("begin_path", ({ x, y, room, color, size }) => {
      const drawData = { x, y, colour: color, size };
      
      // Save to history (for late joiners)
      if (rooms[room]) {
          rooms[room].drawingData.push({ type: 'begin_path', data: drawData });
      }
      
      // Broadcast to everyone else in the room
      socket.to(room).emit("begin_path", drawData);
    });

    // "Mouse Move" Event - Drawing the line
    socket.on("draw_line", ({ x, y, room }) => {
      const drawData = { x, y };
      if (rooms[room]) {
          rooms[room].drawingData.push({ type: 'draw_line', data: drawData });
      }
      socket.to(room).emit("draw_line", drawData);
    });
  });
};