// @ts-check

/** @module */

/**
 *
 * @typedef {Object} MouseTracker
 * @property {boolean} down
 * @property {boolean} panning
 * @property {boolean} dragging
 * @property {Array<Array<number>>} draggedShape
 * @property {number} lastX
 * @property {number} lastY
 * @property {Function} canvasLeave
 * @property {Function} canvasDown
 * @property {Function} canvasMove
 * @property {Function} canvasUp
 * @property {Function} canvasWheel
 */

/**
 *
 * @param {import('./gameRenderer').GameRenderer} gameRenderer
 * @param {import('./gameController').GameController} gameController
 * @param {HTMLDivElement} container
 * @returns {MouseTracker}
 */
const createMouseTracker = (gameRenderer, gameController, container) => {
  const mouseTracker = {
    down: false,
    panning: false,
    dragging: false,
    draggedShape: null,
    lastX: null,
    lastY: null,

    // /**
    //  *
    //  * @param {MouseEvent} e
    //  */
    // canvasEnter(e) {
    //   if (e.buttons === 1) {
    //     this.down = true;
    //     this.dragging = true;
    //     this.draggedShape = rleToArray(patterns.max);
    //   }
    // },

    /**
     *
     */
    canvasLeave() {
      if (this.dragging) gameController.clearPreview();

      this.down = false;
      this.panning = false;
      this.dragging = false;
      this.draggedShape = null;
      this.lastX = null;
      this.lastY = null;
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
    canvasUp(e) {
      if (this.draggedShape)
        gameController.placeElement(e.offsetX, e.offsetY, this.draggedShape);
      else if (!this.panning) gameController.toggleCell(e.offsetX, e.offsetY);

      this.down = false;
      this.panning = false;
      this.dragging = false;
      this.lastX = null;
      this.lastY = null;
    },

    /**
     *
     * @param {MouseEvent} e
     */
    canvasMove(e) {
      if (this.draggedShape)
        gameController.placePreview(e.offsetX, e.offsetY, this.draggedShape);
      else if (!this.draggedShape && this.down) {
        const movementX = this.lastX - e.clientX;
        const movementY = this.lastY - e.clientY;

        if (
          this.panning ||
          Math.abs(movementX) > 5 ||
          Math.abs(movementY) > 5
        ) {
          const newPanX = Math.round(gameRenderer.view.panX + movementX);
          const newPanY = Math.round(gameRenderer.view.panY + movementY);
          gameRenderer.setView({ panX: newPanX, panY: newPanY });

          this.panning = true;
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
      const { zoom, panX, panY } = gameRenderer.view;
      const newZoom = Math.round(zoom + Math.sign(e.deltaY) * (1 + zoom / 50));
      gameRenderer.setView({ zoom: newZoom });

      const scale = gameRenderer.view.zoom / zoom - 1;
      const newPanX = Math.round(panX + (panX + e.offsetX) * scale);
      const newPanY = Math.round(panY + (panY + e.offsetY) * scale);
      gameRenderer.setView({ panX: newPanX, panY: newPanY });
    }
  };

  // container.onmouseenter = mouseTracker.canvasEnter.bind(mouseTracker);
  container.onmousedown = mouseTracker.canvasDown.bind(mouseTracker);
  container.onmouseleave = mouseTracker.canvasLeave.bind(mouseTracker);
  container.onmousemove = mouseTracker.canvasMove.bind(mouseTracker);
  container.onmouseup = mouseTracker.canvasUp.bind(mouseTracker);

  container.addEventListener(
    "wheel",
    mouseTracker.canvasWheel.bind(mouseTracker),
    {
      passive: true
    }
  );

  return mouseTracker;
};

export { createMouseTracker };
