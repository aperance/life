/**
 * Controls panning of the game view.
 * @class
 */
export class PanControls {
  /** @type {NodeJS.Timeout?} */
  intervalID = null;
  /** @type {string?} */
  direction = null;
  /** @type {*} */
  gameRenderer;

  /**
   * @param {*} gameRenderer
   */
  constructor(gameRenderer) {
    this.gameRenderer = gameRenderer;
  }

  /**
   * Starts a timer to gradually pan in the specified direction.
   * @param {string} direction
   */
  start(direction) {
    if (this.intervalID !== null) this.stop();
    this.intervalID = setInterval(this.updateView.bind(this), 10);
    this.direction = direction;
  }

  /**
   * Resets state and clears timer to prevent additional panning.
   */
  stop() {
    if (this.intervalID) clearInterval(this.intervalID);
    this.intervalID = null;
    this.direction = null;
  }

  /**
   * Updates view position by 2px in the previously specified direction.
   */
  updateView() {
    switch (this.direction) {
      case "up":
        this.gameRenderer.setView({ panY: this.gameRenderer.view.panY - 2 });
        break;
      case "down":
        this.gameRenderer.setView({ panY: this.gameRenderer.view.panY + 2 });
        break;
      case "left":
        this.gameRenderer.setView({ panX: this.gameRenderer.view.panX - 2 });
        break;
      case "right":
        this.gameRenderer.setView({ panX: this.gameRenderer.view.panX + 2 });
        break;
      default:
        this.stop();
        break;
    }
  }
}
