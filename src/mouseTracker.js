/** @class */
export class MouseTracker {
  onCanvas = false;
  downOnCanvas = false;
  panning = false;
  lastX = null;
  lastY = null;

  /**
   *
   * @param {*} gameRenderer
   * @param {*} gameController
   * @param {*} patternLibrary
   * @param {*} observer
   */
  constructor(gameRenderer, gameController, patternLibrary, observer) {
    this.gameRenderer = gameRenderer;
    this.gameController = gameController;
    this.patternLibrary = patternLibrary;
    this.observer = observer;
  }

  /**
   * Updates object state and determines cell toggling
   * or pattern placement on mouse up event.
   * @param {MouseEvent} e
   */
  mouseUp(e) {
    if (e.button === 0) {
      if (this.onCanvas && this.downOnCanvas) {
        if (this.patternLibrary.selected)
          this.gameController.placePattern(
            e.clientX,
            e.clientY,
            this.patternLibrary.selected,
            this.panning
          );
        else if (!this.panning)
          this.gameController.toggleCell(e.clientX, e.clientY);
      }

      this.panning = false;
      this.downOnCanvas = false;
      this.observer(this.panning);
    }
  }

  /**
   * Updates object state on mouse down event.
   * @param {MouseEvent} e
   */
  mouseDown(e) {
    this.onCanvas = this.isPointerOverCanvas(e);
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    if (e.button === 0 && this.onCanvas) this.downOnCanvas = true;
  }

  /**
   * Updates object state and determines view panning
   * or pattern preview rendering on mouse move event.
   * @param {MouseEvent} e
   */
  mouseMove(e) {
    this.onCanvas = this.isPointerOverCanvas(e);

    if (this.downOnCanvas && this.lastX && this.lastY) {
      const deltaX = this.lastX - e.clientX;
      const deltaY = this.lastY - e.clientY;

      if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
        this.panning = true;
        this.observer(this.panning);
      }

      if (this.panning) {
        this.gameRenderer.setView({
          panX: Math.round(this.gameRenderer.view.panX + deltaX),
          panY: Math.round(this.gameRenderer.view.panY + deltaY)
        });
      }
    }

    this.lastX = e.clientX;
    this.lastY = e.clientY;

    if (this.onCanvas && !this.panning && this.patternLibrary.selected) {
      this.gameController.placePattern(
        this.lastX,
        this.lastY,
        this.patternLibrary.selected,
        true
      );
    } else this.gameController.clearPreview();
  }

  /**
   * Updates onCanvas property and clears pattern
   * preview rendering when mouse leaves window.
   */
  mouseLeave() {
    this.onCanvas = false;
    this.gameController.clearPreview();
  }

  /**
   * Updates game zoom value on mouse wheel event over canvas.
   * @param {WheelEvent} e
   */
  mouseWheel(e) {
    this.onCanvas = this.isPointerOverCanvas(e);
    if (this.onCanvas) {
      const newZoom =
        this.gameRenderer.view.zoom +
        Math.ceil(this.gameRenderer.view.zoom / 25) * Math.sign(e.deltaY);
      this.gameRenderer.zoomAtPoint(newZoom, e.clientX, e.clientY);
    }
  }

  /**
   * Re-evaluates the selected pattern preview rendering. Called
   * externally if pattern state changes without a new mouse event.
   */
  forcePreviewCheck() {
    if (this.lastX === null || this.lastY === null) return;

    if (this.patternLibrary.selected) {
      this.gameController.placePattern(
        this.lastX,
        this.lastY,
        this.patternLibrary.selected,
        true
      );
    } else this.gameController.clearPreview();
  }

  /**
   * Determines if the mouse pointer is directly over the canvas,
   * and not a button or modal, based on the provided event object.
   * @param {WheelEvent | MouseEvent} e
   * @returns {boolean}
   */
  isPointerOverCanvas(e) {
    const target = /** @type {HTMLElement} */ (e.target);
    return target.id === "cell-canvas" || target.id === "top-bar";
  }
}
