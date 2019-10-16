import { gameEngine } from "./gameEngine";

let cellCount, universe;
let visibleColumns, visibleRows;
let zoom = 100;
const pan = { x: 0, y: 0 };
let mouseDown = { x: null, y: null };
let dragging = false;
let game, gameTimer;

const container = document.getElementById("canvas-container");
const gridCanvas = container.querySelector("#grid-canvas");
const cellCanvas = container.querySelector("#cell-canvas");

function updateParameters(newParameters = {}) {
  const { clientHeight, clientWidth } = container;

  if (newParameters.cellCount) {
    cellCount = newParameters.cellCount;
    universe = new Uint8Array(cellCount * cellCount);
  }

  zoom = Math.max(
    Math.ceil(Math.max(clientHeight, clientWidth) / cellCount),
    newParameters.zoom || zoom
  );

  pan.x = newParameters.panX || pan.x;
  pan.y = newParameters.panY || pan.y;

  visibleColumns = {
    start: Math.floor(pan.x / zoom),
    end: Math.ceil((clientWidth + pan.x) / zoom)
  };
  visibleRows = {
    start: Math.floor(pan.y / zoom),
    end: Math.ceil((clientHeight + pan.y) / zoom)
  };

  document.getElementById("cell-count").value = cellCount;
  document.getElementById("zoom").value = zoom;
  document.getElementById("pan-x").value = pan.x;
  document.getElementById("pan-y").value = pan.y;

  renderGrid();
  renderCells();
}

function toggleCell(x, y) {
  const { top, left } = container.getBoundingClientRect();
  const row = Math.floor((y + pan.y - top) / zoom);
  const col = Math.floor((x + pan.x - left) / zoom);
  const index = cellCount * row + col;
  universe[index] = universe[index] === 0 ? 1 : 0;
  renderCells();
}

function play(speed) {
  const interval = 1000 / speed;
  game = gameEngine(cellCount, universe);
  gameTimer = setInterval(() => {
    const { newUniverse } = game.next().value;
    universe = newUniverse;
    renderCells();
  }, interval);
}

/*** Canvas Rendering Methods ***/

function renderGrid() {
  let ctx = gridCanvas.getContext("2d");
  ctx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
  ctx.strokeStyle = "black";
  ctx.lineWidth = "1";
  ctx.strokeRect(0, 0, gridCanvas.width, gridCanvas.height);
  ctx.strokeStyle = "lightgrey";
  ctx.lineWidth = ".25";
  for (let row = visibleRows.start; row < visibleRows.end; row++) {
    for (let col = visibleColumns.start; col < visibleColumns.end; col++) {
      ctx.strokeRect(col * zoom - pan.y, row * zoom - pan.x, zoom, zoom);
    }
  }
}

const renderCells = () => {
  let ctx = cellCanvas.getContext("2d");
  ctx.clearRect(0, 0, cellCanvas.width, cellCanvas.height);
  for (let row = visibleRows.start; row < visibleRows.end; row++) {
    for (let col = visibleColumns.start; col < visibleColumns.end; col++) {
      const cellIndex = cellCount * row + +col;
      if (universe[cellIndex] === 1) fillCell(row, col);
    }
  }
};

const fillCell = (row, col) => {
  let ctx = cellCanvas.getContext("2d");
  ctx.fillRect(col * zoom - pan.x, row * zoom - pan.y, zoom, zoom);
};

// const clearCell = (row, col) => {
//   let ctx = cellCanvas.getContext("2d");
//   ctx.clearRect(
//     col * cellSize - viewOffsetX,
//     row * cellSize - viewOffsetY,
//     cellSize,
//     cellSize
//   );
// };

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

gridCanvas.setAttribute("height", container.clientHeight);
gridCanvas.setAttribute("width", container.clientWidth);
cellCanvas.setAttribute("height", container.clientHeight);
cellCanvas.setAttribute("width", container.clientWidth);

updateParameters({ cellCount: 25, zoom: 10, panX: 0, panY: 0 });
