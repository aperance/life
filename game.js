const worker = new Worker("./worker.js");

class Game {
  constructor(gridCtx, cellCtx, cellCount) {
    this.gridCtx = gridCtx;
    this.cellCtx = cellCtx;
    this.cellCount = cellCount;

    this.universe = new Uint8Array(cellCount * cellCount);
    this.view = { width: 0, height: 0, zoom: 1, panX: 0, panY: 0 };
    this.redrawGrid = false;
    this.observers = [];
    this.playing = false;
    this.resultBuffer = [];
    this.resultsRequested = false;

    worker.onmessage = e => {
      if (e.data === "started") this.playing = true;
      else {
        this.resultBuffer.push(...e.data);
        this.resultsRequested = false;
      }
    };

    this.animationCycle();
  }

  setView(view = {}) {
    this.view = { ...this.view, ...view };
    this.view.zoom = this.clamp(this.view.zoom, this.getMinZoom(), 100);
    this.view.panX = this.clamp(this.view.panX, 0, this.getMaxPanX());
    this.view.panY = this.clamp(this.view.panY, 0, this.getMaxPanY());
    this.redrawGrid = true;
  }

  toggleCell(x, y) {
    const { row, col } = this.xyToRowCol(x, y);
    const index = this.cellCount * row + col;
    if (this.universe[index] === 0) {
      this.universe[index] = 1;
      this.cellCtx.fillRect(col, row, 1, 1);
    } else {
      this.universe[index] = 0;
      this.cellCtx.clearRect(col, row, 1, 1);
    }
  }

  placeElement(x, y, shape) {
    const { row: startRow, col: startCol } = this.xyToRowCol(x, y);
    shape.forEach((arr, row) => {
      arr.forEach((cell, col) => {
        const index = this.cellCount * (startRow + row) + (startCol + col);
        this.universe[index] = cell;
      });
    });
    this.redrawGrid = true;
  }

  start() {
    worker.postMessage({
      action: "start",
      payload: { universe: this.universe }
    });
  }

  addObserver(fn) {
    this.observers.push(fn);
  }

  emitToObservers() {
    this.observers.forEach(x => x(this));
  }

  animationCycle() {
    if (this.redrawGrid) this.renderGrid();

    if (this.playing) {
      if (this.resultBuffer.length < 100 && !this.resultsRequested) {
        worker.postMessage({
          action: "requestResults",
          payload: { count: 10 }
        });
        this.resultsRequested = true;
      }

      if (this.resultBuffer.length > 0) {
        const { born, died, alive } = this.resultBuffer.shift();
        if (this.redrawGrid) this.renderAllCells(alive);
        else this.renderChangedCells(born, died);
      }
    }

    this.redrawGrid = false;
    this.emitToObservers();
    requestAnimationFrame(this.animationCycle.bind(this));
  }

  /*** Render Methods ***/

  renderGrid() {
    const { width, height, zoom, panX, panY } = this.view;
    const { row: startRow, col: startCol } = this.xyToRowCol(0, 0);
    const { row: endRow, col: endCol } = this.xyToRowCol(width, width);

    this.gridCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.gridCtx.strokeStyle = "lightgrey";
    this.gridCtx.lineWidth = 0.02;
    this.gridCtx.setTransform(zoom, 0, 0, zoom, -panX, -panY);
    this.gridCtx.clearRect(0, 0, width, height);
    this.gridCtx.beginPath();

    for (let col = startCol + 1; col <= endCol; col++) {
      this.gridCtx.moveTo(col, startRow);
      this.gridCtx.lineTo(col, endRow + 1);
    }
    for (let row = startRow + 1; row <= endRow; row++) {
      this.gridCtx.moveTo(startCol, row);
      this.gridCtx.lineTo(endCol + 1, row);
    }

    this.gridCtx.stroke();

    this.cellCtx.setTransform(zoom, 0, 0, zoom, -panX, -panY);
    this.cellCtx.clearRect(0, 0, width, height);

    if (!this.playing) {
      for (let col = startCol; col < endCol; col++) {
        for (let row = startRow; row < endRow; row++) {
          if (this.universe[this.cellCount * row + col]) {
            this.cellCtx.fillRect(col, row, 1, 1);
          }
        }
      }
    }
  }

  renderAllCells(alive) {
    for (let i = 0, n = alive.length; i < n; ++i) {
      const { row, col } = this.indexToRowCol(alive[i]);
      this.cellCtx.fillRect(col, row, 1, 1);
    }
  }

  renderChangedCells(born, died) {
    for (let i = 0, n = born.length; i < n; ++i) {
      const { row, col } = this.indexToRowCol(born[i]);
      this.cellCtx.fillRect(col, row, 1, 1);
    }
    for (let i = 0, n = died.length; i < n; ++i) {
      const { row, col } = this.indexToRowCol(died[i]);
      this.cellCtx.clearRect(col, row, 1, 1);
    }
  }

  /*** Utility Methods ***/

  clamp(val, min, max) {
    return val > max ? max : val < min ? min : val;
  }

  getMinZoom() {
    return Math.ceil(
      Math.max(this.view.width, this.view.height) / this.cellCount
    );
  }

  getMaxPanX() {
    return this.cellCount * this.view.zoom - this.view.width;
  }

  getMaxPanY() {
    return this.cellCount * this.view.zoom - this.view.height;
  }

  indexToRowCol(i) {
    return { row: Math.floor(i / this.cellCount), col: i % this.cellCount };
  }

  xyToRowCol(x, y) {
    return {
      row: Math.floor((y + this.view.panY) / this.view.zoom),
      col: Math.floor((x + this.view.panX) / this.view.zoom)
    };
  }
}

export { Game };
