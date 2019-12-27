/** @module */

/**
 *
 * @typedef {Object} PanControls
 * @property {*} intervalID
 * @property {string?} direction
 * @property {function(string): void} start
 * @property {function(): void} stop
 * @property {function(): void} updateView
 */

/**
 *
 * @param {import('./gameRenderer.js').GameRenderer} gameRenderer
 * @returns {PanControls}
 */
const createPanControls = gameRenderer => {
  /** @type {PanControls} */
  const panControls = {
    intervalID: null,
    direction: null,

    /**
     *
     * @param {string} direction
     */
    start(direction) {
      if (this.intervalID !== null) this.stop();
      this.intervalID = setInterval(this.updateView.bind(this), 10);
      this.direction = direction;
    },

    /**
     *
     */
    stop() {
      clearInterval(this.intervalID);
      this.intervalID = null;
      this.direction = null;
    },

    /**
     *
     */
    updateView() {
      switch (this.direction) {
        case "up":
          gameRenderer.setView({ panY: gameRenderer.view.panY - 2 });
          break;
        case "down":
          gameRenderer.setView({ panY: gameRenderer.view.panY + 2 });
          break;
        case "left":
          gameRenderer.setView({ panX: gameRenderer.view.panX - 2 });
          break;
        case "right":
          gameRenderer.setView({ panX: gameRenderer.view.panX + 2 });
          break;
        default:
          this.stop();
          break;
      }
    }
  };

  return panControls;
};

export { createPanControls };
