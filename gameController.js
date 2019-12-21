/** @module */

const batchSize = 25;
const bufferSize = 50;

/**
 *
 * @typedef {Object} GameController
 * @property {Set} alive
 * @property {Set} alivePreview
 * @property {boolean} playing
 * @property {Array<{born: Array<number>, died: Array<number>}>} resultBuffer
 * @property {number | null} resultsRequestedAt
 * @property {boolean} cellsChanged
 * @property {{cyclesPerRender: number, currentCycle: number}} speed
 * @property {{born: Array<number>, died: Array<number>} | null} nextResult
 * @property {Function} handleWorkerMessage
 * @property {Function} setSpeed
 * @property {Function} toggleCell
 * @property {Function} placeElement
 * @property {Function} placePreview
 * @property {Function} clearPreview
 * @property {Function} start
 * @property {Function} animationCycle
 */

/**
 *  Factory function to create GameController object.
 * @param {Worker} worker
 * @param {import('./gameRenderer.js').GameRenderer} gameRenderer
 * @param {number} cellCount
 * @param {boolean} wasm
 * @param {Function} onGameChange
 * @return {GameController}
 */
const createGameController = (
  worker,
  gameRenderer,
  cellCount,
  wasm,
  onGameChange
) => {
  /**@type {GameController} */
  const obj = {
    alive: new Set(),
    alivePreview: new Set(),
    playing: false,
    resultBuffer: [],
    resultsRequestedAt: null,
    cellsChanged: true,
    speed: { cyclesPerRender: 6, currentCycle: 1 },

    /**
     * @returns {{born: Array<number>, died: Array<number>} | null}
     */
    get nextResult() {
      if (!this.playing) return null;

      if (this.resultBuffer.length < bufferSize && !this.resultsRequestedAt) {
        worker.postMessage({
          action: "requestResults",
          payload: { count: batchSize }
        });
        this.resultsRequestedAt = Date.now();
      }

      return this.resultBuffer.shift() || null;
    },

    setSpeed(genPerSecond) {
      this.speed = { cyclesPerRender: 6 / genPerSecond, currentCycle: 1 };
    },

    /**
     *
     * @param {{data: *}} e
     */
    handleWorkerMessage(e) {
      if (e.data === "started") this.playing = true;
      else {
        this.resultBuffer.push(...e.data);

        // @ts-ignore
        const duration = Date.now() - this.resultsRequestedAt;
        const limit = 17 * batchSize * this.speed.cyclesPerRender;

        if (duration > limit) {
          this.speed.cyclesPerRender++;
          console.warn("Reducing speed to " + 60 / this.speed.cyclesPerRender);
        }

        this.resultsRequestedAt = null;
      }
    },

    /**
     *
     * @param {number} x
     * @param {number} y
     */
    toggleCell(x, y) {
      const index = gameRenderer.xyToIndex(x, y);
      if (this.alive.has(index)) this.alive.delete(index);
      else this.alive.add(index);
      this.cellsChanged = true;
    },

    /**
     *
     * @param {number} x
     * @param {number} y
     * @param {Array<Array<number>>} shape
     */
    placeElement(x, y, shape) {
      const { row: startRow, col: startCol } = gameRenderer.xyToRowCol(x, y);

      this.alivePreview.clear();

      shape.forEach((rowData, relativeRow) => {
        rowData.forEach((cellState, relativeCol) => {
          const index =
            cellCount * (startRow + relativeRow) + (startCol + relativeCol);

          if (cellState === 1) this.alive.add(index);
          else this.alive.delete(index);
        });
      });

      this.cellsChanged = true;
    },

    /**
     *
     * @param {number} x
     * @param {number} y
     * @param {Array<Array<number>>} shape
     */
    placePreview(x, y, shape) {
      const { row: startRow, col: startCol } = gameRenderer.xyToRowCol(x, y);

      this.alivePreview.clear();

      shape.forEach((rowData, relativeRow) => {
        rowData.forEach((cellState, relativeCol) => {
          const index =
            cellCount * (startRow + relativeRow) + (startCol + relativeCol);

          if (cellState === 1) this.alivePreview.add(index);
        });
      });

      this.cellsChanged = true;
    },

    /**
     *
     */
    clearPreview() {
      this.alivePreview.clear();
      this.cellsChanged = true;
    },

    /**
     *
     */
    start() {
      console.log("Game started");

      worker.postMessage({
        action: "start",
        payload: {
          size: cellCount,
          initialAlive: Array.from(this.alive),
          wasm
        }
      });
    },

    /**
     *
     */
    animationCycle() {
      let born, died;

      if (this.playing) {
        if (this.speed.currentCycle < this.speed.cyclesPerRender) {
          this.speed.currentCycle++;
        } else {
          this.speed.currentCycle = 1;
          const result = this.nextResult;
          if (result) {
            ({ born, died } = result);
            for (let cellIndex of born) this.alive.add(cellIndex);
            for (let cellIndex of died) this.alive.delete(cellIndex);
            this.cellsChanged = true;
          }
        }
      }

      gameRenderer.render(
        Array.from(this.alive),
        born,
        died,
        Array.from(this.alivePreview),
        this.cellsChanged
      );

      this.cellsChanged = false;

      onGameChange({
        generation: 0,
        playing: this.playing,
        speed: this.speed.cyclesPerRender
      });

      requestAnimationFrame(this.animationCycle.bind(this));
    }
  };

  worker.onmessage = obj.handleWorkerMessage.bind(obj);
  obj.animationCycle();

  return obj;
};

export { createGameController };
