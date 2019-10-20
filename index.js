import { gameEngine } from "./gameEngine";

let cellCount, universe;
let view = { zoom: 1, panX: 0, panY: 0 };
let mouse = { down: false, dragging: false, lastX: null, lastY: null };
let redrawGrid = false;
let playing = false;

let game;
let lastTimestamp = 0;

const container = document.getElementById("canvas-container");
const gridCtx = document.getElementById("grid-canvas").getContext("2d");
const cellCtx = document.getElementById("cell-canvas").getContext("2d");

function updateParameters(newParameters = {}) {
  if (newParameters.cellCount) {
    cellCount = newParameters.cellCount;
    universe = new Uint8Array(cellCount * cellCount);
  }

  view.zoom = Math.max(
    Math.ceil(
      Math.max(container.clientHeight, container.clientWidth) / cellCount
    ),
    newParameters.zoom || view.zoom
  );

  view.panX = Math.min(
    Math.max(0, newParameters.panX || view.panX),
    cellCount * view.zoom - container.clientWidth
  );
  view.panY = Math.min(
    Math.max(0, newParameters.panY || view.panY),
    cellCount * view.zoom - container.clientHeight
  );

  document.getElementById("cell-count").value = cellCount;
  document.getElementById("zoom").value = view.zoom;
  document.getElementById("pan-x").value = view.panX;
  document.getElementById("pan-y").value = view.panY;

  redrawGrid = true;
}

function toggleCell(x, y) {
  const { top, left } = container.getBoundingClientRect();
  const row = Math.floor((y + view.panY - top) / view.zoom);
  const col = Math.floor((x + view.panX - left) / view.zoom);
  const index = cellCount * row + col;
  if (universe[index] === 0) {
    universe[index] = 1;
    cellCtx.fillRect(col, row, 1, 1);
  } else {
    universe[index] = 0;
    cellCtx.clearRect(col, row, 1, 1);
  }
}

function render(timestamp) {
  const delta = timestamp - lastTimestamp;
  if (timestamp && delta > 25) console.error("LAG: " + (delta - 16.68));
  lastTimestamp = timestamp;

  const startColumn = Math.floor(view.panX / view.zoom);
  const endColumn = Math.ceil((container.clientWidth + view.panX) / view.zoom);
  const startRow = Math.floor(view.panY / view.zoom);
  const endRow = Math.ceil((container.clientHeight + view.panY) / view.zoom);

  if (redrawGrid) {
    gridCtx.setTransform(view.zoom, 0, 0, view.zoom, -view.panX, -view.panY);
    gridCtx.strokeStyle = "lightgrey";
    gridCtx.lineWidth = 0.25 / view.zoom;
    gridCtx.clearRect(0, 0, container.clientWidth, container.clientHeight);

    cellCtx.setTransform(view.zoom, 0, 0, view.zoom, -view.panX, -view.panY);
    cellCtx.clearRect(0, 0, container.clientWidth, container.clientHeight);

    for (let col = startColumn; col < endColumn; col++) {
      for (let row = startRow; row < endRow; row++) {
        gridCtx.strokeRect(col, row, 1, 1);
        if (!playing && universe[cellCount * row + col] === 1) {
          cellCtx.fillRect(col, row, 1, 1);
        }
      }
    }
  }

  if (playing) {
    const { newUniverse, alive } = game.next().value;
    universe = newUniverse;

    cellCtx.clearRect(0, 0, container.clientWidth, container.clientHeight);
    alive.forEach(i => {
      const row = Math.floor(i / cellCount);
      const col = i % cellCount;
      if (startRow <= row <= endRow && startColumn <= col <= endColumn)
        cellCtx.fillRect(col, row, 1, 1);
    });
  }

  redrawGrid = false;
  requestAnimationFrame(render);
}

function play() {
  game = gameEngine(cellCount, universe);
  playing = true;
}

/*** Event Listeners ***/

container.onmousedown = e => {
  mouse = {
    down: true,
    dragging: false,
    lastX: e.clientX,
    lastY: e.clientY
  };
};

container.onmouseleave = e => {
  mouse = {
    down: false,
    dragging: false,
    lastX: e.clientX,
    lastY: e.clientY
  };
};

container.onmousemove = e => {
  if (!mouse.down) return;

  const movementX = mouse.lastX - e.clientX;
  const movementY = mouse.lastY - e.clientY;

  if (mouse.dragging || Math.abs(movementX) > 5 || Math.abs(movementY) > 5) {
    updateParameters({
      panX: view.panX + movementX,
      panY: view.panY + movementY
    });
    mouse = {
      down: true,
      dragging: true,
      lastX: e.clientX,
      lastY: e.clientY
    };
  }
};

container.onmouseup = e => {
  if (!mouse.dragging) toggleCell(e.clientX, e.clientY);
  mouse = {
    down: false,
    dragging: false,
    lastX: e.clientX,
    lastY: e.clientY
  };
};

document.getElementById("cell-count").onchange = e =>
  updateParameters({ cellCount: e.target.value });

document.getElementById("zoom").onchange = e =>
  updateParameters({ zoom: e.target.value });

document.getElementById("pan-x").onchange = e =>
  updateParameters({ panX: e.target.value });

document.getElementById("pan-y").onchange = e =>
  updateParameters({ panY: e.target.value });

document.getElementById("start-button").onclick = () => play();

/*** Initialization ***/

gridCtx.canvas.height = container.clientHeight;
gridCtx.canvas.width = container.clientWidth;
cellCtx.canvas.height = container.clientHeight;
cellCtx.canvas.width = container.clientWidth;

updateParameters({ cellCount: 100, zoom: 10, panX: 0, panY: 0 });
render();
