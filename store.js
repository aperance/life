class State {
  constructor(cellCount) {
    this.cellCount = cellCount;
    this.universe = new Uint8Array(cellCount * cellCount);
    this.game = null;
    this.view = { width: 0, height: 0, zoom: 1, panX: 0, panY: 0 };
    this.redrawGrid = false;
    this.playing = false;
    this.clamp = (val, min, max) => (val > max ? max : val < min ? min : val);
  }

  get minZoom() {
    return Math.ceil(
      Math.max(this.view.width, this.view.height) / this.cellCount
    );
  }

  get maxPanX() {
    return this.cellCount * this.view.zoom - this.view.width;
  }

  get maxPanY() {
    return this.cellCount * this.view.zoom - this.view.height;
  }

  setView(view = {}) {
    this.view = { ...this.view, ...view };
    this.view.zoom = this.clamp(this.view.zoom, this.minZoom, 100);
    this.view.panX = this.clamp(this.view.panX, 0, this.maxPanX);
    this.view.panY = this.clamp(this.view.panY, 0, this.maxPanY);
    this.redrawGrid = true;
    this.updateDom();
  }

  updateDom() {
    document.getElementById("cell-count").value = this.cellCount;
    document.getElementById("zoom").value = this.view.zoom;
    document.getElementById("pan-x").value = this.view.panX;
    document.getElementById("pan-y").value = this.view.panY;
    document.getElementById("grid-canvas").width = this.view.width;
    document.getElementById("cell-canvas").width = this.view.width;
    document.getElementById("grid-canvas").height = this.view.height;
    document.getElementById("cell-canvas").height = this.view.height;
  }
}

const state = new State(100);

export { state };
