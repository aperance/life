import React, { useEffect, useRef } from "react";
import { GameEngine } from "./gameEngine";

const GameContainer = props => {
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

  return (
    <div id="canvas-container" ref={canvasRef}>
      <canvas
        id="grid-canvas"
        width={props.canvasSize.width}
        height={props.canvasSize.height}
      />
      <canvas
        id="cell-canvas"
        width={props.canvasSize.width}
        height={props.canvasSize.height}
        onMouseDown={e => {
          const rect = canvasRef.current.getBoundingClientRect();
          const row = Math.floor(
            (props.pan.y + e.clientY - rect.top) / props.zoom
          );
          const col = Math.floor(
            (props.pan.x + e.clientX - rect.left) / props.zoom
          );
          engineRef.current.toggleCell(row, col);
        }}
      />
    </div>
  );
};

export { GameContainer };
