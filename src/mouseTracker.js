/** @module */

/**
 *
 * @typedef {Object} MouseTracker
 * @property {boolean} down
 * @property {boolean} panning
 * @property {Array<Array<number>> | null} pattern
 * @property {number | null} lastX
 * @property {number | null} lastY
 * @property {function(): void} updateObserver
 * @property {function(Array<Array<number>>): void} setPattern
 * @property {function(): void} clearPattern
 * @property {function(MouseEvent): void} canvasEnter
 * @property {function(): void} canvasLeave
 * @property {function(MouseEvent): void} canvasUp
 * @property {function(MouseEvent): void} canvasDown
 * @property {function(MouseEvent): void} canvasMove
 * @property {function(MouseEvent): void} canvasWheel
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
    down: false,
    panning: false,
    lastX: null,
    lastY: null,

    /**
     *
     * @param {*} pattern
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
    canvasEnter(e) {
      if (e.buttons === 0) {
        this.down = false;
        this.panning = false;
      }
    },

    /**
     *
     */
    canvasLeave() {
      if (this.pattern !== null) gameController.clearPreview();
    },

    /**
     *
     * @param {MouseEvent} e
     */
    canvasUp(e) {
      if (!this.panning) {
        if (this.pattern === null)
          gameController.toggleCell(e.clientX, e.clientY);
        else gameController.placeElement(e.clientX, e.clientY, this.pattern);
      }

      if (this.pattern !== null)
        gameController.placePreview(e.clientX, e.clientY, this.pattern);

      this.panning = false;
      this.down = false;
      this.lastX = null;
      this.lastY = null;

      this.updateObserver();
    },

    /**
     *
     * @param {MouseEvent} e
     */
    canvasDown(e) {
      this.down = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    },

    /**
     *
     * @param {MouseEvent} e
     */
    canvasMove(e) {
      if (this.pattern !== null && !this.panning)
        gameController.placePreview(e.clientX, e.clientY, this.pattern);

      if (this.down && this.lastX && this.lastY) {
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
     * @param {WheelEvent} e
     */
    canvasWheel(e) {
      const { zoom } = gameRenderer.view;
      const newZoom = Math.round(zoom + Math.sign(e.deltaY) * (1 + zoom / 50));
      gameRenderer.zoomAtPoint(newZoom, e.clientX, e.clientY);
    },

    updateObserver() {
      observer(this.panning, this.pattern ? true : false);
    }
  };

  return mouseTracker;
};

export { createMouseTracker };
