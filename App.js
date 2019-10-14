import React, { useState, useEffect } from "react";
import { GameContainer } from "./GameContainer";

const App = () => {
  const [cellCount, setCellCount] = useState(25);
  const [speed, setSpeed] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ width: 490, height: 490 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isRunning, setRunning] = useState(false);

  const minimumZoom = Math.ceil(
    Math.max(canvasSize.width, canvasSize.height) / cellCount
  );
  const maximumPanX = cellCount * zoom - canvasSize.width;
  const maximumPanY = cellCount * zoom - canvasSize.height;

  useEffect(() => {
    setZoom(minimumZoom);
  }, [canvasSize, cellCount]);

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
      <GameContainer
        canvasSize={canvasSize}
        cellCount={cellCount}
        speed={speed}
        pan={pan}
        zoom={zoom}
        isRunning={isRunning}
        setCanvasSize={setCanvasSize}
      />
    </div>
  );
};

export { App };
