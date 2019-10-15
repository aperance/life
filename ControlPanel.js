import React from "react";

const ControlPanel = props => {
  return (
    <div>
      <label>
        Cell Count:
        <input
          type="number"
          value={props.cellCount}
          onChange={props.setCellCount}
        />
      </label>
      <label>
        Cycles / Sec:
        <input type="number" value={props.speed} onChange={props.setSpeed} />
      </label>
      <br />
      <label>
        Zoom:
        <input type="number" value={props.zoom} onChange={props.setZoom} />
      </label>
      <label>
        X Orgin:
        <input type="number" value={props.pan.x} onChange={props.setPanX} />
      </label>
      <label>
        Y Orgin:
        <input type="number" value={props.pan.y} onChange={props.setPanY} />
      </label>
      <br />
      <button onClick={props.setIsRunning}>Start</button>
    </div>
  );
};

export { ControlPanel };
