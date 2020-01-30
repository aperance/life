/**
 * ViewController is the object reponsible for modifying the HTML canvas elements
 * used to visualize the game area. Three canvas elements are used for drawing
 * grid lines, alive cells, and translucent pattern preview, respectively. The
 * canvases are transformed based on user specified zoom and pan properties.
 * @namespace ViewController
 */

/**
 * Exports a factory function used to generate a ViewController object.
 * @module createViewController
 */

/**
 * @typedef {Object} View
 * @property {number} [zoom]
 * @property {number} [panX]
 * @property {number} [panY]
 */

/**
 * @typedef {Object} ViewController
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
 * @property {function(Array<number>, Array<number>?, Array<number>?, Array<number>, boolean): void} updateCanvases
 * @property {function(): void} renderGrid
 * @property {function(Array<number>, Array<number>): void} renderAllCells
 * @property {function(Array<number>, Array<number>): void} renderChangedCells
 * @property {function(number): {row: number, col: number}} indexToRowCol
 * @property {function(number, number): {row: number, col: number, index: number}} xyToRowColIndex
 * @property {function} clamp
 * @ignore
 */

/**
 * Factory function to create ViewController object with dependencies injected.
 * @param {CanvasRenderingContext2D} gridCtx Canvas context used for drawing grid lines
 * @param {CanvasRenderingContext2D} cellCtx Canvas context used for drawing cells
 * @param {number} cellCount Number of cells per side of the total game area
 * @param {function(number, number, number): void} observer Function called when zoom or pan values are modified
 * @returns {ViewController}
 */
