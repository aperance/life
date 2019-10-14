class GameEngine {
  constructor(gridCanvas, cellCanvas) {
    this.gridCanvas = gridCanvas;
    this.cellCanvas = cellCanvas;
  }

  initializeUniverse(cellCount) {
    this.cellCount = cellCount;
    this.universe = new Uint8Array(cellCount * cellCount);
  }

  setView(orginX, orginY, cellSize) {
    this.viewOriginX = orginX;
    this.viewOriginY = orginY;
    this.cellSize = cellSize;

    this.viewOffsetX = this.viewOriginX % cellSize;
    this.viewOffsetY = this.viewOriginY % cellSize;

    this.visibleColumnCount = Math.min(
      this.cellCount,
      Math.ceil((this.cellCanvas.width + this.viewOffsetX) / cellSize)
    );
    this.visibleRowCount = Math.min(
      this.cellCount,
      Math.ceil((this.cellCanvas.height + this.viewOffsetY) / cellSize)
    );

    this.firstVisibleColumn = Math.floor(this.viewOriginX / cellSize);
    this.firstVisibleRow = Math.floor(this.viewOriginY / cellSize);

    this.renderGrid();
    this.renderCells();
  }

  toggleCell(row, col) {
    const index = this.cellCount * row + col;
    this.universe[index] = this.universe[index] === 0 ? 1 : 0;
    this.renderCells();
  }

  play(cycleTime) {
    this.game = this.generator(this.cellCount, this.universe);
    this.interval = setInterval(() => {
      const { newUniverse } = this.game.next().value;
      this.universe = newUniverse;
      this.renderCells();
    }, cycleTime);
  }

  *generator(size, startingUniverse) {
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

  renderGrid() {
    let ctx = this.gridCanvas.getContext("2d");
    ctx.clearRect(0, 0, this.gridCanvas.width, this.gridCanvas.height);
    ctx.strokeStyle = "black";
    ctx.lineWidth = "1";
    ctx.strokeRect(0, 0, this.gridCanvas.width, this.gridCanvas.height);
    ctx.strokeStyle = "lightgrey";
    ctx.lineWidth = ".25";
    for (let row = 0; row < this.visibleRowCount; row++) {
      for (let col = 0; col < this.visibleColumnCount; col++) {
        ctx.strokeRect(
          col * this.cellSize - this.viewOffsetX,
          row * this.cellSize - this.viewOffsetY,
          this.cellSize,
          this.cellSize
        );
      }
    }
  }

  renderCells() {
    let ctx = this.cellCanvas.getContext("2d");
    ctx.clearRect(0, 0, this.cellCanvas.width, this.cellCanvas.height);
    for (let row = 0; row < this.visibleRowCount; row++) {
      for (let col = 0; col < this.visibleColumnCount; col++) {
        const cellIndex =
          this.cellCount * (this.firstVisibleRow + row) +
          (this.firstVisibleColumn + col);
        if (this.universe[cellIndex] === 1) this.fillCell(row, col);
      }
    }
  }

  fillCell(row, col) {
    let ctx = this.cellCanvas.getContext("2d");
    ctx.fillRect(
      col * this.cellSize - this.viewOffsetX,
      row * this.cellSize - this.viewOffsetY,
      this.cellSize,
      this.cellSize
    );
  }

  clearCell(row, col) {
    let ctx = this.cellCanvas.getContext("2d");
    ctx.clearRect(
      col * this.cellSize - this.viewOffsetX,
      row * this.cellSize - this.viewOffsetY,
      this.cellSize,
      this.cellSize
    );
  }
}

export { GameEngine };
