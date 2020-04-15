/**
 * GameController is responsible for managing the game state. If not yet
 * started, the game state is updated based on user actions. If started, the
 * game state is updated based on results calculated by the web worker. The
 * game state is then passed to the ViewController to be displayed to the user.
 * @namespace GameController
 */

/**
 * Exports a factory function used to generate a GameController object.
 * @module gameController
 */

import {ViewController} from "./viewController";

export interface GameController {
  aliveCells: Set<number>;
  alivePreview: Set<number>;
  isGameStarted: boolean;
  isGamePaused: boolean;
  resultBuffer: Array<{born: Array<number>; died: Array<number>}>;
  resultsRequestedAt: number | null;
  didCellsChange: boolean;
  speed: {cyclesPerRender: number; currentCycle: number};
  generation: number;
  haltAnimationCycle: boolean;
  nextResult: {born: Array<number>; died: Array<number>} | null;
  toggleCell(x: number, y: number): void;
  placePattern(x: number, y: number, pattern: Array<Array<number>>): void;
  placePreview(x: number, y: number, pattern: Array<Array<number>>): void;
  iterateOverPattern(
    x: number,
    y: number,
    pattern: Array<Array<number>>,
    fn: (index: number, isAlive: boolean) => void
  ): void;
  clearAliveCells(): void;
  clearPreview(): void;
  play(): void;
  pause(): void;
  setSpeed(speed: number): void;
  terminate(): void;
  animationCycle(): void;
  handleWorkerMessage(e: MessageEvent): void;
}

const batchSize = 25;
const bufferSize = 50;

/**
 * Factory function to create GameController object with dependencies injected.
 * @param {Worker} worker Reference to an initialized web worker to calculate game results
 * @param {ViewController} viewController Reference to viewController object
 * @param {number} cellCount Number of cells per side of the total game area
 * @param {boolean} wasm True if wasm implementation of game logic should be used
 * @param {function(boolean, boolean, number, number, number): void} observer Function called when game state is modified
 * @return {GameController}
 */
