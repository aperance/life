/** @namespace GameRenderer */

/** @module gameRenderer */

/**
 * @typedef {Object} View
 * @property {number} [zoom]
 * @property {number} [panX]
 * @property {number} [panY]
 */

/**
 * @typedef {Object} GameRenderer
 * @property {{width: number, height: number}} [window]
 * @property {View} [view]
 * @property {boolean} redrawNeeded
 * @property {number} minZoom
 * @property {number} maxPanX
 * @property {number} maxPanY
 * @property {{row: number, col: number}} centerRowCol
 * @property {function(number, number)} setWindow
 * @property {function(View?)} setView
 * @property {function(number, number, number): void} zoomAtPoint
 * @property {function(): void} clearCanvases
 * @property {function(Array<number>, Array<number>?, Array<number>?, Array<number>, boolean): void} render
 * @property {function(): void} renderGrid
 * @property {function(Array<number>): void} renderAllCells
 * @property {function(Array<number>, Array<number>): void} renderChangedCells
 * @property {function(Array<number>): void} renderPreview
 * @property {function(number): {row: number, col: number}} indexToRowCol
 * @property {function(number, number): {row: number, col: number, index: number}} xyToRowColIndex
 * @property {function} clamp
 * @ignore
 */

/**
 * Factory function to create GameRenderer object with dependencies injected.
 * @param {CanvasRenderingContext2D} gridCtx
 * @param {CanvasRenderingContext2D} cellCtx
 * @param {CanvasRenderingContext2D} previewCtx
 * @param {number} cellCount
 * @param {function(number, number, number): void} observer
 * @returns {GameRenderer}
 */
