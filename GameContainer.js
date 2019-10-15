import React, { useState, useEffect, useRef } from "react";
import { GameEngine } from "./gameEngine";

const GameContainer = props => {
  const [mouse, setMouse] = useState({
    down: false,
    moving: false,
    lastX: null,
    lastY: null
  });
  const canvasRef = useRef(null);
  const engineRef = useRef(null);

  useEffect(() => {
    engineRef.current = new GameEngine(
      canvasRef.current.querySelector("#grid-canvas"),
      canvasRef.current.querySelector("#cell-canvas")
    );
  }, [canvasRef]);

  useEffect(() => {
    engineRef.current.initializeUniverse(props.cellCount);
  }, [canvasRef, props.cellCount]);

  useEffect(() => {
    engineRef.current.setView(props.pan.x, props.pan.y, props.zoom);
  }, [canvasRef, props.pan, props.zoom]);

  useEffect(() => {
    props.isRunning && engineRef.current.play(props.speed);
  }, [props.isRunning]);

  const handleMouseMove = e => {
    if (!mouse.down) return;
    if (mouse.lastX === null || mouse.lastY === null) return;

    const movementX = mouse.lastX - e.clientX;
    const movementY = mouse.lastY - e.clientY;

    if (Math.abs(movementX) < 5 && Math.abs(movementY) < 5) return;

    props.setPan({ movementX, movementY });
    setMouse({ down: true, moving: true, lastX: e.clientX, lastY: e.clientY });
  };

  const handleMouseUp = e => {
    if (mouse.down && !mouse.moving) {
      const rect = canvasRef.current.getBoundingClientRect();
      const row = Math.floor((props.pan.y + e.clientY - rect.top) / props.zoom);
      const col = Math.floor(
        (props.pan.x + e.clientX - rect.left) / props.zoom
      );
      engineRef.current.toggleCell(row, col);
    }
    setMouse({ down: false, moving: false, lastX: null, lastY: null });
  };

  return (
    <div
      id="canvas-container"
      ref={canvasRef}
      onMouseDown={e =>
        setMouse({
          down: true,
          moving: false,
          lastX: e.clientX,
          lastY: e.clientY
        })
      }
      onMouseLeave={() =>
        setMouse({ down: false, moving: false, lastX: null, lastY: null })
      }
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <canvas
        id="grid-canvas"
        width={props.canvasSize.width}
        height={props.canvasSize.height}
      />
      <canvas
        id="cell-canvas"
        width={props.canvasSize.width}
        height={props.canvasSize.height}
      />
    </div>
  );
};

export { GameContainer };