export function createGameController(
  worker: Worker,
  viewController: ViewController,
  cellCount: number,
  wasm: boolean,
  // @ts-ignore
  observer: any
) {
  const gameController: GameController = {
    /**
     * Set containing the indices of the currently alive cells.
     * @memberof GameController#
     * @type {Set}
     */
    aliveCells: new Set(),

    /**
     * Set containing the indices of the pattern being previewed.
     * @memberof GameController#
     * @type {Set}
     */
    alivePreview: new Set(),

    /**
     * True if game results have started being generated by worker.
     * @memberof GameController#
     * @type {boolean}
     */
    isGameStarted: false,

    /**
     * True if game has started but results are paused.
     * @memberof GameController#
     * @type {boolean}
     */
    isGamePaused: false,

    /**
     * Array storing results generated by the worker.
     * @memberof GameController#
     * @type {Array<{born: Array<number>, died: Array<number>}>}
     */
    resultBuffer: [],

    /**
     * Timestamp of pending request sent to worker for game results. Null if no request is pending.
     * @memberof GameController#
     * @type {number?}
     */
    resultsRequestedAt: null,

    /**
     * True if aliveCells was modified since last animation cycle.
     * @memberof GameController#
     * @type {boolean}
     */
    didCellsChange: true,

    /**
     * Number of cycles to elapse before rendering next result, and current cycle count.
     * @memberof GameController#
     * @type {{cyclesPerRender: number, currentCycle: number}}
     */
    speed: {cyclesPerRender: 6, currentCycle: 1},

    /**
     * The generation number of the results currently being displayed.
     * @memberof GameController#
     * @type {number}
     */
    generation: 0,

    /**
     * True if the recursive animationCycle calls should be stopped.
     * @memberof GameController#
     * @type {boolean}
     */
    haltAnimationCycle: false,

    /**
     * The next game results to be rendered. Includes arrays of cells born and
     * died since previous generation.
     * @memberof GameController#
     * @type {{born: Array<number>, died: Array<number>}?}
     */
    get nextResult() {
      if (!this.isGameStarted) return null;

      if (this.resultBuffer.length < bufferSize && !this.resultsRequestedAt) {
        worker.postMessage({
          action: "requestResults",
          payload: {count: batchSize}
        });
        this.resultsRequestedAt = Date.now();
      }

      return this.resultBuffer.shift() || null;
    },

    /**
     * Toggles the state of the cell at the specified window coordinates.
     * @memberof GameController#
     * @param {number} x x coordinate of the cell to be toggled
     * @param {number} y y coordinate of the cell to be toggled
     */
    toggleCell(x, y) {
      if (this.isGameStarted) return;

      const {index} = viewController.xyToRowColIndex(x, y);

      this.aliveCells.has(index)
        ? this.aliveCells.delete(index)
        : this.aliveCells.add(index);
      this.didCellsChange = true;
    },

    /**
     * Takes the selected pattern in the pattern library and adds it to
     * aliveCells at the specified window coordinates.
     * @memberof GameController#
     * @param {number} x x coordinate of where pattern should be placed
     * @param {number} y y coordinate of where pattern should be placed
     * @param {number[][]} pattern 2D array representing the selected pattern
     */
    placePattern(x, y, pattern) {
      if (this.isGameStarted) return;

      this.iterateOverPattern(x, y, pattern, (index, isAlive) => {
        if (isAlive) this.aliveCells.add(index);
        else this.aliveCells.delete(index);
      });
    },

    /**
     * Takes the selected pattern in the pattern library and adds it to
     * alivePreview at the specified window coordinates.
     * @memberof GameController#
     * @param {number} x x coordinate of where pattern should be placed
     * @param {number} y y coordinate of where pattern should be placed
     * @param {number[][]} pattern 2D array representing the selected pattern
     */
    placePreview(x, y, pattern) {
      if (this.isGameStarted) return;

      this.alivePreview.clear();

      this.iterateOverPattern(x, y, pattern, (index, isAlive) => {
        if (isAlive) this.alivePreview.add(index);
      });
    },

    /**
     * Iterates over 2D array of selected pattern and performs function on each cell.
     * @memberof GameController#
     * @param {number} x x coordinate of where pattern should be placed
     * @param {number} y y coordinate of where pattern should be placed
     * @param {number[][]} pattern 2D array representing the selected pattern
     * @param {function} fn function to be called for each cell
     */
    iterateOverPattern(x, y, pattern, fn) {
      const {row, col} = viewController.xyToRowColIndex(x, y);
      const startRow = row + 1 - Math.round(pattern.length / 2);
      const startCol = col + 1 - Math.round(pattern[0].length / 2);

      pattern.forEach((rowData, relativeRow) => {
        rowData.forEach((cellState, relativeCol) => {
          const index =
            cellCount * (startRow + relativeRow) + (startCol + relativeCol);
          const isAlive = cellState === 1 ? true : false;

          fn(index, isAlive);
        });
      });

      this.didCellsChange = true;
    },

    /**
     *
     * @memberof GameController#
     */
    clearAliveCells() {
      this.aliveCells.clear();
      this.didCellsChange = true;
    },

    /**
     *
     * @memberof GameController#
     */
    clearPreview() {
      this.alivePreview.clear();
      this.didCellsChange = true;
    },

    /**
     * Sends message to worker to start generating game results.
     * @memberof GameController#
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
     * Sets flag to pause game at current generation.
     * @memberof GameController#
     */
    pause() {
      this.isGamePaused = true;
    },

    /**
     * Updates the number of cycles to elapse per game generation.
     * @memberof GameController#
     * @param {number} genPerSecond
     */
    setSpeed(genPerSecond) {
      this.speed.cyclesPerRender = 6 / genPerSecond;
    },

    /**
     * Terminates worker and recursive animationCycle calls, to prepare for
     * object deletion.
     * @memberof GameController#
     */
    terminate() {
      worker.terminate();
      this.haltAnimationCycle = true;
    },

    /**
     * Gets next game results and passes game state to viewController render
     * method. Called 60 times per second using requestAnimationFrame timer.
     * @memberof GameController#
     */
    animationCycle() {
      if (this.haltAnimationCycle) return;

      let born: Array<number> | null = null;
      let died: Array<number> | null = null;

      if (this.isGameStarted && !this.isGamePaused) {
        if (this.speed.currentCycle < this.speed.cyclesPerRender) {
          this.speed.currentCycle++;
        } else {
          this.speed.currentCycle = 1;
          const result: {
            born: Array<number>;
            died: Array<number>;
          } | null = this.nextResult;
          if (result) {
            for (let cellIndex of result.born) this.aliveCells.add(cellIndex);
            for (let cellIndex of result.died)
              this.aliveCells.delete(cellIndex);
            this.didCellsChange = true;
            this.generation++;
          }
        }
      }

      viewController.updateCanvases(
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
     * Parses messages received from worker. Moves received game results to results buffer.
     * @memberof GameController#
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
}