const createGameRenderer = (
  gridCtx,
  cellCtx,
  previewCtx,
  cellCount,
  observer
) => {
  /** @type {GameRenderer} */
  const gameRenderer = {
    /**
     * @memberof GameRenderer
     * @type {boolean}
     */
    redrawNeeded: true,

    /**
     * The minimum zoom value where the game area is not smaller than the window.
     * @memberof GameRenderer
     * @type {number}
     */
    get minZoom() {
      return Math.ceil(
        Math.max(this.window.width, this.window.height) / cellCount
      );
    },

    /**
     * The maximum pan value in the x direction that dosen't extend off the game area.
     * @memberof GameRenderer
     * @type {number}
     */
    get maxPanX() {
      return cellCount * this.view.zoom - this.window.width;
    },

    /**
     * The maximum pan value in the y direction that dosen't extend off the game area.
     * @memberof GameRenderer
     * @type {number}
     */
    get maxPanY() {
      return cellCount * this.view.zoom - this.window.height;
    },

    /**
     * The row and column on the game area at the current center of the window. Adjusted
     * so that the center of the game area is 0,0 (internally 0,0 is the top left corner).
     * @memberof GameRenderer
     * @type {{row: number, col: number}}
     */
    get centerRowCol() {
      const { row, col } = this.xyToRowColIndex(
        this.window.width / 2,
        this.window.height / 2
      );
      return { row: row - cellCount / 2, col: col - cellCount / 2 };
    },

    /**
     * Receives the current window dimensions and stores it in object state. Triggers
     * setView method to calculate view parameters using updated window dimensions.
     * @memberof GameRenderer
     * @param {number} width
     * @param {number} height
     */
    setWindow(width, height) {
      this.window = { width, height };
      this.setView(null);
    },

    /**
     * Updates the zoom and panning properties with the provided object, and ensures the values are
     * within acceptable bounds. If parameter is null, current zoom and panning properties are rechecked.
     * @memberof GameRenderer
     * @param {View?} newView
     */
    setView(newView) {
      if (typeof this.window === "undefined") return;

      if (typeof this.view === "undefined") {
        this.view = {};
        this.view.zoom = 10;
        this.view.panX = Math.round(this.maxPanX / 2);
        this.view.panY = Math.round(this.maxPanY / 2);
      }

      if (newView) this.view = { ...this.view, ...newView };

      this.view.zoom = this.clamp(this.view.zoom, this.minZoom, 100);
      this.view.panX = this.clamp(this.view.panX, 0, this.maxPanX);
      this.view.panY = this.clamp(this.view.panY, 0, this.maxPanY);

      this.redrawNeeded = true;

      const { row, col } = this.centerRowCol;
      observer(this.view.zoom, row, col);
    },

    /**
     * Updates zoom property with the specified value, and adjusts
     * panning properties so that the specified point is stationary.
     * @memberof GameRenderer
     * @param {number} zoom
     * @param {number} x
     * @param {number} y
     */
    zoomAtPoint(zoom, x, y) {
      const { zoom: oldZoom, panX: oldPanX, panY: oldPanY } = this.view;
      const newZoom = this.clamp(zoom, this.minZoom, 100);
      const scale = newZoom / oldZoom - 1;
      const newPanX = Math.round(oldPanX + scale * (oldPanX + x));
      const newPanY = Math.round(oldPanY + scale * (oldPanY + y));
      this.setView({ zoom: newZoom, panX: newPanX, panY: newPanY });
    },

    /**
     * Clears any drawing on all canvases.
     * @memberof GameRenderer
     */
    clearCanvases() {
      if (this.window && this.view) {
        const { width, height } = this.window;
        const { panX, panY } = this.view;
        gridCtx.clearRect(0, 0, width + panX, height + panY);
        cellCtx.clearRect(0, 0, width + panX, height + panY);
        previewCtx.clearRect(0, 0, width + panX, height + panY);
      }
    },

    /**
     * Public method to initiate rendering of the game area. Triggered by the
     * animation cycle running in GameController. If necessary, all cells and
     * grid lines will be redrawn. Otherwise only changes cells will be edited.
     * @memberof GameRenderer
     * @param {Array<number>} alive
     * @param {Array<number>?} born
     * @param {Array<number>?} died
     * @param {Array<number>} preview
     * @param {boolean} didCellsChange
     */
    render(alive, born, died, preview, didCellsChange) {
      if (
        typeof this.window === "undefined" ||
        typeof this.view === "undefined"
      )
        return;

      if (this.redrawNeeded) {
        this.renderGrid();
        this.renderAllCells(alive);
        this.renderPreview(preview);
        this.redrawNeeded = false;
      } else if (didCellsChange) {
        if (born && died) this.renderChangedCells(born, died);
        else this.renderAllCells(alive);
        this.renderPreview(preview);
      }
    },

    /**
     * Redraws all grid lines based on the current zoom and panning properties.
     * @memberof GameRenderer
     */
    renderGrid() {
      const { width, height } = this.window;
      const { zoom, panX, panY } = this.view;
      const { row: startRow, col: startCol } = this.xyToRowColIndex(0, 0);
      const { row: endRow, col: endCol } = this.xyToRowColIndex(width, height);

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

      gridCtx.setTransform(1, 0, 0, 1, 0, 0);
      gridCtx.strokeStyle = "darkgray";
      gridCtx.lineWidth = 0.02;
      gridCtx.setTransform(zoom, 0, 0, zoom, -panX, -panY);
      gridCtx.beginPath();

      for (let col = startCol + 1; col <= endCol; col++) {
        if (col % 10 === 0) {
          gridCtx.moveTo(col, startRow);
          gridCtx.lineTo(col, endRow + 1);
        }
      }
      for (let row = startRow + 1; row <= endRow; row++) {
        if (row % 10 === 0) {
          gridCtx.moveTo(startCol, row);
          gridCtx.lineTo(endCol + 1, row);
        }
      }

      gridCtx.stroke();
    },

    /**
     * Redraws all cells in the game area.
     * @memberof GameRenderer
     * @param {Array<number>} alive
     */
    renderAllCells(alive) {
      const { width, height } = this.window;
      const { zoom, panX, panY } = this.view;

      cellCtx.setTransform(zoom, 0, 0, zoom, -panX, -panY);
      cellCtx.clearRect(0, 0, width + panX, height + panY);

      for (let i = 0, n = alive.length; i < n; ++i) {
        const { row, col } = this.indexToRowCol(alive[i]);
        cellCtx.fillRect(col, row, 1, 1);
      }
    },

    /**
     * Draws or clears the modified cells in the game area.
     * @memberof GameRenderer
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
     * Draws a translucent preview of a pattern selected from the pattern library.
     * @memberof GameRenderer
     * @param {Array<number>} alive
     */
    renderPreview(alive) {
      const { width, height } = this.window;
      const { zoom, panX, panY } = this.view;

      previewCtx.setTransform(zoom, 0, 0, zoom, -panX, -panY);
      previewCtx.clearRect(0, 0, width + panX, height + panY);

      for (let i = 0, n = alive.length; i < n; ++i) {
        const { row, col } = this.indexToRowCol(alive[i]);
        previewCtx.fillRect(col, row, 1, 1);
      }
    },

    /*** Utility Methods ***/

    /**
     * Converts an index from the game area to the equivilant row and column.
     * @memberof GameRenderer
     * @param {number} i
     * @returns {{row: number, col: number}}
     */
    indexToRowCol(i) {
      return { row: Math.floor(i / cellCount), col: i % cellCount };
    },

    /**
     * Converts coordinates from the window to the row, column, and index on the game area.
     * @memberof GameRenderer
     * @param {number} x
     * @param {number} y
     * @returns {{row: number, col: number, index: number}}
     */
    xyToRowColIndex(x, y) {
      const row = Math.floor((y + this.view.panY) / this.view.zoom);
      const col = Math.floor((x + this.view.panX) / this.view.zoom);
      const index = cellCount * row + col;
      return { row, col, index };
    },

    /**
     * Restricts a value between a minimum and maximum.
     * @memberof GameRenderer
     * @param {number} val
     * @param {number} min
     * @param {number} max
     * @returns {number}
     */
    clamp(val, min, max) {
      return (val > max ? max : val < min ? min : val);
    }
  };

  return gameRenderer;
};

export { createGameRenderer };
