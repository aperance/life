const batchSize = 25;
const bufferSize = 50;

/**
 * @class
 */
export class GameController {
  alive = new Set();
  alivePreview = new Set();
  playing = false;
  resultBuffer = [];
  resultsRequestedAt = null;
  cellsChanged = true;
  speed = { cyclesPerRender: 6, currentCycle: 1, paused: false };
  generation = 0;
  isTerminated = false;

  constructor(worker, gameRenderer, cellCount, wasm, observer) {
    this.worker = worker;
    this.gameRenderer = gameRenderer;
    this.cellCount = cellCount;
    this.wasm = wasm;
    this.observer = observer;

    worker.onmessage = this.handleWorkerMessage.bind(this);
    this.animationCycle();
  }

  /**
   *
   * @returns {{born: Array<number>, died: Array<number>} | null}
   */
  get nextResult() {
    if (!this.playing) return null;

    if (this.resultBuffer.length < bufferSize && !this.resultsRequestedAt) {
      this.worker.postMessage({
        action: "requestResults",
        payload: { count: batchSize }
      });
      this.resultsRequestedAt = Date.now();
    }

    return this.resultBuffer.shift() || null;
  }

  /**
   *
   * @param {number} x
   * @param {number} y
   */
  toggleCell(x, y) {
    if (this.playing) return;

    const { index } = this.gameRenderer.xyToRowColIndex(x, y);

    this.alive.has(index) ? this.alive.delete(index) : this.alive.add(index);
    this.cellsChanged = true;
  }

  /**
   *
   * @param {number} x
   * @param {number} y
   * @param {Array<Array<number>>} pattern
   * @param {boolean} isPreview
   */
  placePattern(x, y, pattern, isPreview) {
    if (this.playing) return;

    this.alivePreview.clear();

    const { row, col } = this.gameRenderer.xyToRowColIndex(x, y);
    const startRow = row + 1 - Math.round(pattern.length / 2);
    const startCol = col + 1 - Math.round(pattern[0].length / 2);

    pattern.forEach((rowData, relativeRow) => {
      rowData.forEach((cellState, relativeCol) => {
        const index =
          this.cellCount * (startRow + relativeRow) + (startCol + relativeCol);

        if (isPreview) {
          if (cellState === 1) this.alivePreview.add(index);
        } else {
          if (cellState === 1) this.alive.add(index);
          else this.alive.delete(index);
        }
      });
    });

    this.cellsChanged = true;
  }

  /**
   *
   */
  clearAliveCells() {
    this.alive.clear();
    this.cellsChanged = true;
  }

  /**
   *
   */
  clearPreview() {
    this.alivePreview.clear();
    this.cellsChanged = true;
  }

  /**
   *
   */
  play() {
    if (this.playing) this.speed.paused = false;
    else {
      console.log("Game started");

      this.worker.postMessage({
        action: "start",
        payload: {
          size: this.cellCount,
          initialAlive: Array.from(this.alive),
          wasm: this.wasm
        }
      });
    }
  }

  /**
   *
   */
  pause() {
    this.speed.paused = true;
  }

  /**
   *
   * @param {number} genPerSecond
   */
  setSpeed(genPerSecond) {
    this.speed.cyclesPerRender = 6 / genPerSecond;
  }

  /**
   *
   */
  terminate() {
    this.worker.terminate();
    this.isTerminated = true;
  }

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

    this.gameRenderer.render(
      Array.from(this.alive),
      born,
      died,
      Array.from(this.alivePreview),
      this.cellsChanged
    );

    this.cellsChanged = false;

    this.observer(
      this.playing,
      this.speed.paused,
      this.generation,
      this.alive.size,
      this.speed.cyclesPerRender
    );

    requestAnimationFrame(this.animationCycle.bind(this));
  }

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
}
