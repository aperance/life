/**
 * @typedef {Object} View
 * @property {number} [zoom]
 * @property {number} [panX]
 * @property {number} [panY]
 */

/**
 * @class
 */
export class GameRenderer {
  /** @type {boolean} */
  redrawGrid = true;
  /** @type {{width: number, height: number}} */
  window;
  /** @type {View} */
  view;

  constructor(gridCtx, cellCtx, previewCtx, cellCount, observer) {
    this.gridCtx = gridCtx;
    this.cellCtx = cellCtx;
    this.previewCtx = previewCtx;
    this.cellCount = cellCount;
    this.observer = observer;
  }

  /**
   * Receives the current window dimensions and stores it in object state. Triggers
   * setView method to calculate view parameters using updated window dimensions.
   * @param {number} width
   * @param {number} height
   */
  setWindow(width, height) {
    this.window = { width, height };
    this.setView(null);
  }

  /**
   * Updates the zoom and panning properties with the provided object, and ensures the values are
   * within acceptable bounds. If parameter is null, current zoom and panning properties are rechecked.
   * @param {View?} newView
   */
  setView(newView) {
    if (typeof this.window === "undefined") return;

    if (typeof this.view === "undefined") {
      this.view = {};
      this.view.zoom = 10;
      this.view.panX = Math.round(this.getMaxPanX() / 2);
      this.view.panY = Math.round(this.getMaxPanY() / 2);
      console.log(this.view);
    }

    if (newView) this.view = { ...this.view, ...newView };

    this.view.zoom = this.clamp(this.view.zoom, this.getMinZoom(), 100);
    this.view.panX = this.clamp(this.view.panX, 0, this.getMaxPanX());
    this.view.panY = this.clamp(this.view.panY, 0, this.getMaxPanY());

    this.redrawGrid = true;

    const { row, col } = this.getCenterRowCol();
    this.observer(this.view.zoom, row, col);
  }

  /**
   * Updates zoom property with the specified value, and adjusts
   * panning properties so that the specified point is stationary.
   * @param {number} zoom
   * @param {number} x
   * @param {number} y
   */
  zoomAtPoint(zoom, x, y) {
    const { zoom: oldZoom, panX: oldPanX, panY: oldPanY } = this.view;
    const newZoom = this.clamp(zoom, this.getMinZoom(), 100);
    const scale = newZoom / oldZoom - 1;
    const newPanX = Math.round(oldPanX + scale * (oldPanX + x));
    const newPanY = Math.round(oldPanY + scale * (oldPanY + y));
    this.setView({ zoom: newZoom, panX: newPanX, panY: newPanY });
  }

  /**
   * Clears any drawing on all canvases.
   */
  clearCanvases() {
    if (this.window && this.view) {
      const { width, height } = this.window;
      const { panX, panY } = this.view;
      this.gridCtx.clearRect(0, 0, width + panX, height + panY);
      this.cellCtx.clearRect(0, 0, width + panX, height + panY);
      this.previewCtx.clearRect(0, 0, width + panX, height + panY);
    }
  }

  /**
   * Public method to initiate rendering of the game area. Triggered by the
   * animation cycle running in GameController. If necessary, all cells and
   * grid lines will be redrawn. Otherwise only changes cells will be edited.
   * @param {Array<number>} alive
   * @param {Array<number>?} born
   * @param {Array<number>?} died
   * @param {Array<number>} preview
   * @param {boolean} cellsChanged
   */
  render(alive, born, died, preview, cellsChanged) {
    if (typeof this.window === "undefined" || typeof this.view === "undefined")
      return;

    if (this.redrawGrid) {
      this.renderGrid();
      this.renderAllCells(alive);
      this.renderPreview(preview);
      this.redrawGrid = false;
    } else if (cellsChanged) {
      if (born && died) this.renderChangedCells(born, died);
      else this.renderAllCells(alive);
      this.renderPreview(preview);
    }
  }

