/** @module */

/**
 *
 * @typedef {Object} MouseTracker
 * @property {boolean} down
 * @property {boolean} panning
 * @property {Array<Array<number>> | null} draggedShape
 * @property {number | null} lastX
 * @property {number | null} lastY
 * @property {Function} setPattern
 * @property {Function} clearPattern
 * @property {Function} canvasLeave
 * @property {Function} canvasEnter
 * @property {Function} canvasMove
 * @property {Function} canvasUp
 * @property {Function} canvasDown
 * @property {Function} canvasWheel
 */

/**
 *
 * @param {import('./gameRenderer').GameRenderer} gameRenderer
 * @param {import('./gameController').GameController} gameController
 * @param  {Function} onChange
 * @returns {MouseTracker}
 */
const createMouseTracker = (gameRenderer, gameController, onChange) => {
  /** @type MouseTracker */
  const mouseTracker = {
    draggedShape: null,
    down: false,
    panning: false,
    lastX: null,
    lastY: null,

    setPattern(pattern) {
      this.draggedShape = pattern;
      onChange({
        panning: this.panning,
        pattern: this.draggedShape ? true : false
      });
    },

    clearPattern() {
      this.draggedShape = null;
      onChange({
        panning: this.panning,
        pattern: this.draggedShape ? true : false
      });
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
      if (this.draggedShape !== null) gameController.clearPreview();
    },

    /**
     *
     * @param {MouseEvent} e
     */
    canvasUp(e) {
      if (!this.panning) {
        if (this.draggedShape === null)
          gameController.toggleCell(e.clientX, e.clientY);
        else
          gameController.placeElement(e.clientX, e.clientY, this.draggedShape);
      }

      if (this.draggedShape !== null)
        gameController.placePreview(e.clientX, e.clientY, this.draggedShape);

      this.panning = false;
      this.down = false;
      this.lastX = null;
      this.lastY = null;

      onChange({
        panning: this.panning,
        pattern: this.draggedShape ? true : false
      });
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
      if (this.draggedShape !== null && !this.panning)
        gameController.placePreview(e.clientX, e.clientY, this.draggedShape);

      if (this.down && this.lastX && this.lastY) {
        const deltaX = this.lastX - e.clientX;
        const deltaY = this.lastY - e.clientY;

        if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
          if (this.draggedShape !== null) gameController.clearPreview();
          this.panning = true;
          onChange({
            panning: this.panning,
            pattern: this.draggedShape ? true : false
          });
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
    }
  };

  return mouseTracker;
};

export { createMouseTracker };
