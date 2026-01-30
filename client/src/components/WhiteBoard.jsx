import { useEffect, useRef, useState } from "react";

const WhiteBoard = () => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const[isDrawing , setIsDrawing] = useState(false);

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

  const startDrawing = (e) => {
    //we just need native event to work with
    const nativeEvent = e.nativeEvent;

    const { offsetX, offsetY } = nativeEvent;

    //all these are bascically methods of ctx
    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    setIsDrawing(true);
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
