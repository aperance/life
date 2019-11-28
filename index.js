// @ts-check

import { createGameRenderer } from "./gameRenderer";
import { createGameController } from "./gameController";
import { createMouseTracker } from "./mouseTracker";
import "materialize-css/dist/css/materialize.min.css";
import "materialize-css/dist/js/materialize.min.js";
import "./styles.css";

const dom = {
  /** @type {HTMLDivElement} */
  container: (document.getElementById("canvas-container")),
  /**  @type {HTMLCanvasElement} */
  gridCanvas: (document.getElementById("grid-canvas")),
  /** @type {HTMLCanvasElement} */
  cellCanvas: (document.getElementById("cell-canvas")),
  /** @type {HTMLCanvasElement} */
  previewCanvas: (document.getElementById("preview-canvas")),
  /** @type {HTMLDivElement} */
  sidebar: (document.getElementById("sidebar")),
  /** @type {HTMLInputElement} */
  zoom: (document.getElementById("zoom")),
  /** @type {HTMLInputElement} */
  panX: (document.getElementById("pan-x")),
  /** @type {HTMLInputElement} */
  panY: (document.getElementById("pan-y")),
  /** @type {HTMLButtonElement} */
  start: (document.getElementById("start-button"))
};

/** @type {import('./gameRenderer').GameRenderer} */
let gameRenderer;

/** @type {import('./gameController').GameController} */
let gameController;

/** @type {import('./mouseTracker').MouseTracker} */
// eslint-disable-next-line no-unused-vars
let mouseTracker;

const wasm = true;

function initializeGame() {
  const gridCtx = dom.gridCanvas.getContext("2d");
  const cellCtx = dom.cellCanvas.getContext("2d");
  const previewCtx = dom.previewCanvas.getContext("2d");
  const worker = new Worker("./worker.js");

  gameRenderer = createGameRenderer(gridCtx, cellCtx, previewCtx, 5000);
  gameController = createGameController(worker, gameRenderer, 5000, wasm);
  mouseTracker = createMouseTracker(
    gameRenderer,
    gameController,
    dom.container
  );

  gameController.init();

  gameRenderer.addObserver(() => {
    dom.zoom.value = gameRenderer.view.zoom.toString();
  });
  gameRenderer.addObserver(() => {
    const { panX, zoom, height } = gameRenderer.view;
    dom.panX.value = Math.round((panX + height / 2) / zoom).toString();
  });
  gameRenderer.addObserver(() => {
    const { panY, zoom, width } = gameRenderer.view;
    dom.panY.value = Math.round((panY + width / 2) / zoom).toString();
  });

  dom.zoom.onchange = e => {
    /** @type {HTMLInputElement} */
    const target = (e.target);
    gameRenderer.setView({ zoom: target.value });
  };
  dom.panX.onchange = e => {
    /** @type {HTMLInputElement} */
    const target = (e.target);
    gameRenderer.setView({ panX: target.value });
  };
  dom.panY.onchange = e => {
    /** @type {HTMLInputElement} */
    const target = (e.target);
    gameRenderer.setView({ panY: target.value });
  };
  dom.start.onclick = () => gameController.start();
}

function handleResize() {
  gameRenderer.setView({
    width: dom.container.clientWidth,
    height: dom.container.clientHeight
  });

  [dom.gridCanvas, dom.cellCanvas, dom.previewCanvas].forEach(canvas => {
    canvas.width = dom.container.clientWidth;
    canvas.height = dom.container.clientHeight;
  });
}

window.addEventListener("resize", handleResize);
window.addEventListener("wheel", e => e.preventDefault(), { passive: false });

initializeGame();
handleResize();
