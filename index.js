import { Game } from "./game.js";
import { MouseTracker } from "./mouse.js";

let game = null;
// eslint-disable-next-line no-unused-vars
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
    5000
  );

  mouseTracker = new MouseTracker(game, dom.cellCanvas);

  game.addObserver(() => (dom.zoom.value = game.view.zoom));
  game.addObserver(
    () =>
      (dom.panX.value = Math.round(
        (game.view.panX + game.view.width / 2) / game.view.zoom
      ))
  );
  game.addObserver(
    () =>
      (dom.panY.value = Math.round(
        (game.view.panY + game.view.height / 2) / game.view.zoom
      ))
  );

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

initializeGame();
