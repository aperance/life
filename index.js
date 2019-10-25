import { Game } from "./game.js";

const dom = {
  container: document.getElementById("canvas-container"),
  gridCanvas: document.getElementById("grid-canvas"),
  cellCanvas: document.getElementById("cell-canvas"),
  zoom: document.getElementById("zoom"),
  panX: document.getElementById("pan-x"),
  panY: document.getElementById("pan-y"),
  start: document.getElementById("start-button")
};

let game = null;
let mouse = {
  down: false,
  panning: false,
  dragging: false,
  draggedShape: null,
  lastX: null,
  lastY: null
};

/*** Window Event Listeners ***/

window.onload = () => {
  game = new Game(
    dom.gridCanvas.getContext("2d"),
    dom.cellCanvas.getContext("2d"),
    100
  );

  game.onChange = ({ view }) => {
    dom.zoom.value = view.zoom;
    dom.panX.value = view.panX;
    dom.panY.value = view.panY;
  };

  game.setView({
    width: dom.container.clientWidth,
    height: dom.container.clientHeight,
    zoom: 10,
    panX: 0,
    panY: 0
  });

  dom.gridCanvas.width = dom.container.clientWidth;
  dom.gridCanvas.height = dom.container.clientHeight;
  dom.cellCanvas.width = dom.container.clientWidth;
  dom.cellCanvas.height = dom.container.clientHeight;
};

window.onresize = () => {
  game.setView({
    width: dom.container.clientWidth,
    height: dom.container.clientHeight
  });
  dom.gridCanvas.width = dom.container.clientWidth;
  dom.gridCanvas.height = dom.container.clientHeight;
  dom.cellCanvas.width = dom.container.clientWidth;
  dom.cellCanvas.height = dom.container.clientHeight;
};

window.addEventListener("wheel", e => e.preventDefault(), {
  passive: false
});

/*** Mouse Event Listeners ***/

dom.container.onmouseenter = e => {
  if (e.buttons === 1) {
    mouse = {
      down: true,
      panning: false,
      dragging: true,
      draggedShape: [[0, 1, 0], [0, 0, 1], [1, 1, 1]],
      lastX: e.clientX,
      lastY: e.clientY
    };
  }
};

dom.container.onmousedown = e => {
  mouse = {
    down: true,
    panning: false,
    dragging: false,
    draggedShape: null,
    lastX: e.clientX,
    lastY: e.clientY
  };
};

dom.container.onmouseleave = e => {
  mouse = {
    down: false,
    panning: false,
    dragging: false,
    draggedShape: null,
    lastX: e.clientX,
    lastY: e.clientY
  };
};

dom.container.onmousemove = e => {
  if (!mouse.down) return;

  if (mouse.dragging) {
    return;
  }

  const movementX = mouse.lastX - e.clientX;
  const movementY = mouse.lastY - e.clientY;

  if (mouse.panning || Math.abs(movementX) > 5 || Math.abs(movementY) > 5) {
    game.setView({
      panX: game.view.panX + movementX,
      panY: game.view.panY + movementY
    });
    mouse = {
      down: true,
      panning: true,
      dragging: false,
      draggedShape: null,
      lastX: e.clientX,
      lastY: e.clientY
    };
  }
};

dom.container.onmouseup = e => {
  if (!mouse.panning) {
    if (mouse.dragging)
      game.placeElement(e.offsetX, e.offsetY, mouse.draggedShape);
    else game.toggleCell(e.offsetX, e.offsetY);
  }
  mouse = {
    down: false,
    panning: false,
    dragging: false,
    draggedShape: null,
    lastX: e.clientX,
    lastY: e.clientY
  };
};

dom.container.addEventListener(
  "wheel",
  e => {
    const prevZoom = game.view.zoom;
    game.setView({
      zoom: game.view.zoom + e.deltaY / 50
    });
    const scale = game.view.zoom / prevZoom - 1;
    game.setView({
      panX: game.view.panX + game.view.panX * scale + e.offsetX * scale,
      panY: game.view.panY + game.view.panY * scale + e.offsetY * scale
    });
  },
  {
    passive: true
  }
);

/*** Sidebar Event Listeners ***/

dom.zoom.onchange = e => game.setView({ zoom: e.target.value });
dom.panX.onchange = e => game.setView({ panX: e.target.value });
dom.panY.onchange = e => game.setView({ panY: e.target.value });

dom.start.onclick = () => game.start();
