/** @namespace MouseTracker */

/**
 * Exports a factory function used to create a MouseTracker object.
 * @module mouseTracker
 */

/**
 * @typedef {Object} MouseTracker
 * @property {boolean} isMouseDownOnCanvas
 * @property {boolean} isPanning
 * @property {number | null} lastX
 * @property {number | null} lastY
 * @property {function(MouseEvent, boolean, boolean): void} mouseUp
 * @property {function(MouseEvent, boolean): void} mouseDown
 * @property {function(MouseEvent, boolean, boolean): void} mouseMove
 * @property {function(): void} mouseLeave
 * @property {function(MouseEvent, boolean): void} mouseWheel
 * @property {function(boolean): void} forcePreviewCheck
 * @ignore
 */

import { ViewController } from "./viewController";
import { GameController } from "./gameController";

/**
 * Factory function to create MouseController object with dependencies injected.
 * @param {ViewController} viewController
 * @param {GameController} gameController
 * @param  {function(boolean): void} observer
 * @returns {MouseTracker}
 */
const createMouseTracker = (viewController, gameController, observer) => {
  /** @type {MouseTracker} */
  const mouseTracker = {
    /**
     * True if mouse button is down and mouse down event occured over the canvas, false otherwise.
     * @memberof MouseTracker#
     * @type {boolean}
     */
    isMouseDownOnCanvas: false,

    /**
     * True if currently panning the game area on mouse movement, false otherwise.
     * @memberof MouseTracker#
     * @type {boolean}
     */
    isPanning: false,

    /**
     * The most recent clientX value received, null if no value yet received.
     * @memberof MouseTracker#
     * @type {number?}
     */
    lastX: null,

    /**
     * The most recent clientY value received, null if no value yet received.
     * @memberof MouseTracker#
     * @type {number?}
     */
    lastY: null,

    /**
     * Updates object state and determines cell toggling
     * or pattern placement on mouse up event.
     * @memberof MouseTracker#
     * @param {MouseEvent} e - Event object received from the event listener.
     * @param {boolean} isOnCanvas - True if the mouse event occured over the canvas element.
     * @param {boolean} isPatternSelected - True if there is currently a pattern selected from the pattern library.
     */
    mouseUp(e, isOnCanvas, isPatternSelected) {
      if (e.button !== 0) return;

      if (isOnCanvas && this.isMouseDownOnCanvas) {
        if (this.isPanning) {
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

      this.isPanning = false;
      this.isMouseDownOnCanvas = false;
      observer(this.isPanning);
    },

    /**
     * Updates object state on mouse down event.
     * @memberof MouseTracker#
     * @param {MouseEvent} e - Event object received from the event listener.
     * @param {boolean} isOnCanvas - True if the mouse event occured over the canvas element.
     */
    mouseDown(e, isOnCanvas) {
      if (e.button !== 0) return;

      if (isOnCanvas) this.isMouseDownOnCanvas = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    },

    /**
     * Updates object state and determines view panning
     * or pattern preview rendering on mouse move event.
     * @memberof MouseTracker#
     * @param {MouseEvent} e - Event object received from the event listener.
     * @param {boolean} isOnCanvas - True if the mouse event occured over the canvas element.
     * @param {boolean} isPatternSelected - True if there is currently a pattern selected from the pattern library.
     */
    mouseMove(e, isOnCanvas, isPatternSelected) {
      if (this.isMouseDownOnCanvas && this.lastX && this.lastY) {
        const deltaX = this.lastX - e.clientX;
        const deltaY = this.lastY - e.clientY;

        if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
          this.isPanning = true;
          observer(this.isPanning);
        }

        if (this.isPanning) {
          viewController.setView({
            panX: Math.round(viewController.view.panX + deltaX),
            panY: Math.round(viewController.view.panY + deltaY)
          });
        }
      }

      this.lastX = e.clientX;
      this.lastY = e.clientY;

      if (isOnCanvas && !this.isPanning && isPatternSelected) {
        gameController.placePattern(e.clientX, e.clientY, true);
      } else gameController.clearPreview();
    },

    /**
     * Updates onCanvas property and clears pattern
     * preview rendering when mouse leaves window.
     * @memberof MouseTracker#
     */
    mouseLeave() {
      gameController.clearPreview();
    },

    /**
     * Updates game zoom value on mouse wheel event over canvas.
     * @memberof MouseTracker#
     * @param {WheelEvent} e - Event object received from the event listener.
     * @param {boolean} isOnCanvas - True if the mouse event occured over the canvas element.
     */
    mouseWheel(e, isOnCanvas) {
      if (isOnCanvas) {
        const newZoom =
          viewController.view.zoom +
          Math.ceil(viewController.view.zoom / 25) * Math.sign(e.deltaY);
        viewController.zoomAtPoint(newZoom, e.clientX, e.clientY);
      }
    },

    /**
     * Re-evaluates the selected pattern preview rendering. Called
     * externally if pattern state changes without a new mouse event.
     * @memberof MouseTracker#
     * @param {boolean} isPatternSelected - True if there is currently a pattern selected from the pattern library.
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
