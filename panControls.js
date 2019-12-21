/** @module */

/**
 *
 * @typedef {Object} PanControls
 * @property {*} intervalID
 * @property {string | null} direction
 * @property {Function} start
 * @property {Function} stop
 * @property {Function} updateView
 */

/**
 *
 * @param {*} gameRenderer
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
          break;
      }
    }
  };
  return panControls;
};

export { createPanControls };
