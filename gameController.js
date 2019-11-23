const batchSize = 25;
const bufferSize = 50;

const createGameController = (worker, gameRenderer, cellCount) => ({
  alive: new Set(),
  alivePreview: new Set(),
  cellsChanged: true,
  playing: false,
  resultBuffer: [],
  resultsRequestedAt: null,
  speed: { cyclesPerRender: 1, currentCycle: 1 },

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
  },

  init() {
    worker.onmessage = this.handleWorkerMessage.bind(this);
    this.animationCycle();
  },

  handleWorkerMessage(e) {
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
  },

  toggleCell(x, y) {
    const index = gameRenderer.xyToIndex(x, y);
    if (this.alive.has(index)) this.alive.delete(index);
    else this.alive.add(index);
    this.cellsChanged = true;
  },

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

  clearPreview() {
    this.alivePreview.clear();
    this.cellsChanged = true;
  },

  start() {
    console.log("Game started");

    worker.postMessage({
      action: "start",
      payload: { size: cellCount, initialAlive: Array.from(this.alive) }
    });
  },

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
          gameRenderer.render(Array.from(this.alive), result.born, result.died);
        }
      }
    } else {
      gameRenderer.render(Array.from(this.alive));
      gameRenderer.renderPreview(Array.from(this.alivePreview));
    }

    this.cellsChanged = false;
    requestAnimationFrame(this.animationCycle.bind(this));
  }
});

export { createGameController };
