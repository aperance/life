/** @namespace PanControls */

/**
 * Exports a factory function used to create a PanControls object.
 * @module panControls
 */

/**
 * @typedef {Object} PanControls
 * @property {*} intervalID
 * @property {string?} direction
 * @property {function(string): void} start
 * @property {function(): void} stop
 * @property {function(): void} updateView
 * @ignore
 */

import { ViewController } from "./viewController";

/**
 * Factory function to create PanControls object with dependencies injected.
 * @param {ViewController} viewController
 * @returns {PanControls}
 */
const createPanControls = viewController => {
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
          viewController.setView({ panY: viewController.view.panY - 2 });
          break;
        case "down":
          viewController.setView({ panY: viewController.view.panY + 2 });
          break;
        case "left":
          viewController.setView({ panX: viewController.view.panX - 2 });
          break;
        case "right":
          viewController.setView({ panX: viewController.view.panX + 2 });
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
