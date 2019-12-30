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
 * @property {function(MouseEvent): string} getTargetID
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
      if (this.downOnCanvas) {
        if (this.panning && this.pattern)
          gameController.placePreview(e.clientX, e.clientY, this.pattern);

        if (!this.panning && this.pattern)
          gameController.placeElement(e.clientX, e.clientY, this.pattern);

        if (!this.panning && !this.pattern)
          gameController.toggleCell(e.clientX, e.clientY);
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
      if (this.getTargetID(e) === "cell-canvas") {
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
      if (this.pattern !== null && !this.panning) {
        if (this.getTargetID(e) === "cell-canvas")
          gameController.placePreview(e.clientX, e.clientY, this.pattern);
        else gameController.clearPreview();
      }

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
      if (this.getTargetID(e) !== "cell-canvas") return;

      const { zoom } = gameRenderer.view;
      const newZoom = Math.round(zoom + Math.sign(e.deltaY) * (1 + zoom / 50));
      gameRenderer.zoomAtPoint(newZoom, e.clientX, e.clientY);
    },

    getTargetID(e) {
      /** @type {HTMLElement} */
      const target = (e.target);
      return target.id;
    },

    updateObserver() {
      observer(this.panning, this.pattern ? true : false);
    }
  };

  return mouseTracker;
};

export { createMouseTracker };
