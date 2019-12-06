// @ts-check

/** @module */

/**
 *
 * @typedef {Object} MouseTracker
 * @property {boolean} down
 * @property {Array<Array<number>>} draggedShape
 * @property {number} lastX
 * @property {number} lastY
 * @property {string} mode
 * @property {Function} canvasLeave
 * @property {Function} canvasMove
 * @property {Function} canvasUp
 * @property {Function} canvasWheel
 */

/**
 *
 * @param {import('./gameRenderer').GameRenderer} gameRenderer
 * @param {import('./gameController').GameController} gameController
 * @returns {MouseTracker}
 */
const createMouseTracker = (gameRenderer, gameController) => {
  /** @type MouseTracker */
  const mouseTracker = {
    mode: "pan",
    draggedShape: null,
    down: false,
    lastX: null,
    lastY: null,

    /**
     *
     */
    canvasLeave() {
      if (this.mode === "pattern") gameController.clearPreview();
    },

    /**
     *
     * @param {MouseEvent} e
     */
    canvasUp(e) {
      if (this.mode === "edit") gameController.toggleCell(e.offsetX, e.offsetY);
      if (this.mode === "pattern")
        gameController.placeElement(e.offsetX, e.offsetY, this.draggedShape);
    },

    /**
     *
     * @param {MouseEvent} e
     */
    canvasMove(e) {
      if (this.mode === "pattern")
        gameController.placePreview(e.offsetX, e.offsetY, this.draggedShape);

      if (this.mode === "pan") {
        if (e.buttons === 1) {
          gameRenderer.setView({
            panX: Math.round(gameRenderer.view.panX + this.lastX - e.clientX),
            panY: Math.round(gameRenderer.view.panY + this.lastY - e.clientY)
          });
        }

        this.lastX = e.clientX;
        this.lastY = e.clientY;
      }
    },

    /**
     *
     * @param {WheelEvent} e
     */
    canvasWheel(e) {
      const { zoom, panX, panY } = gameRenderer.view;
      const newZoom = Math.round(zoom + Math.sign(e.deltaY) * (1 + zoom / 50));
      gameRenderer.setView({ zoom: newZoom });

      const scale = gameRenderer.view.zoom / zoom - 1;
      const newPanX = Math.round(panX + (panX + e.offsetX) * scale);
      const newPanY = Math.round(panY + (panY + e.offsetY) * scale);
      gameRenderer.setView({ panX: newPanX, panY: newPanY });
    }
  };

  return mouseTracker;
};

export { createMouseTracker };
