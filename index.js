import { Game } from "./game.js";
import { MouseTracker } from "./mouse.js";

let game = null;
let mouseTracker = null;

const dom = {
  container: document.getElementById("canvas-container"),
  gridCanvas: document.getElementById("grid-canvas"),
  cellCanvas: document.getElementById("cell-canvas"),
  sidebar: document.getElementById("sidebar"),
  zoom: document.getElementById("zoom"),
  panX: document.getElementById("pan-x"),
  panY: document.getElementById("pan-y"),
  start: document.getElementById("start-button")
};

window.addEventListener("load", initializeGame);
window.addEventListener("resize", handleResize);
window.addEventListener("wheel", e => e.preventDefault(), {
  passive: false
});

dom.zoom.onchange = e => game.setView({ zoom: e.target.value });
dom.panX.onchange = e => game.setView({ panX: e.target.value });
dom.panY.onchange = e => game.setView({ panY: e.target.value });
dom.start.onclick = () => game.start();

function initializeGame() {
  game = new Game(
    dom.gridCanvas.getContext("2d"),
    dom.cellCanvas.getContext("2d"),
    100
  );
  mouseTracker = new MouseTracker(game, dom.cellCanvas);

  game.onChange = ({ view }) => {
    dom.zoom.value = view.zoom;
    dom.panX.value = view.panX;
    dom.panY.value = view.panY;
  };

  game.setView({
    zoom: 10,
    panX: 0,
    panY: 0
  });

  handleResize();
}

function handleResize() {
  game.setView({
    width: dom.container.clientWidth,
    height: dom.container.clientHeight
  });

  dom.gridCanvas.width = dom.container.clientWidth;
  dom.gridCanvas.height = dom.container.clientHeight;
  dom.cellCanvas.width = dom.container.clientWidth;
  dom.cellCanvas.height = dom.container.clientHeight;
}
