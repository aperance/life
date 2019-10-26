import { gameEngine } from "./gameEngine";

class Game {
  constructor(gridCtx, cellCtx, cellCount) {
    this.gridCtx = gridCtx;
    this.cellCtx = cellCtx;
    this.cellCount = cellCount;
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
    this.indexToRowCol = i => ({
      row: Math.floor(i / this.cellCount),
      col: i % this.cellCount
    });
    this.xyToRowCol = (x, y) => ({
      row: Math.floor((y + this.view.panY) / this.view.zoom),
      col: Math.floor((x + this.view.panX) / this.view.zoom)
    });

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
    const { row, col } = this.xyToRowCol(x, y);
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
    const { row: startRow, col: startCol } = this.xyToRowCol(x, y);
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

  render() {
    const { width, height, zoom, panX, panY } = this.view;

    if (this.redrawGrid) {
      this.gridCtx.setTransform(zoom, 0, 0, zoom, -panX, -panY);
      this.gridCtx.strokeStyle = "lightgrey";
      this.gridCtx.lineWidth = 0.25 / zoom;
      this.gridCtx.clearRect(0, 0, width, height);

      this.cellCtx.setTransform(zoom, 0, 0, zoom, -panX, -panY);
      this.cellCtx.clearRect(0, 0, width, height);

      const { row: startRow, col: startCol } = this.xyToRowCol(0, 0);
      const { row: endRow, col: endCol } = this.xyToRowCol(width, width);

      for (let col = startCol; col < endCol; col++) {
        for (let row = startRow; row < endRow; row++) {
          this.gridCtx.strokeRect(col, row, 1, 1);
          if (!this.playing && this.universe[this.cellCount * row + col]) {
            this.cellCtx.fillRect(col, row, 1, 1);
          }
        }
      }
    }

    if (this.playing) {
      const { born, died } = this.game.next().value;
      for (let i = 0, n = born.length; i < n; ++i) {
        const { row, col } = this.indexToRowCol(born[i]);
        this.cellCtx.fillRect(col, row, 1, 1);
      }
      for (let i = 0, n = died.length; i < n; ++i) {
        const { row, col } = this.indexToRowCol(died[i]);
        this.cellCtx.clearRect(col, row, 1, 1);
      }
    }

    this.redrawGrid = false;
    requestAnimationFrame(this.render.bind(this));
  }
}

export { Game };
