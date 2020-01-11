/** @module */

/**
 *
 * @typedef {Object} MouseTracker
 * @property {boolean} downOnCanvas
 * @property {boolean} panning
 * @property {Array<Array<number>> | null} pattern
 * @property {number | null} lastX
 * @property {number | null} lastY
 * @property {function(MouseEvent, Array<Array<number>>): void} setPattern
 * @property {function(): void} clearPattern
 * @property {function(MouseEvent): void} mouseUp
 * @property {function(MouseEvent): void} mouseDown
 * @property {function(MouseEvent): void} mouseMove
 * @property {function(): void} mouseLeave
 * @property {function(MouseEvent): void} mouseWheel
 * @property {function(): void} updateObserver
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
    downOnCanvas: false,
    panning: false,
    lastX: null,
    lastY: null,

    /**
     *
     * @param {MouseEvent} e
     * @param {Array<Array<number>>} pattern
     */
    setPattern(e, pattern) {
      this.pattern = pattern;
      gameController.placePattern(e.clientX, e.clientY, this.pattern, true);
      this.updateObserver();
    },

    /**
     *
     */
    clearPattern() {
      this.pattern = null;
      gameController.clearPreview();
      this.updateObserver();
    },

    /**
     *
     * @param {MouseEvent} e
     */
    mouseUp(e) {
      if (e.button === 0) {
        if (isPointerOverCanvas(e) && this.downOnCanvas) {
          if (this.pattern)
            gameController.placePattern(
              e.clientX,
              e.clientY,
              this.pattern,
              this.panning
            );
          else if (!this.panning)
            gameController.toggleCell(e.clientX, e.clientY);
        }

        this.panning = false;
        this.downOnCanvas = false;
        this.lastX = null;
        this.lastY = null;
      }
      // else if (e.button === 2 && this.pattern) {
      //   // for (let i = 0; i < this.pattern.length; i++) {
      //   //   this.pattern[i].reverse();
      //   // }

      //   this.pattern = rotate(this.pattern);
      // }

      this.updateObserver();
    },

    /**
     *
     * @param {MouseEvent} e
     */
    mouseDown(e) {
      if (e.button === 0 && isPointerOverCanvas(e)) {
        this.downOnCanvas = true;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
      }
    },

    /**
     *
     * @param {MouseEvent} e
     */
    mouseMove(e) {
      if (this.downOnCanvas && this.lastX && this.lastY) {
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

      if (this.pattern && !this.panning) {
        if (isPointerOverCanvas(e))
          gameController.placePattern(e.clientX, e.clientY, this.pattern, true);
        else gameController.clearPreview();
      }
    },

    /**
     *
     */
    mouseLeave() {
      gameController.clearPreview();
    },

    /**
     *
     * @param {WheelEvent} e
     */
    mouseWheel(e) {
      if (isPointerOverCanvas(e)) {
        const newZoom =
          gameRenderer.view.zoom +
          Math.ceil(gameRenderer.view.zoom / 25) * Math.sign(e.deltaY);
        gameRenderer.zoomAtPoint(newZoom, e.clientX, e.clientY);
      }
    },

    /**
     *
     */
    updateObserver() {
      observer(this.panning, this.pattern ? true : false);
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
  return target.tagName === "CANVAS";
};

const rotate = oldArray => {
  const width = oldArray.length;
  const height = oldArray[0].length;

  let newArray = new Array(height);

  for (let row = 1; row <= height; row++) {
    newArray[row] = new Array(width);

    for (let col = 1; col <= width; col++) {
      newArray[row][col] = oldArray[width - col][row];
    }
  }

  return newArray;
};

export { createMouseTracker };
