import { GameRenderer } from "./gameRenderer";
import { GameController } from "./gameController";
import { MouseTracker } from "./mouse";

let gameRenderer = null;
let gameController = null;
// eslint-disable-next-line no-unused-vars
let mouseTracker = null;

const dom = {
  container: document.getElementById("canvas-container"),
  gridCanvas: document.getElementById("grid-canvas"),
  cellCanvas: document.getElementById("cell-canvas"),
  previewCanvas: document.getElementById("preview-canvas"),
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

dom.zoom.onchange = e => gameRenderer.setView({ zoom: e.target.value });
dom.panX.onchange = e => gameRenderer.setView({ panX: e.target.value });
dom.panY.onchange = e => gameRenderer.setView({ panY: e.target.value });
dom.start.onclick = () => gameController.start();

function initializeGame() {
  gameRenderer = new GameRenderer(
    dom.gridCanvas.getContext("2d"),
    dom.cellCanvas.getContext("2d"),
    dom.previewCanvas.getContext("2d"),
    5000
  );

  gameController = new GameController(gameRenderer, 5000);

  mouseTracker = new MouseTracker(gameRenderer, gameController, dom.cellCanvas);

  gameRenderer.addObserver(() => (dom.zoom.value = gameRenderer.view.zoom));
  gameRenderer.addObserver(
    () =>
      (dom.panX.value = Math.round(
        (gameRenderer.view.panX + gameRenderer.view.width / 2) /
          gameRenderer.view.zoom
      ))
  );
  gameRenderer.addObserver(
    () =>
      (dom.panY.value = Math.round(
        (gameRenderer.view.panY + gameRenderer.view.height / 2) /
          gameRenderer.view.zoom
      ))
  );

  handleResize();
}

function handleResize() {
  gameRenderer.setView({
    width: dom.container.clientWidth,
    height: dom.container.clientHeight
  });

  dom.gridCanvas.width = dom.container.clientWidth;
  dom.gridCanvas.height = dom.container.clientHeight;
  dom.cellCanvas.width = dom.container.clientWidth;
  dom.cellCanvas.height = dom.container.clientHeight;
  dom.previewCanvas.width = dom.container.clientWidth;
  dom.previewCanvas.height = dom.container.clientHeight;
}

initializeGame();
