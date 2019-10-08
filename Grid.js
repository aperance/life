import React, { useRef, useEffect } from "react";
import { useGame } from "./useGame";

const size = 50;
const cellSize = 10;
const gridWidth = 500;
const gridHeight = 500;

const Grid = () => {
  const [universe, toggleCell] = useGame(size);
  const canvasRef = useRef(null);

  useEffect(() => {
    console.log(universe);
    let canvas = canvasRef.current;
    let ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, gridHeight, gridWidth);

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        ctx.strokeStyle = "lightgrey";
        ctx.lineWidth = ".25";
        ctx.strokeRect(col * cellSize, row * cellSize, cellSize, cellSize);
        if (universe[size * row + col] === 1) {
          ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
        }
      }
    }
  }, [universe]);

  return (
    <canvas
      ref={canvasRef}
      width={gridWidth}
      height={gridHeight}
      onMouseDown={e => {
        const rect = canvasRef.current.getBoundingClientRect();
        const row = Math.floor((e.clientY - rect.top) / cellSize);
        const col = Math.floor((e.clientX - rect.left) / cellSize);
        toggleCell(size * row + col);
      }}
    />
  );
};

export { Grid };
