const createGameRenderer = (gridCtx, cellCtx, previewCtx, cellCount) => ({
  view: { width: 0, height: 0, zoom: 10, panX: null, panY: null },
  redrawGrid: true,
  observers: [],

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
  },

  addObserver(fn) {
    this.observers.push(fn);
  },

  emitToObservers() {
    this.observers.forEach(x => x(this));
  },

  render(alive, born, died) {
    if (this.redrawGrid) {
      this.renderGrid();
      this.renderAllCells(alive);
      this.redrawGrid = false;
      this.emitToObservers();
    } else {
      if (born && died) this.renderChangedCells(born, died);
      else this.renderAllCells(alive);
    }
  },

  renderGrid() {
    const { width, height, zoom, panX, panY } = this.view;
    const { row: startRow, col: startCol } = this.xyToRowCol(0, 0);
    const { row: endRow, col: endCol } = this.xyToRowCol(width, height);

    gridCtx.setTransform(1, 0, 0, 1, 0, 0);
    gridCtx.strokeStyle = "lightgrey";
    gridCtx.lineWidth = 0.02;
    gridCtx.setTransform(zoom, 0, 0, zoom, -panX, -panY);
    gridCtx.clearRect(0, 0, width + panX, height + panY);
    gridCtx.beginPath();

    for (let col = startCol + 1; col <= endCol; col++) {
      gridCtx.moveTo(col, startRow);
      gridCtx.lineTo(col, endRow + 1);
    }
    for (let row = startRow + 1; row <= endRow; row++) {
      gridCtx.moveTo(startCol, row);
      gridCtx.lineTo(endCol + 1, row);
    }

    gridCtx.stroke();
  },

  renderAllCells(alive) {
    const { width, height, zoom, panX, panY } = this.view;

    cellCtx.setTransform(zoom, 0, 0, zoom, -panX, -panY);
    cellCtx.clearRect(0, 0, width + panX, height + panY);

    for (let i = 0, n = alive.length; i < n; ++i) {
      const { row, col } = this.indexToRowCol(alive[i]);
      cellCtx.fillRect(col, row, 1, 1);
    }
  },

  renderChangedCells(born, died) {
    for (let i = 0, n = born.length; i < n; ++i) {
      const { row, col } = this.indexToRowCol(born[i]);
      cellCtx.fillRect(col, row, 1, 1);
    }
    for (let i = 0, n = died.length; i < n; ++i) {
      const { row, col } = this.indexToRowCol(died[i]);
      cellCtx.clearRect(col, row, 1, 1);
    }
  },

  renderPreview(alive) {
    const { width, height, zoom, panX, panY } = this.view;

    previewCtx.setTransform(zoom, 0, 0, zoom, -panX, -panY);
    previewCtx.clearRect(0, 0, width + panX, height + panY);

    for (let i = 0, n = alive.length; i < n; ++i) {
      const { row, col } = this.indexToRowCol(alive[i]);
      previewCtx.fillRect(col, row, 1, 1);
    }
  },

  /*** Utility Methods ***/

  clamp(val, min, max) {
    return val > max ? max : val < min ? min : val;
  },

  getMinZoom() {
    return Math.ceil(Math.max(this.view.width, this.view.height) / cellCount);
  },

  getMaxPanX() {
    return cellCount * this.view.zoom - this.view.width;
  },

  getMaxPanY() {
    return cellCount * this.view.zoom - this.view.height;
  },

  indexToRowCol(i) {
    return { row: Math.floor(i / cellCount), col: i % cellCount };
  },

  xyToRowCol(x, y) {
    return {
      row: Math.floor((y + this.view.panY) / this.view.zoom),
      col: Math.floor((x + this.view.panX) / this.view.zoom)
    };
  },

  xyToIndex(x, y) {
    const { row, col } = this.xyToRowCol(x, y);
    return cellCount * row + col;
  }
});

export { createGameRenderer };
