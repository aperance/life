/** @namespace GameController */

/** @module gameController */

/**
 * @typedef {Object} GameController
 * @property {Set} aliveCells
 * @property {Set} alivePreview
 * @property {boolean} isGameStarted
 * @property {boolean} isGamePaused
 * @property {Array<{born: Array<number>, died: Array<number>}>} resultBuffer
 * @property {number?} resultsRequestedAt
 * @property {boolean} didCellsChange
 * @property {{cyclesPerRender: number, currentCycle: number}} speed
 * @property {number} generation
 * @property {boolean} haltAnimationCycle
 * @property {{born: Array<number>, died: Array<number>}?} nextResult
 * @property {function(number, number): void} toggleCell
 * @property {function(number, number, boolean): void} placePattern
 * @property {function(): void} clearAliveCells
 * @property {function(): void} clearPreview
 * @property {function(): void} play
 * @property {function(): void} pause
 * @property {function(number): void} setSpeed
 * @property {function(): void} terminate
 * @property {function(): void} animationCycle
 * @property {function(MessageEvent): void} handleWorkerMessage
 * @ignore
 */

import { ViewController } from "./viewController";
import { PatternLibrary } from "./patternLibrary";

const batchSize = 25;
const bufferSize = 50;

/**
 *  Factory function to create GameController object with dependencies injected.
 * @param {Worker} worker
 * @param {ViewController} viewController
 * @param {PatternLibrary} patternLibrary
 * @param {number} cellCount
 * @param {boolean} wasm
 * @param {function(boolean, boolean, number, number, number): void} observer
 * @return {GameController}
 */
const createGameController = (
  worker,
  viewController,
  patternLibrary,
  cellCount,
  wasm,
  observer
) => {
  /** @type {GameController} */
  const gameController = {
    /**
     * @memberof GameController
     * @type {Set}
     */
    aliveCells: new Set(),

    /**
     * @memberof GameController
     * @type {Set}
     */
    alivePreview: new Set(),

    /**
     * @memberof GameController
     * @type {boolean}
     */
    isGameStarted: false,

    /**
     * @memberof GameController
     * @type {boolean}
     */
    isGamePaused: false,

    /**
     * @memberof GameController
     * @type {Array<{born: Array<number>, died: Array<number>}>}
     */
    resultBuffer: [],

    /**
     * @memberof GameController
     * @type {number?}
     */
    resultsRequestedAt: null,

    /**
     * @memberof GameController
     * @type {boolean}
     */
    didCellsChange: true,

    /**
     * @memberof GameController
     * @type {{cyclesPerRender: number, currentCycle: number}}
     */
    speed: { cyclesPerRender: 6, currentCycle: 1 },

    /**
     * @memberof GameController
     * @type {number}
     */
    generation: 0,

    /**
     * @memberof GameController
     * @type {boolean}
     */
    haltAnimationCycle: false,

    /**
     *
     * @memberof GameController
     * @type {{born: Array<number>, died: Array<number>}?}
     */
    get nextResult() {
      if (!this.isGameStarted) return null;

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
     * @memberof GameController
     * @param {number} x
     * @param {number} y
     */
    toggleCell(x, y) {
      if (this.isGameStarted) return;

      const { index } = viewController.xyToRowColIndex(x, y);

      this.aliveCells.has(index)
        ? this.aliveCells.delete(index)
        : this.aliveCells.add(index);
      this.didCellsChange = true;
    },

    /**
     *
     * @memberof GameController
     * @param {number} x
     * @param {number} y
     * @param {boolean} isPreview
     */
    placePattern(x, y, isPreview) {
      if (this.isGameStarted) return;

      /** @type {number[][]?} */
      const pattern = patternLibrary.selected;

      if (!pattern) return;

      this.alivePreview.clear();

      const { row, col } = viewController.xyToRowColIndex(x, y);
      const startRow = row + 1 - Math.round(pattern.length / 2);
      const startCol = col + 1 - Math.round(pattern[0].length / 2);

      pattern.forEach((rowData, relativeRow) => {
        rowData.forEach((cellState, relativeCol) => {
          const index =
            cellCount * (startRow + relativeRow) + (startCol + relativeCol);

          if (isPreview) {
            if (cellState === 1) this.alivePreview.add(index);
          } else {
            if (cellState === 1) this.aliveCells.add(index);
            else this.aliveCells.delete(index);
          }
        });
      });

      this.didCellsChange = true;
    },

    /**
     *
     * @memberof GameController
     */
    clearAliveCells() {
      this.aliveCells.clear();
      this.didCellsChange = true;
    },

    /**
     *
     * @memberof GameController
     */
    clearPreview() {
      this.alivePreview.clear();
      this.didCellsChange = true;
    },

    /**
     *
     * @memberof GameController
     */
    play() {
      if (this.isGameStarted) this.isGamePaused = false;
      else {
        console.log("Game started");

        worker.postMessage({
          action: "start",
          payload: {
            size: cellCount,
            initialAlive: Array.from(this.aliveCells),
            wasm: wasm
          }
        });
      }
    },

    /**
     *
     * @memberof GameController
     */
    pause() {
      this.isGamePaused = true;
    },

    /**
     *
     * @memberof GameController
     * @param {number} genPerSecond
     */
    setSpeed(genPerSecond) {
      this.speed.cyclesPerRender = 6 / genPerSecond;
    },

    /**
     *
     * @memberof GameController
     */
    terminate() {
      worker.terminate();
      this.haltAnimationCycle = true;
    },

    /**
     *
     * @memberof GameController
     */
    animationCycle() {
      if (this.haltAnimationCycle) return;

      let born = null;
      let died = null;

      if (this.isGameStarted && !this.isGamePaused) {
        if (this.speed.currentCycle < this.speed.cyclesPerRender) {
          this.speed.currentCycle++;
        } else {
          this.speed.currentCycle = 1;
          const result = this.nextResult;
          if (result) {
            ({ born, died } = result);
            for (let cellIndex of born) this.aliveCells.add(cellIndex);
            for (let cellIndex of died) this.aliveCells.delete(cellIndex);
            this.didCellsChange = true;
            this.generation++;
          }
        }
      }

      viewController.render(
        Array.from(this.aliveCells),
        born,
        died,
        Array.from(this.alivePreview),
        this.didCellsChange
      );

      this.didCellsChange = false;

      observer(
        this.isGameStarted,
        this.isGamePaused,
        this.generation,
        this.aliveCells.size,
        this.speed.cyclesPerRender
      );

      requestAnimationFrame(this.animationCycle.bind(this));
    },

    /**
     *
     * @memberof GameController
     * @param {MessageEvent} e
     */
    handleWorkerMessage(e) {
      if (e.data === "started") this.isGameStarted = true;
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
