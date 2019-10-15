class GameEngine {
  constructor() {
    this.container = document.getElementById("canvas-container");
    this.gridCanvas = this.container.querySelector("#grid-canvas");
    this.cellCanvas = this.container.querySelector("#cell-canvas");
    this.cellCount = 25;
    this.universe = new Uint8Array(this.cellCount * this.cellCount);
    this.setView(0, 0, 1);
    this.mouseDown = { x: null, y: null };
    this.dragging = false;

    this.container.onmousedown = e => {
      this.mouseDown = { x: e.clientX, y: e.clientY };
    };

    this.container.onmouseleave = () => {
      this.dragging = false;
      this.mouseDown = { x: null, y: null };
    };

    this.container.onmousemove = e => {
      if (!this.mouseDown.x || !this.mouseDown.y) return;

      const movementX = this.mouseDown.x - e.clientX;
      const movementY = this.mouseDown.y - e.clientY;

      if (Math.abs(movementX) > 5 || Math.abs(movementY) > 5) {
        this.dragging = true;
      }
    };

    this.container.onmouseup = e => {
      if (!this.dragging) {
        const { top, left } = this.container.getBoundingClientRect();
        const row = Math.floor(
          (this.viewOriginY + e.clientY - top) / this.cellSize
        );
        const col = Math.floor(
          (this.viewOriginX + e.clientX - left) / this.cellSize
        );
        this.toggleCell(row, col);
      }
      this.dragging = false;
      this.mouseDown = { x: null, y: null };
    };
  }

  setView(orginX, orginY, cellSize) {
    const height = this.container.clientHeight;
    const width = this.container.clientWidth;

    this.gridCanvas.setAttribute("height", height);
    this.gridCanvas.setAttribute("width", width);
    this.cellCanvas.setAttribute("height", height);
    this.cellCanvas.setAttribute("width", width);

    this.cellSize = Math.max(
      Math.ceil(Math.max(width, height) / this.cellCount),
      cellSize
    );
    this.viewOriginX = Math.min(
      Math.max(0, orginX),
      this.cellCount * this.cellSize - width
    );
    this.viewOriginY = Math.min(
      Math.max(0, orginY),
      this.cellCount * this.cellSize - height
    );

    this.viewOffsetX = this.viewOriginX % cellSize;
    this.viewOffsetY = this.viewOriginY % cellSize;

    this.visibleColumnCount = Math.min(
      this.cellCount,
      Math.ceil((width + this.viewOffsetX) / cellSize)
    );
    this.visibleRowCount = Math.min(
      this.cellCount,
      Math.ceil((height + this.viewOffsetY) / cellSize)
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
