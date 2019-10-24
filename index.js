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
let mouse = { down: false, dragging: false, lastX: null, lastY: null };

/*** Event Listeners ***/

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

dom.container.onmousedown = e => {
  mouse = {
    down: true,
    dragging: false,
    lastX: e.clientX,
    lastY: e.clientY
  };
};

dom.container.onmouseleave = e => {
  mouse = {
    down: false,
    dragging: false,
    lastX: e.clientX,
    lastY: e.clientY
  };
};

dom.container.onmousemove = e => {
  if (!mouse.down) return;

  const movementX = mouse.lastX - e.clientX;
  const movementY = mouse.lastY - e.clientY;

  if (mouse.dragging || Math.abs(movementX) > 5 || Math.abs(movementY) > 5) {
    game.setView({
      panX: game.view.panX + movementX,
      panY: game.view.panY + movementY
    });
    mouse = {
      down: true,
      dragging: true,
      lastX: e.clientX,
      lastY: e.clientY
    };
  }
};

dom.container.onmouseup = e => {
  const { top, left } = dom.container.getBoundingClientRect();
  if (!mouse.dragging) game.toggleCell(e.clientX - left, e.clientY - top);
  mouse = {
    down: false,
    dragging: false,
    lastX: e.clientX,
    lastY: e.clientY
  };
};

dom.zoom.onchange = e => game.setView({ zoom: e.target.value });
dom.panX.onchange = e => game.setView({ panX: e.target.value });
dom.panY.onchange = e => game.setView({ panY: e.target.value });

dom.start.onclick = () => game.start();
