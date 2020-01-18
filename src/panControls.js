/** @namespace PanControls */

/** @module panControls */

/**
 * @typedef {Object} PanControls
 * @property {*} intervalID
 * @property {string?} direction
 * @property {function(string): void} start
 * @property {function(): void} stop
 * @property {function(): void} updateView
 * @ignore
 */

import { GameRenderer } from "./gameRenderer";

/**
 * Controls panning of the game view.
 * @param {GameRenderer} gameRenderer
 * @returns {PanControls}
 */
const createPanControls = gameRenderer => {
  /** @type {PanControls} */
  const panControls = {
    /**
     * @memberof PanControls
     * @type {*}
     */
    intervalID: null,

    /**
     * @memberof PanControls
     * @type {string?}
     */
    direction: null,

    /**
     * Starts a timer to gradually pan in the specified direction.
     * @memberof PanControls
     * @param {string} direction
     */
    start(direction) {
      if (this.intervalID !== null) this.stop();
      this.intervalID = setInterval(this.updateView.bind(this), 10);
      this.direction = direction;
    },

    /**
     * Resets state and clears timer to prevent additional panning.
     * @memberof PanControls
     */
    stop() {
      if (this.intervalID) clearInterval(this.intervalID);
      this.intervalID = null;
      this.direction = null;
    },

    /**
     * Updates view position by 2px in the previously specified direction.
     * @memberof PanControls
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
