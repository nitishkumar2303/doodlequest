import { useEffect, useRef, useState } from "react";

import { useSocket } from "../context/SocketContext";

const WhiteBoard = () => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const socket = useSocket();

  useEffect(() => {
    const canvas = canvasRef.current;

    

    // Make it high resolution (HiDPI screens)
    canvas.width = window.innerWidth * 2;
    canvas.height = window.innerHeight * 2;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    const ctx = canvas.getContext("2d");
    ctx.scale(2, 2); // Scale back down to match screen size
    ctx.lineCap = "round";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 5;

    contextRef.current = ctx;
  }, []);

  //using this useEffect to handle socket
  useEffect(() => {
    if (!socket) return;

    const handleBeginPath = ({ x, y }) => {
      const ctx = contextRef.current;
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const handleDrawLine = ({ x, y }) => {
      const ctx = contextRef.current;
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    socket.on("begin_path", handleBeginPath);
    socket.on("draw_line", handleDrawLine);

    return () => {
      socket.off("begin_path", handleBeginPath);
      socket.off("draw_line", handleDrawLine);
    };
  }, [socket]);

  const startDrawing = (e) => {
    //we just need native event to work with
    const nativeEvent = e.nativeEvent;

    const { offsetX, offsetY } = nativeEvent;

    //all these are bascically methods of ctx
    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    setIsDrawing(true);

    //this is to tell server what current user doing so that it can broadcast
    socket.emit("begin_path", { x: offsetX, y: offsetY });
  };

  const finishDrawing = () => {
    contextRef.current.closePath();
    setIsDrawing(false);
  };

  const draw = (e) => {
    const nativeEvent = e.nativeEvent;
    if (!isDrawing) return;

    const { offsetX, offsetY } = nativeEvent;
    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.stroke();

    //this is to tell server that the current user started drawing
    socket.emit("draw_line", { x: offsetX, y: offsetY });
  };

  return (
    <canvas
      onMouseDown={startDrawing}
      onMouseUp={finishDrawing}
      onMouseMove={draw}
      ref={canvasRef}
      style={{ border: "2px solid black", background: "white" }}
    />
  );
};

export default WhiteBoard;
