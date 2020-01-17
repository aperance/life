/**
 * @module
 */

/**
 * @typedef {Object} MouseTracker
 * @property {boolean} downOnCanvas
 * @property {boolean} panning
 * @property {number | null} lastX
 * @property {number | null} lastY
 * @property {function(MouseEvent, boolean, boolean): void} mouseUp
 * @property {function(MouseEvent, boolean): void} mouseDown
 * @property {function(MouseEvent, boolean, boolean): void} mouseMove
 * @property {function(): void} mouseLeave
 * @property {function(MouseEvent, boolean): void} mouseWheel
 * @property {function(boolean): void} forcePreviewCheck
 */

/**
 * Factory function for MouseTracker object.
 * @param {import('./gameRenderer').GameRenderer} gameRenderer
 * @param {import('./gameController').GameController} gameController
 * @param  {function(boolean): void} observer
 * @returns {MouseTracker}
 */
const createMouseTracker = (gameRenderer, gameController, observer) => {
  /** @type {MouseTracker} */
  const mouseTracker = {
    downOnCanvas: false,
    panning: false,
    lastX: null,
    lastY: null,

    /**
     * Updates object state and determines cell toggling
     * or pattern placement on mouse up event.
     * @param {MouseEvent} e
     * @param {boolean} isOnCanvas
     * @param {boolean} isPatternSelected
     */
    mouseUp(e, isOnCanvas, isPatternSelected) {
      if (e.button !== 0) return;

      if (isOnCanvas && this.downOnCanvas) {
        if (this.panning) {
          // When panning is ending, restore preview if pattern is selected.
          if (isPatternSelected)
            gameController.placePattern(e.clientX, e.clientY, true);
        } else {
          // When not panning, place pattern if selected, otherwise toggle cell.
          if (isPatternSelected)
            gameController.placePattern(e.clientX, e.clientY, false);
          else gameController.toggleCell(e.clientX, e.clientY);
        }
      }

      this.panning = false;
      this.downOnCanvas = false;
      observer(this.panning);
    },

    /**
     * Updates object state on mouse down event.
     * @param {MouseEvent} e
     * @param {boolean} isOnCanvas
     */
    mouseDown(e, isOnCanvas) {
      if (e.button !== 0) return;

      if (isOnCanvas) this.downOnCanvas = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    },

    /**
     * Updates object state and determines view panning
     * or pattern preview rendering on mouse move event.
     * @param {MouseEvent} e
     * @param {boolean} isOnCanvas
     * @param {boolean} isPatternSelected
     */
    mouseMove(e, isOnCanvas, isPatternSelected) {
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

      if (isOnCanvas && !this.panning && isPatternSelected) {
        gameController.placePattern(e.clientX, e.clientY, true);
      } else gameController.clearPreview();
    },

    /**
     * Updates onCanvas property and clears pattern
     * preview rendering when mouse leaves window.
     */
    mouseLeave() {
      gameController.clearPreview();
    },

    /**
     * Updates game zoom value on mouse wheel event over canvas.
     * @param {WheelEvent} e
     * @param {boolean} isOnCanvas
     */
    mouseWheel(e, isOnCanvas) {
      if (isOnCanvas) {
        const newZoom =
          gameRenderer.view.zoom +
          Math.ceil(gameRenderer.view.zoom / 25) * Math.sign(e.deltaY);
        gameRenderer.zoomAtPoint(newZoom, e.clientX, e.clientY);
      }
    },

    /**
     * Re-evaluates the selected pattern preview rendering. Called
     * externally if pattern state changes without a new mouse event.
     * @param {boolean} isPatternSelected
     */
    forcePreviewCheck(isPatternSelected) {
      if (this.lastX === null || this.lastY === null) return;

      if (isPatternSelected) {
        gameController.placePattern(this.lastX, this.lastY, true);
      } else gameController.clearPreview();
    }
  };

  return mouseTracker;
};

export { createMouseTracker };
