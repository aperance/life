class GameRenderer {
  constructor(gridCtx, cellCtx, previewCtx, cellCount) {
    this.gridCtx = gridCtx;
    this.cellCtx = cellCtx;
    this.previewCtx = previewCtx;
    this.cellCount = cellCount;
    this.view = { width: 0, height: 0, zoom: 10, panX: null, panY: null };
    this.redrawGrid = true;
    this.observers = [];
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

  addObserver(fn) {
    this.observers.push(fn);
  }

  emitToObservers() {
    this.observers.forEach(x => x(this));
  }

  /*** Render Methods ***/

  render(alive, born, died) {
    if (this.redrawGrid || !born || !died) {
      this.renderGrid();
      this.renderAllCells(alive);
    } else this.renderChangedCells(born, died);

    this.redrawGrid = false;
    this.emitToObservers();
  }

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

export { GameRenderer };