  /**
   * Redraws all grid lines based on the current zoom and panning properties.
   */
  renderGrid() {
    const { width, height } = this.window;
    const { zoom, panX, panY } = this.view;
    const { row: startRow, col: startCol } = this.xyToRowColIndex(0, 0);
    const { row: endRow, col: endCol } = this.xyToRowColIndex(width, height);

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

    this.gridCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.gridCtx.strokeStyle = "darkgray";
    this.gridCtx.lineWidth = 0.02;
    this.gridCtx.setTransform(zoom, 0, 0, zoom, -panX, -panY);
    this.gridCtx.beginPath();

    for (let col = startCol + 1; col <= endCol; col++) {
      if (col % 10 === 0) {
        this.gridCtx.moveTo(col, startRow);
        this.gridCtx.lineTo(col, endRow + 1);
      }
    }
    for (let row = startRow + 1; row <= endRow; row++) {
      if (row % 10 === 0) {
        this.gridCtx.moveTo(startCol, row);
        this.gridCtx.lineTo(endCol + 1, row);
      }
    }

    this.gridCtx.stroke();
  }

  /**
   * Redraws all cells in the game area.
   * @param {Array<number>} alive
   */
  renderAllCells(alive) {
    const { width, height } = this.window;
    const { zoom, panX, panY } = this.view;

    this.cellCtx.setTransform(zoom, 0, 0, zoom, -panX, -panY);
    this.cellCtx.clearRect(0, 0, width + panX, height + panY);

    for (let i = 0, n = alive.length; i < n; ++i) {
      const { row, col } = this.indexToRowCol(alive[i]);
      this.cellCtx.fillRect(col, row, 1, 1);
    }
  }

  /**
   * Draws or clears the modified cells in the game area.
   * @param {Array<number>} born
   * @param {Array<number>} died
   */
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

  /**
   * Draws a translucent preview of a pattern selected from the pattern library.
   * @param {Array<number>} alive
   */
  renderPreview(alive) {
    const { width, height } = this.window;
    const { zoom, panX, panY } = this.view;

    this.previewCtx.setTransform(zoom, 0, 0, zoom, -panX, -panY);
    this.previewCtx.clearRect(0, 0, width + panX, height + panY);

    for (let i = 0, n = alive.length; i < n; ++i) {
      const { row, col } = this.indexToRowCol(alive[i]);
      this.previewCtx.fillRect(col, row, 1, 1);
    }
  }

  /*** Utility Methods ***/

  /**
   * Calculates the minimum zoom value where the game area is not smaller than the window.
   * @returns {number}
   */
  getMinZoom() {
    return Math.ceil(
      Math.max(this.window.width, this.window.height) / this.cellCount
    );
  }

  /**
   * Calculates the maximum pan value in the x direction that dosen't extend off the game area.
   * @returns {number}
   */
  getMaxPanX() {
    return this.cellCount * this.view.zoom - this.window.width;
  }

  /**
   * Calculates the maximum pan value in the y direction that dosen't extend off the game area.
   * @returns {number}
   */
  getMaxPanY() {
    return this.cellCount * this.view.zoom - this.window.height;
  }

  /**
   * Gets the row and column on the game area at the current center of the window. Adjusted
   * so that the center of the game area is 0,0 (internally 0,0 is the top left corner).
   */
  getCenterRowCol() {
    const { row, col } = this.xyToRowColIndex(
      this.window.width / 2,
      this.window.height / 2
    );
    return { row: row - this.cellCount / 2, col: col - this.cellCount / 2 };
  }

  /**
   * Converts an index from the game area to the equivilant row and column.
   * @param {number} i
   * @returns {{row: number, col: number}}
   */
  indexToRowCol(i) {
    return { row: Math.floor(i / this.cellCount), col: i % this.cellCount };
  }

  /**
   * Converts coordinates from the window to the row, column, and index on the game area.
   * @param {number} x
   * @param {number} y
   * @returns {{row: number, col: number, index: number}}
   */
  xyToRowColIndex(x, y) {
    const row = Math.floor((y + this.view.panY) / this.view.zoom);
    const col = Math.floor((x + this.view.panX) / this.view.zoom);
    const index = this.cellCount * row + col;
    return { row, col, index };
  }

  /**
   * Restricts a value between a minimum and maximum.
   * @param {number} val
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  clamp(val, min, max) {
    return val > max ? max : val < min ? min : val;
  }
}
