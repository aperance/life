import { gameEngine } from "./gameEngine";

let cellCount, universe;
let visibleArea;
let view = { zoom: 1, panX: 0, panY: 0 };
let mouseDown = { x: null, y: null };
let dragging = false;
let game, gameTimer;

const container = document.getElementById("canvas-container");
const gridCtx = document.getElementById("grid-canvas").getContext("2d");
const cellCtx = document.getElementById("cell-canvas").getContext("2d");

function updateParameters(newParameters = {}) {
  const { clientHeight, clientWidth } = container;

  if (newParameters.cellCount) {
    cellCount = newParameters.cellCount;
    universe = new Uint8Array(cellCount * cellCount);
  }

  view.zoom = Math.max(
    Math.ceil(Math.max(clientHeight, clientWidth) / cellCount),
    newParameters.zoom || view.zoom
  );

  view.panX = newParameters.panX || view.panX;
  view.panY = newParameters.panY || view.panY;

  visibleArea = {
    startColumn: Math.floor(view.panX / view.zoom),
    endColumn: Math.ceil((clientWidth + view.panX) / view.zoom),
    startRow: Math.floor(view.panY / view.zoom),
    endRow: Math.ceil((clientHeight + view.panY) / view.zoom)
  };

  document.getElementById("cell-count").value = cellCount;
  document.getElementById("zoom").value = view.zoom;
  document.getElementById("pan-x").value = view.panX;
  document.getElementById("pan-y").value = view.panY;

  gridCtx.canvas.height = clientHeight;
  gridCtx.canvas.width = clientWidth;
  gridCtx.clearRect(0, 0, clientWidth, clientHeight);
  gridCtx.setTransform(view.zoom, 0, 0, view.zoom, -view.panX, -view.panY);
  gridCtx.strokeStyle = "lightgrey";
  gridCtx.lineWidth = 0.25 / view.zoom;

  cellCtx.canvas.height = clientHeight;
  cellCtx.canvas.width = clientWidth;
  cellCtx.clearRect(0, 0, clientWidth, clientHeight);
  cellCtx.setTransform(view.zoom, 0, 0, view.zoom, -view.panX, -view.panY);

  for (let col = visibleArea.startColumn; col < visibleArea.endColumn; col++) {
    for (let row = visibleArea.startRow; row < visibleArea.endRow; row++) {
      gridCtx.strokeRect(col, row, 1, 1);
      if (universe[cellCount * row + col] === 1) {
        cellCtx.fillRect(col, row, 1, 1);
      }
    }
  }
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

function play(speed) {
  const interval = 1000 / speed;
  game = gameEngine(cellCount, universe);
  gameTimer = setInterval(() => {
    const { newUniverse, born, died } = game.next().value;
    universe = newUniverse;
    born.forEach(i => {
      const row = Math.floor(i / cellCount);
      const col = i % cellCount;
      if (
        visibleArea.startRow <= row <= visibleArea.endRow &&
        visibleArea.startColumn <= col <= visibleArea.endColumn
      )
        cellCtx.fillRect(col, row, 1, 1);
    });
    died.forEach(i => {
      const row = Math.floor(i / cellCount);
      const col = i % cellCount;
      if (
        visibleArea.startRow <= row <= visibleArea.endRow &&
        visibleArea.startColumn <= col <= visibleArea.endColumn
      )
        cellCtx.clearRect(col, row, 1, 1);
    });
  }, interval);
}

/*** Event Listeners ***/

container.onmousedown = e => {
  mouseDown = { x: e.clientX, y: e.clientY };
};

container.onmouseleave = () => {
  dragging = false;
  mouseDown = { x: null, y: null };
};

container.onmousemove = e => {
  if (!mouseDown.x || !mouseDown.y) return;

  const movementX = mouseDown.x - e.clientX;
  const movementY = mouseDown.y - e.clientY;

  if (Math.abs(movementX) > 5 || Math.abs(movementY) > 5) {
    dragging = true;
  }
};

container.onmouseup = e => {
  if (!dragging) toggleCell(e.clientX, e.clientY);
  dragging = false;
  mouseDown = { x: null, y: null };
};

document.getElementById("cell-count").onchange = e =>
  updateParameters({ cellCount: e.target.value });

document.getElementById("zoom").onchange = e =>
  updateParameters({ zoom: e.target.value });

document.getElementById("pan-x").onchange = e =>
  updateParameters({ panX: e.target.value });

document.getElementById("pan-y").onchange = e =>
  updateParameters({ panY: e.target.value });

document.getElementById("start-button").onclick = () =>
  play(document.getElementById("speed").value);

/*** Initialization ***/

updateParameters({ cellCount: 25, zoom: 10, panX: 0, panY: 0 });