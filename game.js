import { gameEngine } from "./gameEngine";

class Game {
  constructor(gridCtx, cellCtx, cellCount) {
    this.gridCtx = gridCtx;
    this.cellCtx = cellCtx;
    this.cellCount = cellCount;
    this.lastTimestamp = 1;
    this.cellCount = cellCount;
    this.universe = new Uint8Array(cellCount * cellCount);
    this.game = null;
    this.view = { width: 0, height: 0, zoom: 1, panX: 0, panY: 0 };
    this.redrawGrid = false;
    this.playing = false;

    this.clamp = (val, min, max) => (val > max ? max : val < min ? min : val);
    this.getMinZoom = () =>
      Math.ceil(Math.max(this.view.width, this.view.height) / this.cellCount);
    this.getMaxPanX = () => this.cellCount * this.view.zoom - this.view.width;
    this.getMaxPanY = () => this.cellCount * this.view.zoom - this.view.height;

    this.onChange = null;

    this.render();
  }

  setView(view = {}) {
    this.view = { ...this.view, ...view };
    this.view.zoom = this.clamp(this.view.zoom, this.getMinZoom(), 100);
    this.view.panX = this.clamp(this.view.panX, 0, this.getMaxPanX());
    this.view.panY = this.clamp(this.view.panY, 0, this.getMaxPanY());
    this.redrawGrid = true;
    if (this.onChange) this.onChange(this);
  }

  toggleCell(x, y) {
    const row = Math.floor((y + this.view.panY) / this.view.zoom);
    const col = Math.floor((x + this.view.panX) / this.view.zoom);
    const index = this.cellCount * row + col;
    if (this.universe[index] === 0) {
      this.universe[index] = 1;
      this.cellCtx.fillRect(col, row, 1, 1);
    } else {
      this.universe[index] = 0;
      this.cellCtx.clearRect(col, row, 1, 1);
    }
  }

  placeElement(x, y, shape) {
    const startRow = Math.floor((y + this.view.panY) / this.view.zoom);
    const startCol = Math.floor((x + this.view.panX) / this.view.zoom);
    shape.forEach((arr, row) => {
      arr.forEach((cell, col) => {
        const index = this.cellCount * (startRow + row) + (startCol + col);
        this.universe[index] = cell;
      });
    });
    this.redrawGrid = true;
  }

  start() {
    this.game = gameEngine(this.cellCount, this.universe);
    this.playing = true;
  }

  render(timestamp) {
    const delta = timestamp - this.lastTimestamp;
    if (timestamp && delta > 25) console.error("LAG: " + (delta - 16.68));
    this.lastTimestamp = timestamp;

    const { width, height, zoom, panX, panY } = this.view;
    const startColumn = Math.floor(panX / zoom);
    const endColumn = Math.ceil((width + panX) / zoom);
    const startRow = Math.floor(panY / zoom);
    const endRow = Math.ceil((height + panY) / zoom);

    if (this.redrawGrid) {
      this.gridCtx.setTransform(zoom, 0, 0, zoom, -panX, -panY);
      this.gridCtx.strokeStyle = "lightgrey";
      this.gridCtx.lineWidth = 0.25 / zoom;
      this.gridCtx.clearRect(0, 0, width, height);

      this.cellCtx.setTransform(zoom, 0, 0, zoom, -panX, -panY);
      this.cellCtx.clearRect(0, 0, width, height);

      for (let col = startColumn; col < endColumn; col++) {
        for (let row = startRow; row < endRow; row++) {
          this.gridCtx.strokeRect(col, row, 1, 1);
          if (
            !this.playing &&
            this.universe[this.cellCount * row + col] === 1
          ) {
            this.cellCtx.fillRect(col, row, 1, 1);
          }
        }
      }
    }

    if (this.playing) {
      const { newUniverse, alive } = this.game.next().value;
      this.universe = newUniverse;

      this.cellCtx.clearRect(0, 0, width, height);
      alive.forEach(i => {
        const row = Math.floor(i / this.cellCount);
        const col = i % this.cellCount;
        if (startRow <= row <= endRow && startColumn <= col <= endColumn)
          this.cellCtx.fillRect(col, row, 1, 1);
      });
    }

    this.redrawGrid = false;
    requestAnimationFrame(this.render.bind(this));
  }
}

export { Game };
