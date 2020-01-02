/** @module */

/**
 *
 * @typedef {Object} MouseTracker
 * @property {boolean} downOnCanvas
 * @property {boolean} panning
 * @property {Array<Array<number>> | null} pattern
 * @property {number | null} lastX
 * @property {number | null} lastY
 * @property {function(Array<Array<number>>): void} setPattern
 * @property {function(): void} clearPattern
 * @property {function(MouseEvent): void} mouseUp
 * @property {function(MouseEvent): void} mouseDown
 * @property {function(MouseEvent): void} mouseMove
 * @property {function(): void} mouseLeave
 * @property {function(MouseEvent): void} mouseWheel
 * @property {function(): void} updateObserver
 */

/**
 *
 * @param {import('./gameRenderer').GameRenderer} gameRenderer
 * @param {import('./gameController').GameController} gameController
 * @param  {function(boolean, boolean): void} observer
 * @returns {MouseTracker}
 */
const createMouseTracker = (gameRenderer, gameController, observer) => {
  /** @type {MouseTracker} */
  const mouseTracker = {
    pattern: null,
    downOnCanvas: false,
    panning: false,
    lastX: null,
    lastY: null,

    /**
     *
     * @param {Array<Array<number>>} pattern
     */
    setPattern(pattern) {
      this.pattern = pattern;
      this.updateObserver();
    },

    /**
     *
     */
    clearPattern() {
      this.pattern = null;
      this.updateObserver();
    },

    /**
     *
     * @param {MouseEvent} e
     */
    mouseUp(e) {
      if (isPointerOverCanvas(e) && this.downOnCanvas) {
        if (this.pattern) {
          const { row, col } = gameRenderer.xyToRowCol(e.clientX, e.clientY);
          if (this.panning) gameController.placePreview(row, col, this.pattern);
          else gameController.placeElement(row, col, this.pattern);
        }

        if (!this.pattern && !this.panning) {
          const index = gameRenderer.xyToIndex(e.clientX, e.clientY);
          gameController.toggleCell(index);
        }
      }

      this.panning = false;
      this.downOnCanvas = false;
      this.lastX = null;
      this.lastY = null;

      this.updateObserver();
    },

    /**
     *
     * @param {MouseEvent} e
     */
    mouseDown(e) {
      if (isPointerOverCanvas(e)) {
        this.downOnCanvas = true;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
      }
    },

    /**
     *
     * @param {MouseEvent} e
     */
    mouseMove(e) {
      if (this.downOnCanvas && this.lastX && this.lastY) {
        const deltaX = this.lastX - e.clientX;
        const deltaY = this.lastY - e.clientY;

        if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
          if (this.pattern !== null) gameController.clearPreview();
          this.panning = true;
          this.updateObserver();
        }

        if (this.panning) {
          gameRenderer.setView({
            panX: Math.round(gameRenderer.view.panX + deltaX),
            panY: Math.round(gameRenderer.view.panY + deltaY)
          });

          this.lastX = e.clientX;
          this.lastY = e.clientY;
        }
      }

      if (this.pattern && !this.panning) {
        if (isPointerOverCanvas(e)) {
          const { row, col } = gameRenderer.xyToRowCol(e.clientX, e.clientY);
          gameController.placePreview(row, col, this.pattern);
        } else gameController.clearPreview();
      }
    },

    /**
     *
     */
    mouseLeave() {
      gameController.clearPreview();
    },

    /**
     *
     * @param {WheelEvent} e
     */
    mouseWheel(e) {
      if (isPointerOverCanvas(e)) {
        const newZoom =
          gameRenderer.view.zoom +
          Math.ceil(gameRenderer.view.zoom / 25) * Math.sign(e.deltaY);
        gameRenderer.zoomAtPoint(newZoom, e.clientX, e.clientY);
      }
    },

    /**
     *
     */
    updateObserver() {
      observer(this.panning, this.pattern ? true : false);
    }
  };

  return mouseTracker;
};

/**
 *
 * @param {WheelEvent | MouseEvent} e
 * @returns {boolean}
 */
const isPointerOverCanvas = e => {
  /** @type {HTMLElement} */
  const target = (e.target);
  return target.tagName === "CANVAS";
};

export { createMouseTracker };
