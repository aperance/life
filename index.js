import { state } from "./store.js";
import { render, toggleCell, gameEngine } from "./game.js";

let mouse = { down: false, dragging: false, lastX: null, lastY: null };

const container = document.getElementById("canvas-container");

/*** Event Listeners ***/

window.onload = () => {
  state.setView({
    width: container.clientWidth,
    height: container.clientHeight,
    zoom: 10,
    panX: 0,
    panY: 0
  });
  render();
};

window.onresize = () => {
  state.setView({
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
    state.setView({
      panX: state.view.panX + movementX,
      panY: state.view.panY + movementY
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
  if (!mouse.dragging) toggleCell(e.clientX - left, e.clientY - top);
  mouse = {
    down: false,
    dragging: false,
    lastX: e.clientX,
    lastY: e.clientY
  };
};

document.getElementById("cell-count").onchange = e =>
  state.setCellCount(e.target.value);

document.getElementById("zoom").onchange = e =>
  state.setView({ zoom: e.target.value });

document.getElementById("pan-x").onchange = e =>
  state.setView({ panX: e.target.value });

document.getElementById("pan-y").onchange = e =>
  state.setView({ panY: e.target.value });

document.getElementById("start-button").onclick = () => {
  state.game = gameEngine(state.cellCount, state.universe);
  state.playing = true;
};
