import React, { useState, useEffect, useRef } from "react";
import { GameEngine } from "./gameEngine";

const GameContainer = () => {
  const [cellCount, setCellCount] = useState(25);
  const [speed, setSpeed] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ width: 490, height: 490 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isRunning, setRunning] = useState(false);
  const canvasRef = useRef(null);
  const engineRef = useRef(null);

  const minimumZoom = Math.ceil(
    Math.max(canvasSize.width, canvasSize.height) / cellCount
  );
  const maximumPanX = cellCount * zoom - canvasSize.width;
  const maximumPanY = cellCount * zoom - canvasSize.height;

  useEffect(() => {
    engineRef.current = new GameEngine(
      canvasRef.current.querySelector("#grid-canvas"),
      canvasRef.current.querySelector("#cell-canvas")
    );
  }, [canvasRef]);

  useEffect(() => {
    engineRef.current.initializeUniverse(cellCount);
  }, [canvasRef, cellCount]);

  useEffect(() => {
    engineRef.current.setView(pan.x, pan.y, zoom);
  }, [canvasRef, pan, zoom]);

  useEffect(() => {
    setZoom(minimumZoom);
  }, [canvasSize, cellCount]);

  useEffect(() => {
    isRunning && engineRef.current.play(speed);
  }, [isRunning]);

  return (
    <div>
      <div>
        <label>
          Cell Count:
          <input
            type="number"
            value={cellCount}
            onChange={e => setCellCount(e.target.value)}
          />
        </label>
        <label>
          Cycles / Sec:
          <input
            type="number"
            value={speed}
            onChange={e => setSpeed(e.target.value)}
          />
        </label>
        <br />
        <label>
          Zoom:
          <input
            type="number"
            value={zoom}
            onChange={e => setZoom(Math.max(e.target.value, minimumZoom))}
          />
        </label>
        <label>
          X Orgin:
          <input
            type="number"
            value={pan.x}
            onChange={e => {
              setPan({
                ...pan,
                x: Math.max(0, Math.min(e.target.value, maximumPanX))
              });
            }}
          />
        </label>
        <label>
          Y Orgin:
          <input
            type="number"
            value={pan.y}
            onChange={e => {
              setPan({
                ...pan,
                y: Math.max(0, Math.min(e.target.value, maximumPanY))
              });
            }}
          />
        </label>
        <br />
        <button onClick={() => setRunning(true)}>Start</button>
      </div>
      <div id="canvas-container" ref={canvasRef}>
        <canvas
          id="grid-canvas"
          width={canvasSize.width}
          height={canvasSize.height}
        />
        <canvas
          id="cell-canvas"
          width={canvasSize.width}
          height={canvasSize.height}
          onMouseDown={e => {
            const rect = canvasRef.current.getBoundingClientRect();
            const row = Math.floor((pan.y + e.clientY - rect.top) / zoom);
            const col = Math.floor((pan.x + e.clientX - rect.left) / zoom);
            engineRef.current.toggleCell(row, col);
          }}
        />
      </div>
    </div>
  );
};

export { GameContainer };
