/** @module */

/**
 *
 * @typedef {Object} MouseTracker
 * @property {boolean} onCanvas
 * @property {boolean} downOnCanvas
 * @property {boolean} panning
 * @property {number | null} lastX
 * @property {number | null} lastY
 * @property {function(MouseEvent): void} mouseUp
 * @property {function(MouseEvent): void} mouseDown
 * @property {function(MouseEvent): void} mouseMove
 * @property {function(): void} mouseLeave
 * @property {function(MouseEvent): void} mouseWheel
 * @property {function(): void} recheckPreview
 */

/**
 *
 * @param {import('./gameRenderer').GameRenderer} gameRenderer
 * @param {import('./gameController').GameController} gameController
 * @param {*} patternLibrary
 * @param  {function(boolean): void} observer
 * @returns {MouseTracker}
 */
const createMouseTracker = (
  gameRenderer,
  gameController,
  patternLibrary,
  observer
) => {
  /** @type {MouseTracker} */
  const mouseTracker = {
    onCanvas: false,
    downOnCanvas: false,
    panning: false,
    lastX: null,
    lastY: null,

    /**
     *
     * @param {MouseEvent} e
     */
    mouseUp(e) {
      if (e.button === 0) {
        if (this.onCanvas && this.downOnCanvas) {
          if (patternLibrary.selected)
            gameController.placePattern(
              e.clientX,
              e.clientY,
              patternLibrary.selected,
              this.panning
            );
          else if (!this.panning)
            gameController.toggleCell(e.clientX, e.clientY);
        }

        this.panning = false;
        this.downOnCanvas = false;
        observer(this.panning);
      }
    },

    /**
     *
     * @param {MouseEvent} e
     */
    mouseDown(e) {
      if (e.button === 0 && this.onCanvas) {
        this.downOnCanvas = true;
      }
    },

    /**
     *
     * @param {MouseEvent} e
     */
    mouseMove(e) {
      this.onCanvas = isPointerOverCanvas(e);

      if (this.downOnCanvas && this.lastX && this.lastY) {
        const deltaX = this.lastX - e.clientX;
        const deltaY = this.lastY - e.clientY;

        if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
          this.panning = true;
          observer(this.panning);
        }

        if (this.panning) {
          gameRenderer.setView({
            panX: Math.round(gameRenderer.view.panX + deltaX),
            panY: Math.round(gameRenderer.view.panY + deltaY)
          });
        }
      }

      this.lastX = e.clientX;
      this.lastY = e.clientY;

      if (this.onCanvas && !this.panning && patternLibrary.selected) {
        gameController.placePattern(
          this.lastX,
          this.lastY,
          patternLibrary.selected,
          true
        );
      } else gameController.clearPreview();
    },

    /**
     *
     */
    mouseLeave() {
      this.onCanvas = false;
      gameController.clearPreview();
    },

    /**
     *
     * @param {WheelEvent} e
     */
    mouseWheel(e) {
      if (this.onCanvas) {
        const newZoom =
          gameRenderer.view.zoom +
          Math.ceil(gameRenderer.view.zoom / 25) * Math.sign(e.deltaY);
        gameRenderer.zoomAtPoint(newZoom, e.clientX, e.clientY);
      }
    },

    /**
     *
     */
    recheckPreview() {
      if (this.lastX === null || this.lastY === null) return;

      if (patternLibrary.selected) {
        gameController.placePattern(
          this.lastX,
          this.lastY,
          patternLibrary.selected,
          true
        );
      } else gameController.clearPreview();
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
  return target.id === "cell-canvas" || target.id === "top-bar";
};

export { createMouseTracker };
