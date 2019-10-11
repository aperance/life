class GameEngine {
  constructor(cellCount, canvas) {
    this.cellCount = cellCount;
    this.universe = new Uint8Array(cellCount * cellCount);
    // this.universe[1275] = 1;
    this.canvas = canvas;
    this.canvas.addEventListener("mousedown", this.clickHandler.bind(this));
  }

  clickHandler(e) {
    console.log(e);
    const rect = this.canvas.getBoundingClientRect();
    const row = Math.floor(
      (this.viewOriginX + e.clientY - rect.top) / this.cellSize
    );
    const col = Math.floor(
      (this.viewOriginY + e.clientX - rect.left) / this.cellSize
    );
    const index = this.cellCount * row + col;
    this.universe[index] = this.universe[index] === 0 ? 1 : 0;
    this.drawUniverse();
  }

  play(cycleTime) {
    this.game = this.generator(this.cellCount, this.universe);
    this.interval = setInterval(() => {
      const { newUniverse } = this.game.next().value;
      this.universe = newUniverse;
      this.drawUniverse();
    }, cycleTime);
  }

  drawUniverse() {
    let ctx = this.canvas.getContext("2d");
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let row = 0; row < this.visibleRowCount; row++) {
      for (let col = 0; col < this.visibleColumnCount; col++) {
        ctx.strokeStyle = "lightgrey";
        ctx.lineWidth = ".25";
        ctx.strokeRect(
          col * this.cellSize - this.viewOffsetX,
          row * this.cellSize - this.viewOffsetY,
          this.cellSize,
          this.cellSize
        );
        const cellIndex =
          this.cellCount * (this.firstVisibleRow + row) +
          (this.firstVisibleColumn + col);
        if (this.universe[cellIndex] === 1) {
          ctx.fillRect(
            col * this.cellSize - this.viewOffsetX,
            row * this.cellSize - this.viewOffsetY,
            this.cellSize,
            this.cellSize
          );
        }
      }
    }
  }

  setView(x, y, cellSize) {
    const viewOverflowX = Math.max(
      this.cellCount * cellSize - this.canvas.width,
      0
    );
    const viewOverflowY = Math.max(
      this.cellCount * cellSize - this.canvas.height,
      0
    );

    this.viewOriginX = Math.min(x, viewOverflowX);
    this.viewOriginY = Math.min(y, viewOverflowY);

    this.viewOffsetX = this.viewOriginX % cellSize;
    this.viewOffsetY = this.viewOriginY % cellSize;

    this.visibleColumnCount = Math.min(
      this.cellCount,
      Math.ceil((this.canvas.width + this.viewOffsetX) / cellSize)
    );
    this.visibleRowCount = Math.min(
      this.cellCount,
      Math.ceil((this.canvas.height + this.viewOffsetY) / cellSize)
    );

    this.firstVisibleColumn = Math.floor(this.viewOriginX / cellSize);
    this.firstVisibleRow = Math.floor(this.viewOriginY / cellSize);

    this.cellSize = cellSize;
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
}

export { GameEngine };
