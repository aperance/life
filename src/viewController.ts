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

export interface ViewController {
  view: {
    zoom?: number;
    panX?: number;
    panY?: number;
  };
  window?: {
    width: number;
    height: number;
  };
  redrawNeeded: boolean;
  minZoom: number;
  maxPanX: number;
  maxPanY: number;
  centerRowCol: { row: number; col: number };
  setWindow(width: number, height: number): void;
  setView(
    newView: { zoom?: number; panX?: number; panY?: number } | null
  ): void;
  zoomAtPoint(zoom: number, x: number, y: number): void;
  clearCanvases(): void;
  updateCanvases(
    alive: Array<number>,
    born: Array<number> | null,
    died: Array<number> | null,
    preview: Array<number>,
    didCellsChange: boolean
  ): void;
  renderGrid(): void;
  renderAllCells(alive: Array<number>, preview: Array<number>): void;
  renderChangedCells(born: Array<number>, died: Array<number>): void;
  indexToRowCol(i: number): { row: number; col: number };
  xyToRowColIndex(
    x: number,
    y: number
  ): { row: number; col: number; index: number };
  clamp(val: number, min: number, max: number): number;
}

/**
 * Factory function to create ViewController object with dependencies injected.
 * @param {CanvasRenderingContext2D} gridCtx Canvas context used for drawing grid lines
 * @param {CanvasRenderingContext2D} cellCtx Canvas context used for drawing cells
 * @param {number} cellCount Number of cells per side of the total game area
 * @param {function(number, number, number): void} observer Function called when zoom or pan values are modified
 * @returns {ViewController}
 */
export function createViewController(
  gridCtx: CanvasRenderingContext2D,
  cellCtx: CanvasRenderingContext2D,
  cellCount: number,
  observer: any
): ViewController {
  const viewController: ViewController = {
    view: {},

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
      if (!this.window || !this.view) throw Error("Canvas not initialized");

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
      if (!this.window || !this.view?.zoom)
        throw Error("Canvas not initialized");

      return cellCount * this.view.zoom - this.window.width;
    },

    /**
     * The maximum pan value in the y direction that dosen't extend off the game area.
     * @memberof ViewController#
     * @type {number}
     */
    get maxPanY() {
      if (!this.window || !this.view?.zoom)
        throw Error("Canvas not initialized");

      return cellCount * this.view.zoom - this.window.height;
    },

    /**
     * The row and column on the game area at the current center of the window. Adjusted
     * so that the center of the game area is 0,0 (internally 0,0 is the top left corner).
     * @memberof ViewController#
     * @type {{row: number, col: number}}
     */
    get centerRowCol() {
      if (!this.window || !this.view) throw Error("Canvas not initialized");

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
      if (!this.window) throw Error("Canvas not initialized");

      // if (typeof this.view === "undefined") {
      //   this.view = {};
      //   this.view.zoom = 10;
      //   this.view.panX = Math.round(this.maxPanX / 2);
      //   this.view.panY = Math.round(this.maxPanY / 2);
      // }

      if (newView) this.view = { ...this.view, ...newView };

      this.view.zoom = this.clamp(this.view.zoom ?? 10, this.minZoom, 100);

      this.view.panX = this.clamp(
        this.view.panX ?? Math.round(this.maxPanX / 2),
        0,
        this.maxPanX
      );

      this.view.panY = this.clamp(
        this.view.panY ?? Math.round(this.maxPanY / 2),
        0,
        this.maxPanY
      );

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
      if (!this.view?.zoom || !this.view?.panX || !this.view?.panY)
        throw Error("Canvas not initialized");

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
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.restore();
      });
    },

    /**
     * Public method to initiate rendering of the game area. Triggered by the
     * animation cycle running in GameController. If necessary, all cells and
     * grid lines will be redrawn. Otherwise only changes cells will be edited.
     * @memberof ViewController#
     * @param {Array<number>} alive Indices of all alive cells in game
     * @param {Array<number>} born Indices of all cells born this generation
     * @param {Array<number>} died Indices of all cells died this generation
     * @param {Array<number>} preview Indices of cells in pattern being previewed
     * @param {boolean} didCellsChange True if alive array was modified since last call
     */
    updateCanvases(alive, born, died, preview, didCellsChange) {
      if (!this.window) return;

      if (born && died && !this.redrawNeeded)
        this.renderChangedCells(born, died);
      else if (didCellsChange || this.redrawNeeded) {
        this.clearCanvases();
        this.renderGrid();
        this.renderAllCells(alive, preview);
        this.redrawNeeded = false;
      }
    },

    /**
     * Redraws all grid lines based on the current zoom and panning properties.
     * @memberof ViewController#
     */
    renderGrid() {
      if (!this.view?.zoom || !this.view?.panX || !this.view?.panY)
        throw Error("Canvas not initialized");

      const { width, height } = gridCtx.canvas;
      const { row: startRow, col: startCol } = this.xyToRowColIndex(0, 0);
      const { row: endRow, col: endCol } = this.xyToRowColIndex(width, height);

      const { zoom, panX, panY } = this.view;
      gridCtx.setTransform(zoom, 0, 0, zoom, -panX, -panY);

      if (zoom < 5) return;

      gridCtx.lineWidth = 0.025;

      gridCtx.strokeStyle = "lightgrey";
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

      gridCtx.strokeStyle = "darkgray";
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
      if (!this.view?.zoom || !this.view?.panX || !this.view?.panY)
        throw Error("Canvas not initialized");

      const { zoom, panX, panY } = this.view;
      cellCtx.setTransform(zoom, 0, 0, zoom, -panX, -panY);

      cellCtx.fillStyle = "rgba(0, 0, 0, 1)";
      for (let i = 0; i < alive.length; ++i) {
        const { row, col } = this.indexToRowCol(alive[i]);
        cellCtx.fillRect(col, row, 1, 1);
      }

      cellCtx.fillStyle = "rgba(0, 0, 0, 0.5)";
      for (let i = 0; i < preview.length; ++i) {
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
      for (let i = 0; i < born.length; ++i) {
        const { row, col } = this.indexToRowCol(born[i]);
        cellCtx.fillRect(col, row, 1, 1);
      }

      for (let i = 0; i < died.length; ++i) {
        const { row, col } = this.indexToRowCol(died[i]);
        cellCtx.clearRect(col, row, 1, 1);
      }
    },

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
      if (!this.view?.zoom || !this.view?.panX || !this.view?.panY)
        throw Error("Canvas not initialized");

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
      return val > max ? max : val < min ? min : val;
    }
  };
  return viewController;
}
