export const setupSocketEvents = (io) => {
  io.on("connection", (socket) => {
    console.log(`User Connected: ${socket.id}`);

    socket.on("join_room" , (roomCode)=>{
        socket.join(roomCode);
        console.log(`User ${socket.id} joined room : ${roomCode}`);
    })


    socket.on("begin_path", ({room , x , y}) => {
      socket.to(room).emit("begin_path",{ x , y});
    });

    socket.on("draw_line", ({room , x , y}) => {
      socket.to(room).emit("draw_line", {x , y});
    });

    socket.on("disconnect", () => {
      console.log(`User Diconnected ${socket.id}`);
    });
  });


};
