import { useEffect, useRef, useState } from "react";

import { useSocket } from "../context/SocketContext";

const WhiteBoard = ({ roomId, readOnly }) => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const socket = useSocket();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      // Prefer precise layout size from getBoundingClientRect
      const rect = parent ? parent.getBoundingClientRect() : null;
      const parentWidth =
        rect && rect.width
          ? rect.width
          : parent
            ? parent.clientWidth
            : window.innerWidth;
      const parentHeight =
        rect && rect.height
          ? rect.height
          : parent
            ? parent.clientHeight
            : window.innerHeight;
      // If parent isn't sized yet, retry on next frame to avoid using window size accidentally
      if (parent && (parentWidth === 0 || parentHeight === 0)) {
        requestAnimationFrame(resize);
        return;
      }
      const scale = window.devicePixelRatio || 1;

      // Make it high resolution (HiDPI screens)
      canvas.width = Math.max(1, Math.floor(parentWidth * scale));
      canvas.height = Math.max(1, Math.floor(parentHeight * scale));
      canvas.style.width = `${parentWidth}px`;
      canvas.style.height = `${parentHeight}px`;

      // Reset any transform then scale for HiDPI
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(scale, scale);
      ctx.lineCap = "round";
      ctx.strokeStyle = "black";
      ctx.lineWidth = 5;

      contextRef.current = ctx;
    };

    // Initial size
    resize();

    // Observe parent size changes (handles layout changes reliably)
    let ro;
    if (parent && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(resize);
      ro.observe(parent);
    } else {
      // Fallback to window resize
      window.addEventListener("resize", resize);
    }

    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", resize);
    };
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
    if (readOnly) return;
    //we just need native event to work with
    const nativeEvent = e.nativeEvent;

    const { offsetX, offsetY } = nativeEvent;

    //all these are bascically methods of ctx
    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    setIsDrawing(true);

    //this is to tell server what current user doing so that it can broadcast
    socket.emit("begin_path", { x: offsetX, y: offsetY, room: roomId });
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
    socket.emit("draw_line", { x: offsetX, y: offsetY, room: roomId });
  };

  return (
    <canvas
      onMouseDown={startDrawing}
      onMouseUp={finishDrawing}
      onMouseMove={draw}
      ref={canvasRef}
      style={{
        border: "2px solid black",
        background: "white",
        width: "100%",
        height: "100%",
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "block",
      }}
    />
  );
};

export default WhiteBoard;
