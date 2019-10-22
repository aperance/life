const state = {
  cellCount: null,
  universe: null,
  game: null,
  view: { zoom: 1, panX: 0, panY: 0 },
  canvasSize: { width: 0, height: 0 },
  redrawGrid: false,
  playing: false
};

function setCellCount(cellCount) {
  state.cellCount = cellCount;
  state.universe = new Uint8Array(state.cellCount * state.cellCount);
  rebalance();
}

function setCanvasSize(canvasSize = {}) {
  state.canvasSize = { ...state.canvasSize, ...canvasSize };
  rebalance();
}

function setView(view = {}) {
  state.view = { ...state.view, ...view };
  rebalance();
}

function rebalance() {
  if (!state.cellCount) return;

  state.view.zoom = Math.max(
    Math.ceil(
      Math.max(state.canvasSize.width, state.canvasSize.height) /
        state.cellCount
    ),
    state.view.zoom
  );
  state.view.panX = Math.min(
    Math.max(0, state.view.panX),
    state.cellCount * state.view.zoom - state.canvasSize.width
  );
  state.view.panY = Math.min(
    Math.max(0, state.view.panY),
    state.cellCount * state.view.zoom - state.canvasSize.height
  );

  state.redrawGrid = true;
  updateDom();
}

function updateDom() {
  document.getElementById("cell-count").value = state.cellCount;
  document.getElementById("zoom").value = state.view.zoom;
  document.getElementById("pan-x").value = state.view.panX;
  document.getElementById("pan-y").value = state.view.panY;
  document.getElementById("grid-canvas").width = state.canvasSize.width;
  document.getElementById("cell-canvas").width = state.canvasSize.width;
  document.getElementById("grid-canvas").height = state.canvasSize.height;
  document.getElementById("cell-canvas").height = state.canvasSize.height;
}

export { state, setCanvasSize, setCellCount, setView };
