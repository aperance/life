const worker = new Worker("./worker.js");

const batchSize = 25;
const bufferSize = 50;

class GameController {
  constructor(gameRenderer, cellCount) {
    this.gameRenderer = gameRenderer;
    this.cellCount = cellCount;

    this.alive = new Set();
    this.alivePreview = new Set();
    this.cellsChanged = true;
    this.playing = false;
    this.resultBuffer = [];
    this.resultsRequestedAt = null;
    this.speed = { cyclesPerRender: 1, currentCycle: 1 };

    worker.onmessage = e => {
      if (e.data === "started") this.playing = true;
      else {
        this.resultBuffer.push(...e.data);

        const duration = Date.now() - this.resultsRequestedAt;
        const limit = 17 * batchSize * this.speed.cyclesPerRender;

        if (duration > limit) {
          this.speed.cyclesPerRender++;
          console.warn("Reducing speed to " + 60 / this.speed.cyclesPerRender);
        }

        this.resultsRequestedAt = null;
      }
    };

    this.animationCycle();
  }

  get nextResult() {
    if (!this.playing) return null;

    if (this.resultBuffer.length < bufferSize && !this.resultsRequestedAt) {
      worker.postMessage({
        action: "requestResults",
        payload: { count: batchSize }
      });
      this.resultsRequestedAt = Date.now();
    }

    if (this.resultBuffer.length === 0) return null;
    else return this.resultBuffer.shift();
  }

  toggleCell(x, y) {
    const index = this.gameRenderer.xyToIndex(x, y);
    if (this.alive.has(index)) this.alive.delete(index);
    else this.alive.add(index);
    this.cellsChanged = true;
  }

  placeElement(x, y, shape) {
    const { row: startRow, col: startCol } = this.gameRenderer.xyToRowCol(x, y);

    this.alivePreview.clear();

    shape.forEach((rowData, relativeRow) => {
      rowData.forEach((cellState, relativeCol) => {
        const index =
          this.cellCount * (startRow + relativeRow) + (startCol + relativeCol);

        if (cellState === 1) this.alive.add(index);
        else this.alive.delete(index);
      });
    });

    this.cellsChanged = true;
  }

  placePreview(x, y, shape) {
    const { row: startRow, col: startCol } = this.gameRenderer.xyToRowCol(x, y);

    this.alivePreview.clear();

    shape.forEach((rowData, relativeRow) => {
      rowData.forEach((cellState, relativeCol) => {
        const index =
          this.cellCount * (startRow + relativeRow) + (startCol + relativeCol);

        if (cellState === 1) this.alivePreview.add(index);
      });
    });

    this.cellsChanged = true;
  }

  clearPreview() {
    this.alivePreview.clear();
    this.cellsChanged = true;
  }

  start() {
    console.log("Game started");

    worker.postMessage({
      action: "start",
      payload: { size: this.cellCount, initialAlive: Array.from(this.alive) }
    });
  }

  animationCycle() {
    if (this.playing) {
      if (this.speed.currentCycle < this.speed.cyclesPerRender) {
        this.speed.currentCycle++;
      } else {
        this.speed.currentCycle = 1;
        const result = this.nextResult;
        if (result) {
          for (let cellIndex of result.born) this.alive.add(cellIndex);
          for (let cellIndex of result.died) this.alive.delete(cellIndex);
          this.gameRenderer.render(
            Array.from(this.alive),
            result.born,
            result.died
          );
        }
      }
    } else {
      this.gameRenderer.render(Array.from(this.alive));
      this.gameRenderer.renderPreview(Array.from(this.alivePreview));
    }

    this.cellsChanged = false;
    requestAnimationFrame(this.animationCycle.bind(this));
  }
}

export { GameController };
