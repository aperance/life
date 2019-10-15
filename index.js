let cellCount = 25;
let universe = new Uint8Array(cellCount * cellCount);
let viewOriginX, viewOriginY, viewOffsetX, viewOffsetY, cellSize;
let visibleColumnCount, visibleRowCount, firstVisibleColumn, firstVisibleRow;
let mouseDown = { x: null, y: null };
let dragging = false;

const container = document.getElementById("canvas-container");
const gridCanvas = container.querySelector("#grid-canvas");
const cellCanvas = container.querySelector("#cell-canvas");

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
  if (!dragging) {
    const { top, left } = container.getBoundingClientRect();
    const row = Math.floor((viewOriginY + e.clientY - top) / cellSize);
    const col = Math.floor((viewOriginX + e.clientX - left) / cellSize);
    toggleCell(row, col);
  }
  dragging = false;
  mouseDown = { x: null, y: null };
};

function setView(orginX, orginY, zoom) {
  const height = container.clientHeight;
  const width = container.clientWidth;

  gridCanvas.setAttribute("height", height);
  gridCanvas.setAttribute("width", width);
  cellCanvas.setAttribute("height", height);
  cellCanvas.setAttribute("width", width);

  cellSize = Math.max(Math.ceil(Math.max(width, height) / cellCount), zoom);
  viewOriginX = Math.min(Math.max(0, orginX), cellCount * cellSize - width);
  viewOriginY = Math.min(Math.max(0, orginY), cellCount * cellSize - height);

  viewOffsetX = viewOriginX % cellSize;
  viewOffsetY = viewOriginY % cellSize;

  visibleColumnCount = Math.min(
    cellCount,
    Math.ceil((width + viewOffsetX) / cellSize)
  );
  visibleRowCount = Math.min(
    cellCount,
    Math.ceil((height + viewOffsetY) / cellSize)
  );

  firstVisibleColumn = Math.floor(viewOriginX / cellSize);
  firstVisibleRow = Math.floor(viewOriginY / cellSize);

  renderGrid();
  renderCells();
}

const toggleCell = (row, col) => {
  const index = cellCount * row + col;
  universe[index] = universe[index] === 0 ? 1 : 0;
  renderCells();
};

const play = cycleTime => {
  const game = generator(cellCount, universe);
  const interval = setInterval(() => {
    const { newUniverse } = game.next().value;
    universe = newUniverse;
    renderCells();
  }, cycleTime);
};

function* generator(size, startingUniverse) {
  let currentUniverse = startingUniverse;
  let newUniverse, born, died;
  while (true) {
    newUniverse = new Uint8Array(size * size);
    born = [];
    died = [];
    for (let row = 0; row < size; row++) {
      const rowPrev = row === 0 ? size - 1 : row - 1;
      const rowNext = row === size - 1 ? 0 : row + 1;

      for (let col = 0; col < size; col++) {
        const colPrev = col === 0 ? size - 1 : col - 1;
        const colNext = col === size - 1 ? 0 : col + 1;

        const selfIndex = size * row + col;
        const neighborIndecies = [
          size * rowPrev + colPrev,
          size * rowPrev + col,
          size * rowPrev + colNext,
          size * row + colPrev,
          size * row + colNext,
          size * rowNext + colPrev,
          size * rowNext + col,
          size * rowNext + colNext
        ];

        let aliveNeighborCount = 0;

        neighborIndecies.forEach(i => {
          if (currentUniverse[i]) aliveNeighborCount++;
        });

        switch (aliveNeighborCount) {
          case 2:
            newUniverse[selfIndex] = currentUniverse[selfIndex];
            break;
          case 3:
            newUniverse[selfIndex] = 1;
            if (currentUniverse[selfIndex] === 0) born.push(selfIndex);
            break;
          default:
            newUniverse[selfIndex] = 0;
            if (currentUniverse[selfIndex] === 1) died.push(selfIndex);
            break;
        }
      }
    }
    currentUniverse = newUniverse;

    yield { newUniverse, born, died };
  }
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
  for (let row = 0; row < visibleRowCount; row++) {
    for (let col = 0; col < visibleColumnCount; col++) {
      console.log("renderGrid");
      ctx.strokeRect(
        col * cellSize - viewOffsetX,
        row * cellSize - viewOffsetY,
        cellSize,
        cellSize
      );
    }
  }
}

const renderCells = () => {
  let ctx = cellCanvas.getContext("2d");
  ctx.clearRect(0, 0, cellCanvas.width, cellCanvas.height);
  for (let row = 0; row < visibleRowCount; row++) {
    for (let col = 0; col < visibleColumnCount; col++) {
      const cellIndex =
        cellCount * (firstVisibleRow + row) + (firstVisibleColumn + col);
      if (universe[cellIndex] === 1) fillCell(row, col);
    }
  }
};

const fillCell = (row, col) => {
  let ctx = cellCanvas.getContext("2d");
  ctx.fillRect(
    col * cellSize - viewOffsetX,
    row * cellSize - viewOffsetY,
    cellSize,
    cellSize
  );
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

setView(0, 0, 1);
