import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { setupSocketEvents } from "./sockets/SocketHandler.js";

import dotenv from 'dotenv';


import authRoutes from "./routes/authRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json()); // this allows parsing json body..

const server = http.createServer(app);

app.use("/api/auth" , authRoutes);

//this basically create Socket.IO instance and bind it to the HTTP server so both share the same port
const io = new Server(server, {
  //the reason we again use cors is that the cors used above is for http request and this one is for the socket.io
  cors: {
    origin: "*",
  },
});

//i am using seperate file to put logic for io
setupSocketEvents(io);

server.listen(PORT, () => {
  console.log(`Server is runnning on port ${PORT}`);
});
