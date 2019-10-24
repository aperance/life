import { state } from "./store.js";

const gridCtx = document.getElementById("grid-canvas").getContext("2d");
const cellCtx = document.getElementById("cell-canvas").getContext("2d");

let lastTimestamp = 0;

function toggleCell(x, y) {
  const row = Math.floor((y + state.view.panY) / state.view.zoom);
  const col = Math.floor((x + state.view.panX) / state.view.zoom);
  const index = state.cellCount * row + col;
  if (state.universe[index] === 0) {
    state.universe[index] = 1;
    cellCtx.fillRect(col, row, 1, 1);
  } else {
    state.universe[index] = 0;
    cellCtx.clearRect(col, row, 1, 1);
  }
}

function render(timestamp) {
  const { view, universe, cellCount, playing, game, redrawGrid } = state;
  const delta = timestamp - lastTimestamp;
  if (timestamp && delta > 25) console.error("LAG: " + (delta - 16.68));
  lastTimestamp = timestamp;

  const startColumn = Math.floor(view.panX / view.zoom);
  const endColumn = Math.ceil((view.width + view.panX) / view.zoom);
  const startRow = Math.floor(view.panY / view.zoom);
  const endRow = Math.ceil((view.height + view.panY) / view.zoom);

  if (redrawGrid) {
    gridCtx.setTransform(view.zoom, 0, 0, view.zoom, -view.panX, -view.panY);
    gridCtx.strokeStyle = "lightgrey";
    gridCtx.lineWidth = 0.25 / view.zoom;
    gridCtx.clearRect(0, 0, view.width, view.height);

    cellCtx.setTransform(view.zoom, 0, 0, view.zoom, -view.panX, -view.panY);
    cellCtx.clearRect(0, 0, view.width, view.height);

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
    state.universe = newUniverse;

    cellCtx.clearRect(0, 0, view.width, view.height);
    alive.forEach(i => {
      const row = Math.floor(i / cellCount);
      const col = i % cellCount;
      if (startRow <= row <= endRow && startColumn <= col <= endColumn)
        cellCtx.fillRect(col, row, 1, 1);
    });
  }

  state.redrawGrid = false;
  requestAnimationFrame(render);
}

function* gameEngine(size, startingUniverse) {
  let currentUniverse = startingUniverse;
  let newUniverse, born, died, alive;
  while (true) {
    newUniverse = new Uint8Array(size * size);
    born = [];
    died = [];
    alive = [];
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

        if (newUniverse[selfIndex] === 1) alive.push(selfIndex);
      }
    }
    currentUniverse = newUniverse;

    yield { newUniverse, born, died, alive };
  }
}

export { render, toggleCell, gameEngine };
