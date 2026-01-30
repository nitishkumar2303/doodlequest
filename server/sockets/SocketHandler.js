export const setupSocketEvents = (io) => {
  io.on("connection", (socket) => {
    console.log(`User Connected , User id: ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`User Disconnected , User id:${socket.id}`);
    });
  });
};
