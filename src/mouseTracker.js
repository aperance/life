/**
 * @module
 */

/**
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
 * @property {function(): void} forcePreviewCheck
 */

/**
 * Factory function for MouseTracker object.
 * @param {import('./gameRenderer').GameRenderer} gameRenderer
 * @param {import('./gameController').GameController} gameController
 * @param {import('./patternLibrary').PatternLibrary} patternLibrary
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
     * Updates object state and determines cell toggling
     * or pattern placement on mouse up event.
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
     * Updates object state on mouse down event.
     * @param {MouseEvent} e
     */
    mouseDown(e) {
      this.onCanvas = isPointerOverCanvas(e);
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      if (e.button === 0 && this.onCanvas) this.downOnCanvas = true;
    },

    /**
     * Updates object state and determines view panning
     * or pattern preview rendering on mouse move event.
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
     * Updates onCanvas property and clears pattern
     * preview rendering when mouse leaves window.
     */
    mouseLeave() {
      this.onCanvas = false;
      gameController.clearPreview();
    },

    /**
     * Updates game zoom value on mouse wheel event over canvas.
     * @param {WheelEvent} e
     */
    mouseWheel(e) {
      this.onCanvas = isPointerOverCanvas(e);
      if (this.onCanvas) {
        const newZoom =
          gameRenderer.view.zoom +
          Math.ceil(gameRenderer.view.zoom / 25) * Math.sign(e.deltaY);
        gameRenderer.zoomAtPoint(newZoom, e.clientX, e.clientY);
      }
    },

    /**
     * Re-evaluates the selected pattern preview rendering. Called
     * externally if pattern state changes without a new mouse event.
     */
    forcePreviewCheck() {
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
 * Determines if the mouse pointer is directly over the canvas,
 * and not a button or modal, based on the provided event object.
 * @param {WheelEvent | MouseEvent} e
 * @returns {boolean}
 */
const isPointerOverCanvas = e => {
  const target = /** @type {HTMLElement} */ (e.target);
  return target.id === "cell-canvas" || target.id === "top-bar";
};

export { createMouseTracker };
