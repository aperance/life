/** @namespace GameController */

/** @module gameController */

/**
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

import { GameRenderer } from "./gameRenderer";
import { PatternLibrary } from "./patternLibrary";

const batchSize = 25;
const bufferSize = 50;

/**
 *  Factory function to create GameController object with dependencies injected.
 * @param {Worker} worker
 * @param {GameRenderer} gameRenderer
 * @param {PatternLibrary} patternLibrary
 * @param {number} cellCount
 * @param {boolean} wasm
 * @param {function(boolean, boolean, number, number, number): void} observer
 * @return {GameController}
 */
const createGameController = (
  worker,
  gameRenderer,
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
    alive: new Set(),

    /**
     * @memberof GameController
     * @type {Set}
     */
    alivePreview: new Set(),

    /**
     * @memberof GameController
     * @type {boolean}
     */
    playing: false,

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
    cellsChanged: true,

    /**
     * @memberof GameController
     * @type {{cyclesPerRender: number, currentCycle: number, paused: boolean}}
     */
    speed: { cyclesPerRender: 6, currentCycle: 1, paused: false },

    /**
     * @memberof GameController
     * @type {number}
     */
    generation: 0,

    /**
     * @memberof GameController
     * @type {boolean}
     */
    isTerminated: false,

    /**
     *
     * @memberof GameController
     * @type {{born: Array<number>, died: Array<number>}?}
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
     * @memberof GameController
     * @param {number} x
     * @param {number} y
     */
    toggleCell(x, y) {
      if (this.playing) return;

      const { index } = gameRenderer.xyToRowColIndex(x, y);

      this.alive.has(index) ? this.alive.delete(index) : this.alive.add(index);
      this.cellsChanged = true;
    },

    /**
     *
     * @memberof GameController
     * @param {number} x
     * @param {number} y
     * @param {boolean} isPreview
     */
    placePattern(x, y, isPreview) {
      if (this.playing) return;

      /** @type {number[][]?} */
      const pattern = patternLibrary.selected;

      if (!pattern) return;

      this.alivePreview.clear();

      const { row, col } = gameRenderer.xyToRowColIndex(x, y);
      const startRow = row + 1 - Math.round(pattern.length / 2);
      const startCol = col + 1 - Math.round(pattern[0].length / 2);

      pattern.forEach((rowData, relativeRow) => {
        rowData.forEach((cellState, relativeCol) => {
          const index =
            cellCount * (startRow + relativeRow) + (startCol + relativeCol);

          if (isPreview) {
            if (cellState === 1) this.alivePreview.add(index);
          } else {
            if (cellState === 1) this.alive.add(index);
            else this.alive.delete(index);
          }
        });
      });

      this.cellsChanged = true;
    },

    /**
     *
     * @memberof GameController
     */
    clearAliveCells() {
      this.alive.clear();
      this.cellsChanged = true;
    },

    /**
     *
     * @memberof GameController
     */
    clearPreview() {
      this.alivePreview.clear();
      this.cellsChanged = true;
    },

    /**
     *
     * @memberof GameController
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
      this.speed.paused = true;
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
      this.isTerminated = true;
    },

    /**
     *
     * @memberof GameController
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
     * @memberof GameController
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
