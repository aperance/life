// @ts-check

/** @module */

import { patterns, rleToArray } from "./patterns";

/**
 *
 * @typedef {Object} MouseTracker
 * @property {boolean} down
 * @property {boolean} panning
 * @property {boolean} dragging
 * @property {Array<Array<number>>} draggedShape
 * @property {number} lastX
 * @property {number} lastY
 * @property {Function} canvasEnter
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
 * @returns {MouseTracker}
 */
const createMouseTracker = (gameRenderer, gameController) => ({
  down: false,
  panning: false,
  dragging: false,
  draggedShape: null,
  lastX: null,
  lastY: null,

  /**
   *
   * @param {MouseEvent} e
   */
  canvasEnter(e) {
    if (e.buttons === 1) {
      this.down = true;
      this.dragging = true;
      this.draggedShape = rleToArray(patterns.max);
    }
  },

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
    if (!this.panning) {
      if (this.dragging)
        gameController.placeElement(e.offsetX, e.offsetY, this.draggedShape);
      else gameController.toggleCell(e.offsetX, e.offsetY);
    }

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
  canvasMove(e) {
    if (!this.down) return;

    if (this.dragging)
      gameController.placePreview(e.offsetX, e.offsetY, this.draggedShape);
    else {
      const movementX = this.lastX - e.clientX;
      const movementY = this.lastY - e.clientY;

      if (this.panning || Math.abs(movementX) > 5 || Math.abs(movementY) > 5) {
        gameRenderer.setView({
          panX: Math.round(gameRenderer.view.panX + movementX),
          panY: Math.round(gameRenderer.view.panY + movementY)
        });
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
    gameRenderer.setView({
      zoom: Math.round(zoom + Math.sign(e.deltaY) * (1 + zoom / 50))
    });

    const scale = gameRenderer.view.zoom / zoom - 1;
    gameRenderer.setView({
      panX: Math.round(panX + (panX + e.offsetX) * scale),
      panY: Math.round(panY + (panY + e.offsetY) * scale)
    });
  }
});

export { createMouseTracker };
