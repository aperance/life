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
 * @property {{cyclesPerRender: number, currentCycle: number, paused: boolean}} speed
 * @property {number} generation
 * @property {boolean} isTerminated
 * @property {{born: Array<number>, died: Array<number>}?} nextResult
 * @property {function(number): void} toggleCell
 * @property {function(number, number, Array<Array<number>>): void} placeElement
 * @property {function(number, number, Array<Array<number>>): void} placePreview
 * @property {function(): void} clearAliveCells
 * @property {function(): void} clearPreview
 * @property {function(): void} play
 * @property {function(): void} pause
 * @property {function(number): void} setSpeed
 * @property {function(): void} terminate
 * @property {function(): void} animationCycle
 * @property {function(MessageEvent): void} handleWorkerMessage
 */

/**
 *  Factory function to create GameController object.
 * @param {Worker} worker
 * @param {import('./gameRenderer.js').GameRenderer} gameRenderer
 * @param {number} cellCount
 * @param {boolean} wasm
 * @param {function(boolean, boolean, number, number, number): void} observer
 * @return {GameController}
 */
const createGameController = (
  worker,
  gameRenderer,
  cellCount,
  wasm,
  observer
) => {
  /** @type {GameController} */
  const gameController = {
    alive: new Set(),
    alivePreview: new Set(),
    playing: false,
    resultBuffer: [],
    resultsRequestedAt: null,
    cellsChanged: true,
    speed: { cyclesPerRender: 6, currentCycle: 1, paused: false },
    generation: 0,
    isTerminated: false,

    /**
     *
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
     * @param {number} index
     */
    toggleCell(index) {
      if (this.playing) return;

      this.alive.has(index) ? this.alive.delete(index) : this.alive.add(index);
      this.cellsChanged = true;
    },

    /**
     *
     * @param {number} row
     * @param {number} col
     * @param {Array<Array<number>>} pattern
     */
    placeElement(row, col, pattern) {
      if (this.playing) return;

      this.alivePreview.clear();

      const startRow = row + 1 - Math.round(pattern.length / 2);
      const startCol = col + 1 - Math.round(pattern[0].length / 2);

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
     * @param {number} row
     * @param {number} col
     * @param {Array<Array<number>>} pattern
     */
    placePreview(row, col, pattern) {
      if (this.playing) return;

      this.alivePreview.clear();

      const startRow = row + 1 - Math.round(pattern.length / 2);
      const startCol = col + 1 - Math.round(pattern[0].length / 2);

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
    clearAliveCells() {
      this.alive.clear();
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
    play() {
      if (this.playing) this.speed.paused = false;
      else {
        console.log("Game started");

        worker.postMessage({
          action: "start",
          payload: {
            size: cellCount,
            initialAlive: Array.from(this.alive),
            wasm
          }
        });
      }
    },

    /**
     *
     * @param {boolean} paused
     */
    pause() {
      this.speed.paused = true;
    },

    /**
     *
     * @param {number} genPerSecond
     */
    setSpeed(genPerSecond) {
      this.speed.cyclesPerRender = 6 / genPerSecond;
    },

    /**
     *
     */
    terminate() {
      worker.terminate();
      this.isTerminated = true;
    },

    /**
     *
     */
    animationCycle() {
      if (this.isTerminated) return;

      let born = null;
      let died = null;

      if (this.playing && !this.speed.paused) {
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

      observer(
        this.playing,
        this.speed.paused,
        this.generation,
        this.alive.size,
        this.speed.cyclesPerRender
      );

      requestAnimationFrame(this.animationCycle.bind(this));
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
    }
  };

  worker.onmessage = gameController.handleWorkerMessage.bind(gameController);
  gameController.animationCycle();

  return gameController;
};

export { createGameController };
