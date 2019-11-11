const worker = new Worker("./worker.js");

class Game {
  constructor(gridCtx, cellCtx, previewCtx, cellCount) {
    this.gridCtx = gridCtx;
    this.cellCtx = cellCtx;
    this.previewCtx = previewCtx;
    this.cellCount = cellCount;

    this.alive = new Set();
    this.alivePreview = new Set();
    this.view = { width: 0, height: 0, zoom: 10, panX: null, panY: null };
    this.redrawGrid = false;
    this.observers = [];
    this.playing = false;
    this.resultBuffer = [];
    this.resultsRequested = false;
    this.shipRender = false;

    worker.onmessage = e => {
      if (e.data === "started") this.playing = true;
      else {
        this.resultBuffer.push(...e.data);
        this.resultsRequested = false;
      }
    };

    this.animationCycle();
  }

  get nextResult() {
    if (!this.playing) return null;

    if (this.resultBuffer.length < 100 && !this.resultsRequested) {
      worker.postMessage({
        action: "requestResults",
        payload: { count: 10 }
      });
      this.resultsRequested = true;
    }

    if (this.resultBuffer.length === 0) return null;
    else return this.resultBuffer.shift();
  }

  setView(view = {}) {
    this.view = { ...this.view, ...view };
    this.view.zoom = this.clamp(this.view.zoom, this.getMinZoom(), 100);
    this.view.panX =
      this.view.panX === null
        ? Math.round(this.getMaxPanX() / 2)
        : this.clamp(this.view.panX, 0, this.getMaxPanX());
    this.view.panY =
      this.view.panY === null
        ? Math.round(this.getMaxPanY() / 2)
        : this.clamp(this.view.panY, 0, this.getMaxPanY());
    this.redrawGrid = true;
  }

  toggleCell(x, y) {
    const index = this.xyToIndex(x, y);
    if (this.alive.has(index)) this.alive.delete(index);
    else this.alive.add(index);
    this.redrawGrid = true;
  }

  placeElement(x, y, shape) {
    const { row: startRow, col: startCol } = this.xyToRowCol(x, y);

    this.alivePreview.clear();

    shape.forEach((rowData, relativeRow) => {
      rowData.forEach((cellState, relativeCol) => {
        const index =
          this.cellCount * (startRow + relativeRow) + (startCol + relativeCol);

        if (cellState === 1) this.alive.add(index);
        else this.alive.delete(index);
      });
    });

    this.redrawGrid = true;
  }

  placePreview(x, y, shape) {
    const { row: startRow, col: startCol } = this.xyToRowCol(x, y);

    this.alivePreview.clear();

    shape.forEach((rowData, relativeRow) => {
      rowData.forEach((cellState, relativeCol) => {
        const index =
          this.cellCount * (startRow + relativeRow) + (startCol + relativeCol);

        if (cellState === 1) this.alivePreview.add(index);
      });
    });

    this.redrawGrid = true;
  }

  clearPreview() {
    this.alivePreview.clear();
    this.redrawGrid = true;
  }

  start() {
    worker.postMessage({
      action: "start",
      payload: { size: this.cellCount, initialAlive: Array.from(this.alive) }
    });
  }

  addObserver(fn) {
    this.observers.push(fn);
  }

  emitToObservers() {
    this.observers.forEach(x => x(this));
  }

  animationCycle() {
    if (this.playing && !this.skipRender) {
      const result = this.nextResult;
      if (result) {
        for (let cellIndex of result.born) this.alive.add(cellIndex);
        for (let cellIndex of result.died) this.alive.delete(cellIndex);
        if (this.redrawGrid) {
          this.renderGrid();
          this.renderAllCells(Array.from(this.alive));
        } else this.renderChangedCells(result.born, result.died);
      }
    } else {
      if (this.redrawGrid) {
        this.renderGrid();
        this.renderAllCells(Array.from(this.alive));
        this.renderPreview(Array.from(this.alivePreview));
      }
    }

    requestAnimationFrame(this.animationCycle.bind(this));

    this.redrawGrid = false;
    this.skipRender = !this.skipRender;
    this.emitToObservers();
  }

  /*** Render Methods ***/

  renderGrid() {
    const { width, height, zoom, panX, panY } = this.view;
    const { row: startRow, col: startCol } = this.xyToRowCol(0, 0);
    const { row: endRow, col: endCol } = this.xyToRowCol(width, height);

    this.gridCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.gridCtx.strokeStyle = "lightgrey";
    this.gridCtx.lineWidth = 0.02;
    this.gridCtx.setTransform(zoom, 0, 0, zoom, -panX, -panY);
    this.gridCtx.clearRect(0, 0, width + panX, height + panY);
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
  }

  renderAllCells(alive) {
    const { width, height, zoom, panX, panY } = this.view;

    this.cellCtx.setTransform(zoom, 0, 0, zoom, -panX, -panY);
    this.cellCtx.clearRect(0, 0, width + panX, height + panY);

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

  renderPreview(alive) {
    const { width, height, zoom, panX, panY } = this.view;

    this.previewCtx.setTransform(zoom, 0, 0, zoom, -panX, -panY);
    this.previewCtx.clearRect(0, 0, width + panX, height + panY);

    for (let i = 0, n = alive.length; i < n; ++i) {
      const { row, col } = this.indexToRowCol(alive[i]);
      this.previewCtx.fillRect(col, row, 1, 1);
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

  xyToIndex(x, y) {
    const { row, col } = this.xyToRowCol(x, y);
    return this.cellCount * row + col;
  }
}

export { Game };
