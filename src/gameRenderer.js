/** @module */

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
 * @property {boolean} redrawGrid
 * @property {function(number, number)} setWindow
 * @property {function(View?)} setView
 * @property {function(number, number, number): void} zoomAtPoint
 * @property {function(): void} clearAll
 * @property {function(Array<number>, Array<number>?, Array<number>?, Array<number>, boolean): void} render
 * @property {function(): void} renderGrid
 * @property {function(Array<number>): void} renderAllCells
 * @property {function(Array<number>, Array<number>): void} renderChangedCells
 * @property {function(Array<number>): void} renderPreview
 * @property {function(): number} getMinZoom
 * @property {function(): number} getMaxPanX
 * @property {function(): number} getMaxPanY
 * @property {function(): {row: number, col: number}} getCenterRowCol
 * @property {function(number): {row: number, col: number}} indexToRowCol
 * @property {function(number, number): {row: number, col: number}} xyToRowCol
 * @property {function(number, number): number} xyToIndex
 */

/**
 * Factory function to create GameRenderer object.
 * @param {CanvasRenderingContext2D} gridCtx
 * @param {CanvasRenderingContext2D} cellCtx
 * @param {CanvasRenderingContext2D} previewCtx
 * @param {number} cellCount
 * @param {function(number, number, number): void} onViewChange
 * @returns {GameRenderer}
 */
const createGameRenderer = (
  gridCtx,
  cellCtx,
  previewCtx,
  cellCount,
  onViewChange
) => {
  /** @type {GameRenderer} */
  const gameRenderer = {
    redrawGrid: true,

    /**
     *
     * @param {number} width
     * @param {number} height
     */
    setWindow(width, height) {
      this.window = { width, height };
      this.setView(null);
    },

    /**
     *
     * @param {View} [view]
     */
    setView(newView) {
      if (typeof this.window === "undefined") return;

      if (typeof this.view === "undefined") {
        this.view = {};
        this.view.zoom = 10;
        this.view.panX = Math.round(this.getMaxPanX() / 2);
        this.view.panY = Math.round(this.getMaxPanY() / 2);
      }

      if (newView) this.view = { ...this.view, ...newView };

      this.view.zoom = clamp(this.view.zoom, this.getMinZoom(), 100);
      this.view.panX = clamp(this.view.panX, 0, this.getMaxPanX());
      this.view.panY = clamp(this.view.panY, 0, this.getMaxPanY());

      this.redrawGrid = true;

      const { row, col } = this.getCenterRowCol();
      onViewChange(this.view.zoom, row, col);
    },

    /**
     *
     * @param {number} newZoom
     * @param {number} x
     * @param {number} y
     */
    zoomAtPoint(zoom, x, y) {
      const { zoom: oldZoom, panX: oldPanX, panY: oldPanY } = this.view;
      const newZoom = clamp(zoom, this.getMinZoom(), 100);
      const scale = newZoom / oldZoom - 1;
      const newPanX = Math.round(oldPanX + scale * (oldPanX + x));
      const newPanY = Math.round(oldPanY + scale * (oldPanY + y));
      this.setView({ zoom: newZoom, panX: newPanX, panY: newPanY });
    },

    /**
     *
     */
    clearAll() {
      if (this.window && this.view) {
        const { width, height } = this.window;
        const { panX, panY } = this.view;
        gridCtx.clearRect(0, 0, width + panX, height + panY);
        cellCtx.clearRect(0, 0, width + panX, height + panY);
        previewCtx.clearRect(0, 0, width + panX, height + panY);
      }
    },

    /**
     *
     * @function
     * @name render
     * @param {Array<number>} alive
     * @param {Array<number>?} born
     * @param {Array<number>?} died
     * @param {Array<number>} preview
     * @param {boolean} cellsChanged
     */
    render(alive, born, died, preview, cellsChanged) {
      if (
        typeof this.window === "undefined" ||
        typeof this.view === "undefined"
      )
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
    },

    /**
     *
     */
    renderGrid() {
      const { width, height } = this.window;
      const { zoom, panX, panY } = this.view;
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
     *
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
     * @returns {number}
     */
    getMinZoom() {
      return Math.ceil(
        Math.max(this.window.width, this.window.height) / cellCount
      );
    },

    /**
     * @returns {number}
     */
    getMaxPanX() {
      return cellCount * this.view.zoom - this.window.width;
    },

    /**
     * @returns {number}
     */
    getMaxPanY() {
      return cellCount * this.view.zoom - this.window.height;
    },

    getCenterRowCol() {
      const { row, col } = this.xyToRowCol(
        this.window.width / 2,
        this.window.height / 2
      );
      return { row: row - cellCount / 2, col: col - cellCount / 2 };
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
  };

  return gameRenderer;
};

/**
 *
 * @param {number} val
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
const clamp = (val, min, max) => (val > max ? max : val < min ? min : val);

export { createGameRenderer };
