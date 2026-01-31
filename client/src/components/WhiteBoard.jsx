import { useEffect, useRef, useState } from "react";
import { useSocket } from "../context/SocketContext";

const WhiteBoard = ({ roomId, readOnly }) => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const socket = useSocket();

  
  // This effect handles setting up the canvas, High DPI screens, 
  // and resizing the canvas when the browser window changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      // A. Get exact size of the parent container
      const rect = parent ? parent.getBoundingClientRect() : null;
      
      // Fallback logic if parent isn't ready yet
      const parentWidth = rect?.width || parent?.clientWidth || window.innerWidth;
      const parentHeight = rect?.height || parent?.clientHeight || window.innerHeight;

      // Safety: If size is 0 (hidden), wait for next frame
      if (parent && (parentWidth === 0 || parentHeight === 0)) {
        requestAnimationFrame(resize);
        return;
      }

      // B. Handle High DPI (Retina) Screens
      // Standard screens are 1, Retina is 2 or 3. 
      // We multiply canvas size by this to make lines sharp, not blurry.
      const scale = window.devicePixelRatio || 1;

      canvas.width = Math.floor(parentWidth * scale);
      canvas.height = Math.floor(parentHeight * scale);
      
      // CSS keeps it the visual size we want, while internal pixels are higher
      canvas.style.width = `${parentWidth}px`;
      canvas.style.height = `${parentHeight}px`;

      // C. Reset Context & Scale
      // We scale the context so drawing 1px actually fills 'scale' amount of pixels
      ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset any previous transforms
      ctx.scale(scale, scale);
      
      // D. Define Brush Style
      ctx.lineCap = "round";      // Smooth edges
      ctx.strokeStyle = "black";  // Color
      ctx.lineWidth = 5;          // Thickness

      contextRef.current = ctx;
    };

    // Run once on mount
    resize();

    // E. Add a "ResizeObserver" to watch the parent div
    // This is better than window.resize because it works if the sidebar opens/closes
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

  // SOCKET COMMUNICATION
  // This effect listens for drawing events from OTHER players
  useEffect(() => {
    if (!socket) return;

    // A. Received "Start Line" from server
    const handleBeginPath = ({ x, y }) => {
      const ctx = contextRef.current;
      if (!ctx) return;
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    // B. Received "Draw Line" from server
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
        // Note: We use canvas.width/scale because we scaled the context earlier
        // But simplest way is often just clearing the raw pixel width/height:
        ctx.clearRect(0, 0, canvas.width, canvas.height); 
    };

    // Attach Listeners
    socket.on("begin_path", handleBeginPath);
    socket.on("draw_line", handleDrawLine);
    socket.on("clear_canvas", handleClearCanvas);

    // Cleanup Listeners (Prevents memory leaks/double drawing)
    return () => {
      socket.off("begin_path", handleBeginPath);
      socket.off("draw_line", handleDrawLine);
      socket.off("clear_canvas", handleClearCanvas);
    };
  }, [socket]);

  // 3. MOUSE EVENT HANDLERS (My Drawing Logic)

  const startDrawing = (e) => {
    // A. Guard Clause: If I am a Guesser, stop immediately.
    if (readOnly) return; 

    const { offsetX, offsetY } = e.nativeEvent;

    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    setIsDrawing(true);

    // B. Emit to Server (So others see my pen go down)
    socket.emit("begin_path", { x: offsetX, y: offsetY, room: roomId });
  };

  const draw = (e) => {
    if (!isDrawing) return; // Don't draw if mouse isn't held down
    
    const { offsetX, offsetY } = e.nativeEvent;
    
    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.stroke();

    // C. Emit to Server (So others see the line)
    socket.emit("draw_line", { x: offsetX, y: offsetY, room: roomId });
  };

  const finishDrawing = () => {
    // Stop drawing when mouse is released or leaves canvas
    contextRef.current.closePath();
    setIsDrawing(false);
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={startDrawing}
      onMouseUp={finishDrawing}
      onMouseMove={draw}
      onMouseLeave={finishDrawing} // Added for safety (if mouse leaves box)
      style={{
        border: "2px solid black",
        background: "white",
        width: "100%",
        height: "100%",
        cursor: readOnly ? "not-allowed" : "crosshair" // Visual feedback
      }}
    />
  );
};

export default WhiteBoard;