import React, { useState, useEffect } from "react";
import { GameContainer } from "./GameContainer";
import { ControlPanel } from "./ControlPanel";

const App = () => {
  const [cellCount, setCellCount] = useState(25);
  const [speed, setSpeed] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ width: 490, height: 490 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isRunning, setRunning] = useState(false);

  const clampZoomInput = zoomInput =>
    Math.max(
      Math.ceil(Math.max(canvasSize.width, canvasSize.height) / cellCount),
      zoomInput
    );
  const ClampPanXInput = xInput =>
    Math.max(0, Math.min(xInput, cellCount * zoom - canvasSize.width));
  const ClampPanYInput = yInput =>
    Math.max(0, Math.min(yInput, cellCount * zoom - canvasSize.height));

  useEffect(() => {
    setZoom(clampZoomInput(zoom));
  }, [canvasSize, cellCount]);

  return (
    <div>
      <ControlPanel
        cellCount={cellCount}
        speed={speed}
        pan={pan}
        zoom={zoom}
        setCellCount={e => setCellCount(e.target.value)}
        setSpeed={e => setSpeed(e.target.value)}
        setZoom={e => setZoom(clampZoomInput(e.target.value))}
        setPanX={e => setPan({ ...pan, x: ClampPanXInput(e.target.value) })}
        setPanY={e => setPan({ ...pan, y: ClampPanYInput(e.target.value) })}
        setIsRunning={() => setRunning(true)}
      />
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
