import { Game } from "./game.js";

let mouse = { down: false, dragging: false, lastX: null, lastY: null };

const container = document.getElementById("canvas-container");
const gridCtx = document.getElementById("grid-canvas").getContext("2d");
const cellCtx = document.getElementById("cell-canvas").getContext("2d");

const game = new Game(gridCtx, cellCtx, 100);

/*** Event Listeners ***/

window.onload = () => {
  game.setView({
    width: container.clientWidth,
    height: container.clientHeight,
    zoom: 10,
    panX: 0,
    panY: 0
  });
};

window.onresize = () => {
  game.setView({
    width: container.clientWidth,
    height: container.clientHeight
  });
};

container.onmousedown = e => {
  mouse = {
    down: true,
    dragging: false,
    lastX: e.clientX,
    lastY: e.clientY
  };
};

container.onmouseleave = e => {
  mouse = {
    down: false,
    dragging: false,
    lastX: e.clientX,
    lastY: e.clientY
  };
};

container.onmousemove = e => {
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

container.onmouseup = e => {
  const { top, left } = container.getBoundingClientRect();
  if (!mouse.dragging) game.toggleCell(e.clientX - left, e.clientY - top);
  mouse = {
    down: false,
    dragging: false,
    lastX: e.clientX,
    lastY: e.clientY
  };
};

document.getElementById("cell-count").onchange = e =>
  game.setCellCount(e.target.value);

document.getElementById("zoom").onchange = e =>
  game.setView({ zoom: e.target.value });

document.getElementById("pan-x").onchange = e =>
  game.setView({ panX: e.target.value });

document.getElementById("pan-y").onchange = e =>
  game.setView({ panY: e.target.value });

document.getElementById("start-button").onclick = () => game.start();
