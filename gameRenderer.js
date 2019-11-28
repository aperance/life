// @ts-check

/** @module */

/**
 *
 * @typedef {Object} GameRenderer
 * @property {{width: number, height: number, zoom: number, panX: number, panY: number}} view
 * @property {boolean} redrawGrid
 * @property {Array<Function>} observers
 * @property {Function} setView
 * @property {Function} addObserver
 * @property {Function} emitToObservers
 * @property {Function} render
 * @property {Function} renderGrid
 * @property {Function} renderAllCells
 * @property {Function} renderChangedCells
 * @property {Function} renderPreview
 * @property {Function} clamp
 * @property {Function} getMinZoom
 * @property {Function} getMaxPanX
 * @property {Function} getMaxPanY
 * @property {Function} indexToRowCol
 * @property {Function} xyToRowCol
 * @property {Function} xyToIndex
 */

/**
 * Factory function to create GameRenderer object.
 * @param {CanvasRenderingContext2D} gridCtx
 * @param {CanvasRenderingContext2D} cellCtx
 * @param {CanvasRenderingContext2D} previewCtx
 * @param {number} cellCount
 * @returns {GameRenderer}
 */
const createGameRenderer = (gridCtx, cellCtx, previewCtx, cellCount) => ({
  view: { width: 0, height: 0, zoom: 10, panX: null, panY: null },
  redrawGrid: true,
  observers: [],

  /**
   *
   * @param {Object} view
   */
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

  /**
   *
   * @param {Function} fn
   */
  addObserver(fn) {
    this.observers.push(fn);
  },

  emitToObservers() {
    this.observers.forEach(x => x(this));
  },

  /**
   *
   * @param {Array<number>} alive
   * @param {Array<number>} born
   * @param {Array<number>} died
   */
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

  /**
   *
   * @param {Array<number>} alive
   */
  renderAllCells(alive) {
    const { width, height, zoom, panX, panY } = this.view;

    cellCtx.setTransform(zoom, 0, 0, zoom, -panX, -panY);
    cellCtx.clearRect(0, 0, width + panX, height + panY);

    for (let i = 0, n = alive.length; i < n; ++i) {
      const { row, col } = this.indexToRowCol(alive[i]);
      cellCtx.fillRect(col, row, 1, 1);
    }
  },

  /**
   *
   * @param {Array<number>} born
   * @param {Array<number>} died
   */
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

  /**
   *
   * @param {Array<number>} alive
   */
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

  /**
   *
   * @param {number} val
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  clamp(val, min, max) {
    return val > max ? max : val < min ? min : val;
  },

  /**
   * @returns {number}
   */
  getMinZoom() {
    return Math.ceil(Math.max(this.view.width, this.view.height) / cellCount);
  },

  /**
   * @returns {number}
   */
  getMaxPanX() {
    return cellCount * this.view.zoom - this.view.width;
  },

  /**
   * @returns {number}
   */
  getMaxPanY() {
    return cellCount * this.view.zoom - this.view.height;
  },

  /**
   *
   * @param {number} i
   * @returns {{row: number, col: number}}
   */
  indexToRowCol(i) {
    return { row: Math.floor(i / cellCount), col: i % cellCount };
  },

  /**
   *
   * @param {number} x
   * @param {number} y
   * @returns {{row: number, col: number}}
   */
  xyToRowCol(x, y) {
    return {
      row: Math.floor((y + this.view.panY) / this.view.zoom),
      col: Math.floor((x + this.view.panX) / this.view.zoom)
    };
  },

  /**
   *
   * @param {number} x
   * @param {number} y
   * @returns {number}
   */
  xyToIndex(x, y) {
    const { row, col } = this.xyToRowCol(x, y);
    return cellCount * row + col;
  }
});

export { createGameRenderer };