const createViewController = (gridCtx, cellCtx, cellCount, observer) => {
  /** @type {ViewController} */
  const ViewController = {
    /**
     * True if all canvases need to be fully redrawn on the next
     * render, due to a change in view or window parameters.
     * @memberof ViewController#
     * @type {boolean}
     */
    redrawNeeded: true,

    /**
     * The minimum zoom value where the game area is not smaller than the window.
     * @memberof ViewController#
     * @type {number}
     */
    get minZoom() {
      return Math.ceil(
        Math.max(this.window.width, this.window.height) / cellCount
      );
    },

    /**
     * The maximum pan value in the x direction that dosen't extend off the game area.
     * @memberof ViewController#
     * @type {number}
     */
    get maxPanX() {
      return cellCount * this.view.zoom - this.window.width;
    },

    /**
     * The maximum pan value in the y direction that dosen't extend off the game area.
     * @memberof ViewController#
     * @type {number}
     */
    get maxPanY() {
      return cellCount * this.view.zoom - this.window.height;
    },

    /**
     * The row and column on the game area at the current center of the window. Adjusted
     * so that the center of the game area is 0,0 (internally 0,0 is the top left corner).
     * @memberof ViewController#
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
     * @memberof ViewController#
     * @param {number} width Current window width in pixels
     * @param {number} height Current height width in pixels
     */
    setWindow(width, height) {
      this.window = { width, height };
      this.setView(null);
    },

    /**
     * Updates the zoom and panning properties with the provided object, and ensures the values are
     * within acceptable bounds. If parameter is null, current zoom and panning properties are rechecked.
     * @memberof ViewController#
     * @param {View?} newView Object containing updated zoom and pan parameters
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
     * @memberof ViewController#
     * @param {number} zoom Desired zoom value
     * @param {number} x x-coordinate of point to keep stationary
     * @param {number} y y-coordinate of point to keep stationary
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
     * @memberof ViewController#
     */
    clearCanvases() {
      [gridCtx, cellCtx].forEach(ctx => {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      });
    },

    /**
     * Public method to initiate rendering of the game area. Triggered by the
     * animation cycle running in GameController. If necessary, all cells and
     * grid lines will be redrawn. Otherwise only changes cells will be edited.
     * @memberof ViewController#
     * @param {Array<number>} alive Indices of all alive cells in game
     * @param {Array<number>?} born Indices of all cells born this generation
     * @param {Array<number>?} died Indices of all cells died this generation
     * @param {Array<number>} preview Indices of cells in pattern being previewed
     * @param {boolean} didCellsChange True if alive array was modified since last call
     */
    updateCanvases(alive, born, died, preview, didCellsChange) {
      if (
        typeof this.window === "undefined" ||
        typeof this.view === "undefined"
      )
        return;

      if (this.redrawNeeded) {
        this.renderGrid();
        this.renderAllCells(alive, preview);
        this.redrawNeeded = false;
      } else if (didCellsChange) {
        if (born && died) this.renderChangedCells(born, died);
        else this.renderAllCells(alive, preview);
      }
    },

    /**
     * Redraws all grid lines based on the current zoom and panning properties.
     * @memberof ViewController#
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
     * Redraws all cells in the game area, plus a translucent preview of a pattern selected from the pattern library.
     * @memberof ViewController#
     * @param {Array<number>} alive Indices of all alive cells in game
     * @param {Array<number>} preview Indices of cells in pattern being previewed
     */
    renderAllCells(alive, preview) {
      const { width, height } = this.window;
      const { zoom, panX, panY } = this.view;

      cellCtx.setTransform(zoom, 0, 0, zoom, -panX, -panY);
      cellCtx.clearRect(0, 0, width + panX, height + panY);

      cellCtx.fillStyle = "rgba(0, 0, 0, 1)";
      for (let i = 0, n = alive.length; i < n; ++i) {
        const { row, col } = this.indexToRowCol(alive[i]);
        cellCtx.fillRect(col, row, 1, 1);
      }

      cellCtx.fillStyle = "rgba(0, 0, 0, 0.5)";
      for (let i = 0, n = preview.length; i < n; ++i) {
        const { row, col } = this.indexToRowCol(preview[i]);
        cellCtx.fillRect(col, row, 1, 1);
      }
    },

    /**
     * Draws or clears the modified cells in the game area.
     * @memberof ViewController#
     * @param {Array<number>} born Indices of all cells born this generation
     * @param {Array<number>} died Indices of all cells died this generation
     */
    renderChangedCells(born, died) {
      cellCtx.fillStyle = "rgba(0, 0, 0, 1)";
      for (let i = 0, n = born.length; i < n; ++i) {
        const { row, col } = this.indexToRowCol(born[i]);
        cellCtx.fillRect(col, row, 1, 1);
      }
      for (let i = 0, n = died.length; i < n; ++i) {
        const { row, col } = this.indexToRowCol(died[i]);
        cellCtx.clearRect(col, row, 1, 1);
      }
    },

    // /**
    //  * Draws a translucent preview of a pattern selected from the pattern library.
    //  * @memberof ViewController#
    //  * @param {Array<number>} alive Indices of cells in pattern being previewed
    //  */
    // renderPreview(alive) {
    //   const { width, height } = this.window;
    //   const { zoom, panX, panY } = this.view;

    //   //previewCtx.setTransform(zoom, 0, 0, zoom, -panX, -panY);
    //   //previewCtx.clearRect(0, 0, width + panX, height + panY);
    //   cellCtx.fillStyle = "rgba(0, 0, 0, 0.5)";
    //   for (let i = 0, n = alive.length; i < n; ++i) {
    //     const { row, col } = this.indexToRowCol(alive[i]);
    //     cellCtx.fillRect(col, row, 1, 1);
    //   }
    // },

    /**
     * Converts an index from the game area to the equivilant row and column.
     * @memberof ViewController#
     * @param {number} i Cell index
     * @returns {{row: number, col: number}}
     */
    indexToRowCol(i) {
      return { row: Math.floor(i / cellCount), col: i % cellCount };
    },

    /**
     * Converts coordinates from the window to the row, column, and index on the game area.
     * @memberof ViewController#
     * @param {number} x Window x-coordinate
     * @param {number} y Window y-coordinate
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
     * @memberof ViewController#
     * @param {number} val Value to be clamped
     * @param {number} min Minimum value to be returned
     * @param {number} max Maximum value to be returned
     * @returns {number}
     */
    clamp(val, min, max) {
      return (val > max ? max : val < min ? min : val);
    }
  };

  return ViewController;
};

export { createViewController };
