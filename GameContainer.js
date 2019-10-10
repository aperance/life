import React, { useState, useEffect, useRef } from "react";
import { GameEngine } from "./gameEngine";

const size = 100;
const cycleTime = 1;

const gridWidth = 500;
const gridHeight = 500;

const GameContainer = () => {
  const [isRunning, setRunning] = useState(false);
  const canvasRef = useRef(null);
  const engineRef = useRef(null);

  useEffect(() => {
    engineRef.current = new GameEngine(size, canvasRef.current);
    engineRef.current.drawUniverse();
  }, [canvasRef]);

  useEffect(() => {
    if (isRunning) {
      engineRef.current.play(cycleTime);
    }
  }, [isRunning]);

  return (
    <div>
      <div>
        <button onClick={() => setRunning(true)}>Start</button>
      </div>
      <canvas ref={canvasRef} width={gridWidth} height={gridHeight} />
    </div>
  );
};

export { GameContainer };
