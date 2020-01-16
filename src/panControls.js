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
 * Controls panning of the game view.
 * @param {import('./gameRenderer.js').GameRenderer} gameRenderer
 * @returns {PanControls}
 */
const createPanControls = gameRenderer => {
  /** @type {PanControls} */
  const panControls = {
    intervalID: null,
    direction: null,

    /**
     * Starts a timer to gradually pan in the specified direction.
     * @param {string} direction
     */
    start(direction) {
      if (this.intervalID !== null) this.stop();
      this.intervalID = setInterval(this.updateView.bind(this), 10);
      this.direction = direction;
    },

    /**
     * Resets state and clears timer to prevent additional panning.
     */
    stop() {
      if (this.intervalID) clearInterval(this.intervalID);
      this.intervalID = null;
      this.direction = null;
    },

    /**
     * Updates view position by 2px in the previously specified direction.
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
