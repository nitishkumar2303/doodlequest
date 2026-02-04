import { useEffect, useRef, useState } from "react";
import { useSocket } from "../context/SocketContext";

const WhiteBoard = ({ roomId, readOnly, color, size }) => {
  // --------------------------------------------------------------------------
  // REFS & STATE
  // --------------------------------------------------------------------------
  
  // Reference to the actual <canvas> DOM element
  const canvasRef = useRef(null);
  
  // Reference to the 2D Drawing Context (The "Brush" that draws pixels)
  const contextRef = useRef(null);
  
  // Are we currently holding the mouse down?
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Socket connection to send/receive drawing data
  const socket = useSocket();

  // --------------------------------------------------------------------------
  // 1. CANVAS SETUP & RESIZING LOGIC
  // This effect ensures the canvas is sharp (High DPI) and fits the screen.
  // --------------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    const ctx = canvas.getContext("2d");

    // Function to calculate exact pixel size
    const resize = () => {
      // A. Get exact size of the parent container
      const rect = parent ? parent.getBoundingClientRect() : null;

      // Fallback logic if parent isn't ready yet (e.g., during first render)
      const parentWidth =
        rect?.width || parent?.clientWidth || window.innerWidth;
      const parentHeight =
        rect?.height || parent?.clientHeight || window.innerHeight;

      // Safety: If hidden (size 0), try again in the next frame
      if (parent && (parentWidth === 0 || parentHeight === 0)) {
        requestAnimationFrame(resize);
        return;
      }

      // B. Handle High DPI (Retina) Screens
      // Standard screens are 1x, Retina/Phones are 2x or 3x.
      // We multiply canvas internal pixels by this scale to make lines sharp.
      const scale = window.devicePixelRatio || 1;

      canvas.width = Math.floor(parentWidth * scale);
      canvas.height = Math.floor(parentHeight * scale);

      // C. CSS Styling (Visual Size)
      // This keeps it looking the correct size on screen, even if pixels are doubled internally.
      canvas.style.width = `${parentWidth}px`;
      canvas.style.height = `${parentHeight}px`;

      // D. Reset Context & Apply Scale
      // We scale the context so drawing "1px" actually fills "scale" amount of pixels.
      ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset any previous transforms
      ctx.scale(scale, scale);

      // E. Default Brush Style
      ctx.lineCap = "round"; // Smooth rounded edges for lines
      ctx.strokeStyle = "black"; // Default color
      ctx.lineWidth = 5; // Default thickness

      contextRef.current = ctx;
    };

    // Run once immediately on mount
    resize();

    // F. Add a "ResizeObserver" to watch the parent div
    // This is better than window.resize because it detects if the sidebar opens/closes.
    let ro;
    if (parent && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(resize);
      ro.observe(parent);
    } else {
      window.addEventListener("resize", resize);
    }

    // Cleanup: Stop watching when component is destroyed
    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", resize);
    };
  }, []);

  // --------------------------------------------------------------------------
  // 2. SOCKET LISTENERS (Receiving Data)
  // This listens for drawing events from OTHER players and renders them.
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!socket) return;

    // A. Received "Start Line" from server
    // Someone else put their pen down. Move our invisible brush to that spot.
    const handleBeginPath = ({ x, y, colour, size }) => {
      const ctx = contextRef.current;
      if (!ctx) return;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = colour;
      ctx.lineWidth = size;
    };

    // B. Received "Draw Line" from server
    // Someone else moved their pen. Draw a line to the new coordinates.
    const handleDrawLine = ({ x, y }) => {
      const ctx = contextRef.current;
      if (!ctx) return;
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    // C. Received "Clear Canvas" (New Game Started)
    const handleClearCanvas = () => {
      const canvas = canvasRef.current;
      const ctx = contextRef.current;
      if (!canvas || !ctx) return;

      // Wipe the entire board clean
      // Note: We use canvas.width because 'clearRect' works on raw pixels
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    // Attach Listeners
    socket.on("begin_path", handleBeginPath);
    socket.on("draw_line", handleDrawLine);
    socket.on("clear_canvas", handleClearCanvas);

    // Cleanup Listeners (Prevents ghost drawing or memory leaks)
    return () => {
      socket.off("begin_path", handleBeginPath);
      socket.off("draw_line", handleDrawLine);
      socket.off("clear_canvas", handleClearCanvas);
    };
  }, [socket]);

  // --------------------------------------------------------------------------
  // 3. MOUSE HANDLERS (My Drawing Logic)
  // --------------------------------------------------------------------------

  // MOUSE DOWN: Start a new line
  const startDrawing = (e) => {
    // Guard Clause: If I am a Guesser (readOnly), stop immediately.
    if (readOnly) return;

    const { offsetX, offsetY } = e.nativeEvent;
    const ctx = contextRef.current;

    ctx.beginPath(); // Start fresh path
    ctx.moveTo(offsetX, offsetY); // Move brush to mouse position

    // Apply current selected tool settings
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    
    setIsDrawing(true);

    // Emit to Server (So others see my pen go down)
    socket.emit("begin_path", {
      x: offsetX,
      y: offsetY,
      room: roomId,
      color: color,
      size: size,
    });
  };

  // MOUSE MOVE: Continue drawing the line
  const draw = (e) => {
    if (!isDrawing) return; // Don't draw if mouse isn't held down

    const { offsetX, offsetY } = e.nativeEvent;

    // Draw locally immediately (for zero latency feel)
    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.stroke();

    // Emit to Server (So others see the line)
    socket.emit("draw_line", { x: offsetX, y: offsetY, room: roomId });
  };

  // MOUSE UP / LEAVE: Stop drawing
  const finishDrawing = () => {
    contextRef.current.closePath();
    setIsDrawing(false);
  };

  // --------------------------------------------------------------------------
  // RENDER UI
  // --------------------------------------------------------------------------
  return (
    <canvas
      ref={canvasRef}
      onMouseDown={startDrawing}
      onMouseUp={finishDrawing}
      onMouseMove={draw}
      onMouseLeave={finishDrawing} // Added safety: stop drawing if mouse leaves box
      style={{
        border: "2px solid black",
        background: "white",
        width: "100%",
        height: "100%",
        cursor: readOnly ? "not-allowed" : "crosshair", // Visual feedback for Guessers
      }}
    />
  );
};

export default WhiteBoard;