export const setupSocketEvents = (io) => {
  io.on("connection", (socket) => {
    console.log(`User Connected: ${socket.id}`);

    socket.on("begin_path", (arg) => {
      socket.broadcast.emit("begin_path", arg);
    });

    socket.on("draw_line", (arg) => {
      socket.broadcast.emit("draw_line", arg);
    });

    socket.on("disconnect", () => {
      console.log(`User Diconnected ${socket.id}`);
    });
  });


};
