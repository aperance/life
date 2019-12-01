// @ts-check
import { createGameRenderer } from "./gameRenderer";
import { createGameController } from "./gameController";
import { createMouseTracker } from "./mouseTracker";
import { patternLibrary, rleToArray } from "./patterns";
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
  /** @type {HTMLSpanElement} */
  leftStatus: (document.getElementById("left-status")),
  /** @type {HTMLSpanElement} */
  rightStatus: (document.getElementById("right-status")),
  /** @type {HTMLButtonElement} */
  start: (document.getElementById("start-button")),
  /** @type {HTMLDivElement} */
  speedSlider: (document.getElementById("speed-slider")),
  /** @type {HTMLDivElement} */
  patternModal: (document.getElementById("pattern-modal")),
  /** @type {HTMLUListElement} */
  patternList: (document.getElementById("pattern-list"))
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
  const worker = new Worker("./worker.js");

  gameRenderer = createGameRenderer(
    dom.gridCanvas.getContext("2d"),
    dom.cellCanvas.getContext("2d"),
    dom.previewCanvas.getContext("2d"),
    5000,
    handleViewChange
  );

  gameController = createGameController(
    worker,
    gameRenderer,
    5000,
    wasm,
    handleGameChange
  );

  mouseTracker = createMouseTracker(
    gameRenderer,
    gameController,
    dom.container
  );

  dom.start.onclick = () => gameController.start();
}

function handleGameChange({ generation, playing }) {
  dom.leftStatus.textContent = `Playing: ${playing}, Generation: ${generation}`;
}

function handleViewChange({ zoom, panX, panY }) {
  dom.rightStatus.textContent = `Zoom: ${zoom}, Position: (${panX},${panY})`;
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
dom.container.addEventListener("wheel", e => e.preventDefault(), {
  passive: false
});

document.addEventListener("DOMContentLoaded", function() {
  M.Modal.init(dom.patternModal, { preventScrolling: false });
  M.Sidenav.init(dom.patternList);
  M.Collapsible.init(document.querySelectorAll(".collapsible"));
});

initializeGame();
handleResize();

dom.patternList.innerHTML = Object.entries(patternLibrary.categories)
  .map(
    ([category, patterns]) =>
      `<li class="no-padding">
        <ul class="collapsible collapsible-accordion">
          <li>
            <a class="collapsible-header">${category}</a>
            <div class="collapsible-body">
              <ul>
                ${patterns
                  .map(
                    x => `<li><a class="pattern-name" href="#!">${x}</a></li>`
                  )
                  .join("")}
              </ul>
            </div>
          </li>
        </ul>
      </li>`
  )
  .join("");

dom.patternList.onmousedown = e => {
  if (e.target.className !== "pattern-name") return;
  console.log(e.target.innerText);
  console.log(patternLibrary.patterns[e.target.innerText].rle);
};
