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

const renderCells = (universe, visibleRows, visibleColumns, zoom, pan) => {
  let ctx = cellCanvas.getContext("2d");
  ctx.clearRect(0, 0, cellCanvas.width, cellCanvas.height);
  for (let row = visibleRows.start; row < visibleRows.end; row++) {
    for (let col = visibleColumns.start; col < visibleColumns.end; col++) {
      const cellIndex = cellCount * row + +col;
      if (universe[cellIndex] === 1) fillCell(row, col);
    }
  }
};

const fillCell = (row, col, zoom, pan) => {
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
