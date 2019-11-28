// @ts-check

import { createGameRenderer } from "./gameRenderer";
import { createGameController } from "./gameController";
import { createMouseTracker } from "./mouseTracker";
import "materialize-css/dist/css/materialize.min.css";
import "materialize-css/dist/js/materialize.min.js";
import "./styles.css";

const worker = new Worker("./worker.js");

/** @type {import('./gameRenderer').GameRenderer} */
let gameRenderer = null;

/** @type {import('./gameController').GameController} */
let gameController = null;

/** @type {import('./mouseTracker').MouseTracker} */
// eslint-disable-next-line no-unused-vars
let mouseTracker = null;

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

window.addEventListener("resize", handleResize);
window.addEventListener("wheel", e => e.preventDefault(), { passive: false });

function initializeGame() {
  gameRenderer = createGameRenderer(
    dom.gridCanvas.getContext("2d"),
    dom.cellCanvas.getContext("2d"),
    dom.previewCanvas.getContext("2d"),
    5000
  );
  gameController = createGameController(worker, gameRenderer, 5000);
  mouseTracker = createMouseTracker(gameRenderer, gameController);

  gameController.init();

  gameRenderer.addObserver(() => {
    dom.zoom.value = gameRenderer.view.zoom.toString();
  });
  gameRenderer.addObserver(() => {
    dom.panX.value = Math.round(
      (gameRenderer.view.panX + gameRenderer.view.height / 2) /
        gameRenderer.view.zoom
    ).toString();
  });
  gameRenderer.addObserver(() => {
    dom.panY.value = Math.round(
      (gameRenderer.view.panY + gameRenderer.view.height / 2) /
        gameRenderer.view.zoom
    ).toString();
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

  dom.container.onmouseenter = mouseTracker.canvasEnter.bind(mouseTracker);
  dom.container.onmousedown = mouseTracker.canvasDown.bind(mouseTracker);
  dom.container.onmouseleave = mouseTracker.canvasLeave.bind(mouseTracker);
  dom.container.onmousemove = mouseTracker.canvasMove.bind(mouseTracker);
  dom.container.onmouseup = mouseTracker.canvasUp.bind(mouseTracker);

  dom.container.addEventListener(
    "wheel",
    mouseTracker.canvasWheel.bind(mouseTracker),
    {
      passive: true
    }
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
