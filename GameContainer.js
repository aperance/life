import React, { useState, useEffect, useRef } from "react";
import { GameEngine } from "./gameEngine";

const gridWidth = 500;
const gridHeight = 500;

const GameContainer = () => {
  const [cellCount, setCellCount] = useState(25);
  const [cyclesPerSecond, setCyclesPerSecond] = useState(1);
  const [view, setView] = useState({ orginX: 0, orginY: 0, scale: 10 });
  const [isRunning, setRunning] = useState(false);
  const gridCanvasRef = useRef(null);
  const cellCanvasRef = useRef(null);
  const engineRef = useRef(null);

  useEffect(() => {
    if (gridCanvasRef && cellCanvasRef) {
      engineRef.current = new GameEngine(
        cellCount,
        gridCanvasRef.current,
        cellCanvasRef.current
      );
      engineRef.current.setView(view.orginX, view.orginY, view.scale);
    }
  }, [gridCanvasRef, cellCanvasRef]);

  useEffect(() => {
    engineRef.current.setView(view.orginX, view.orginY, view.scale);
  }, [view]);

  useEffect(() => {
    if (isRunning) {
      engineRef.current.play(cyclesPerSecond);
    }
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
            value={cyclesPerSecond}
            onChange={e => setCyclesPerSecond(e.target.value)}
          />
        </label>
        <br />
        <label>
          Scale:
          <input
            type="number"
            value={view.scale}
            onChange={e => setView({ ...view, scale: e.target.value })}
          />
        </label>
        <label>
          X Orgin:
          <input
            type="number"
            view={view.orginX}
            onChange={e => {
              const limit = Math.max(
                cellCount * view.scale - cellCanvasRef.current.width,
                0
              );
              console.log(limit);
              setView({ ...view, orginX: Math.min(e.target.value, limit) });
            }}
          />
        </label>
        <label>
          Y Orgin:
          <input
            type="number"
            view={view.orginY}
            onChange={e => {
              const limit = Math.max(
                cellCount * view.scale - cellCanvasRef.current.height,
                0
              );
              console.log(limit);
              setView({ ...view, orginY: Math.min(e.target.value, limit) });
            }}
          />
        </label>
        <br />
        <button onClick={() => setRunning(true)}>Start</button>
      </div>
      <div style={{ position: "relative" }}>
        <canvas
          id="gridCanvas"
          ref={gridCanvasRef}
          width={gridWidth}
          height={gridHeight}
          style={{ position: "absolute", left: 0, top: 0, zIndex: 0 }}
        />
        <canvas
          id="cellCanvas"
          ref={cellCanvasRef}
          width={gridWidth}
          height={gridHeight}
          style={{ position: "absolute", left: 0, top: 0, zIndex: 1 }}
          onMouseDown={e => {
            const rect = cellCanvasRef.current.getBoundingClientRect();
            const row = Math.floor(
              (view.orginY + e.clientY - rect.top) / view.scale
            );
            const col = Math.floor(
              (view.orginX + e.clientX - rect.left) / view.scale
            );
            engineRef.current.toggleCell(row, col);
          }}
        />
      </div>
    </div>
  );
};

export { GameContainer };
