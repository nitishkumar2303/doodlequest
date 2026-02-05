import { useEffect, useRef, useState } from "react";
import { useSocket } from "../context/SocketContext";

const WhiteBoard = ({ roomId, readOnly, color, size }) => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const socket = useSocket();

  // 1. SETUP CANVAS
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    
    const resize = () => {
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const scale = window.devicePixelRatio || 1;

      canvas.width = Math.floor(rect.width * scale);
      canvas.height = Math.floor(rect.height * scale);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext("2d");
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(scale, scale);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "black";
      ctx.lineWidth = 5;
      contextRef.current = ctx;
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // 2. SOCKET LISTENERS
  useEffect(() => {
    if (!socket) return;

    // FIX: Destructure 'color' (American) not 'colour'
    // This fixes the issue where other players saw black lines instead of eraser
    const handleBeginPath = ({ x, y, color, size }) => {
      const ctx = contextRef.current;
      if (!ctx) return;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = color; // Applies the color (or White for eraser)
      ctx.lineWidth = size;    // Applies the size
    };

    const handleDrawLine = ({ x, y }) => {
      const ctx = contextRef.current;
      if (!ctx) return;
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const handleClearCanvas = () => {
      const canvas = canvasRef.current;
      const ctx = contextRef.current;
      if (!canvas || !ctx) return;
      // Clear the scaled canvas
      ctx.clearRect(0, 0, canvas.width / (window.devicePixelRatio||1), canvas.height / (window.devicePixelRatio||1));
    };

    socket.on("begin_path", handleBeginPath);
    socket.on("draw_line", handleDrawLine);
    socket.on("clear_canvas", handleClearCanvas);

    return () => {
      socket.off("begin_path", handleBeginPath);
      socket.off("draw_line", handleDrawLine);
      socket.off("clear_canvas", handleClearCanvas);
    };
  }, [socket]);

  // 3. DRAWING HANDLERS
  const startDrawing = (e) => {
    if (readOnly) return;
    const { offsetX, offsetY } = e.nativeEvent;
    const ctx = contextRef.current;
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    setIsDrawing(true);

    socket.emit("begin_path", {
      x: offsetX,
      y: offsetY,
      room: roomId,
      color: color, // Sending 'color'
      size: size,
    });
  };

  const draw = (e) => {
    if (!isDrawing || readOnly) return;
    const { offsetX, offsetY } = e.nativeEvent;
    const ctx = contextRef.current;
    if (!ctx) return;

    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();

    socket.emit("draw_line", { x: offsetX, y: offsetY, room: roomId });
  };

  const finishDrawing = () => {
    if (contextRef.current) contextRef.current.closePath();
    setIsDrawing(false);
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={startDrawing}
      onMouseUp={finishDrawing}
      onMouseMove={draw}
      onMouseLeave={finishDrawing}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        cursor: readOnly ? "not-allowed" : "crosshair", // Standard cursor
        touchAction: "none"
      }}
    />
  );
};

export default WhiteBoard;