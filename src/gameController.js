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
 * @property {number?} resultsRequestedAt
 * @property {boolean} cellsChanged
 * @property {{cyclesPerRender: number, currentCycle: number}} speed
 * @property {number} generation
 * @property {{born: Array<number>, died: Array<number>}?} nextResult
 * @property {function(MessageEvent): void} handleWorkerMessage
 * @property {function(number): void} setSpeed
 * @property {function(number): void} toggleCell
 * @property {function(number, number, Array<Array<number>>): void} placeElement
 * @property {function(number, number, Array<Array<number>>): void} placePreview
 * @property {function(): void} clearPreview
 * @property {function(): void} start
 * @property {function(): void} animationCycle
 */

/**
 *  Factory function to create GameController object.
 * @param {Worker} worker
 * @param {import('./gameRenderer.js').GameRenderer} gameRenderer
 * @param {number} cellCount
 * @param {boolean} wasm
 * @param {function(boolean, number, number, number): void} onGameChange
 * @return {GameController}
 */
const createGameController = (
  worker,
  gameRenderer,
  cellCount,
  wasm,
  onGameChange
) => {
  /** @type {GameController} */
  const gameController = {
    alive: new Set(),
    alivePreview: new Set(),
    playing: false,
    resultBuffer: [],
    resultsRequestedAt: null,
    cellsChanged: true,
    speed: { cyclesPerRender: 6, currentCycle: 1 },
    generation: 0,

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

    /**
     *
     * @param {MessageEvent} e
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
     * @param {number} genPerSecond
     */
    setSpeed(genPerSecond) {
      this.speed = { cyclesPerRender: 6 / genPerSecond, currentCycle: 1 };
    },

    /**
     *
     * @param {number} index
     */
    toggleCell(index) {
      if (this.playing) return;

      this.alive.has(index) ? this.alive.delete(index) : this.alive.add(index);
      this.cellsChanged = true;
    },

    /**
     *
     * @param {number} startRow
     * @param {number} startCol
     * @param {Array<Array<number>>} pattern
     */
    placeElement(startRow, startCol, pattern) {
      if (this.playing) return;

      this.alivePreview.clear();

      pattern.forEach((rowData, relativeRow) => {
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
     * @param {number} startRow
     * @param {number} startCol
     * @param {Array<Array<number>>} pattern
     */
    placePreview(startRow, startCol, pattern) {
      if (this.playing) return;

      this.alivePreview.clear();

      pattern.forEach((rowData, relativeRow) => {
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
      if (this.playing) return;

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
      let born = null;
      let died = null;

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
            this.generation++;
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

      onGameChange(
        this.playing,
        this.generation,
        this.alive.size,
        this.speed.cyclesPerRender
      );

      requestAnimationFrame(this.animationCycle.bind(this));
    }
  };

  worker.onmessage = gameController.handleWorkerMessage.bind(gameController);
  gameController.animationCycle();

  return gameController;
};

export { createGameController };
