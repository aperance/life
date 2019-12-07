// @ts-check
import "@fortawesome/fontawesome-free/js/all";
import { createGameRenderer } from "./gameRenderer";
import { createGameController } from "./gameController";
import { createMouseTracker } from "./mouseTracker";
import { patternLibrary, rleToArray } from "./patterns";

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
  modeButtonGroup: (document.getElementById("mode-btn-group")),
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

  mouseTracker = createMouseTracker(gameRenderer, gameController);

  dom.start.onclick = () => gameController.start();
}

function setModeButtons(mode) {
  /** @type {Array<HTMLButtonElement>} */
  const buttons = ([...dom.modeButtonGroup.children]);
  buttons.forEach(btn => {
    btn.className = "btn btn-secondary";
    if (btn.id === mode + "-btn") btn.classList.add("active");
    btn.blur();
  });
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

initializeGame();
handleResize();

window.addEventListener("resize", handleResize);

document.addEventListener("DOMContentLoaded", function() {
  [...document.getElementsByClassName("collapse-link")].forEach(
    // @ts-ignore
    x => new Collapse(x)
  );
});

dom.container.addEventListener("wheel", e => e.preventDefault(), {
  passive: false
});

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

dom.modeButtonGroup.onmousedown = e => e.preventDefault();

dom.modeButtonGroup.onclick = e => {
  /** @type {HTMLButtonElement} */
  const target = (e.target);
  switch (target.id) {
    case "pan-btn":
      mouseTracker.mode = "pan";
      setModeButtons("pan");
      break;
    case "edit-btn":
      mouseTracker.mode = "edit";
      setModeButtons("edit");
      break;
    case "pattern-btn":
      mouseTracker.mode = "pattern";
      setModeButtons("pattern");
      break;
    default:
      break;
  }
};

dom.patternModal.addEventListener(
  "hidden.bs.modal",
  e => {
    if (mouseTracker.draggedShape === null) {
      mouseTracker.mode = "pan";
      setModeButtons("pan");
    }
  },
  false
);

dom.patternList.innerHTML = `<div class="list-group">
  ${patternLibrary.categories
    .map(
      ({ label, contents }, index) =>
        `<a class="list-group-item list-group-item-action collapse-link"
          data-toggle="collapse"
          href="#category${index}">
          ${label}
        </a>
        <div id="category${index}" class="collapse">
          ${contents
            .map(
              x =>
                `<a href="#"
                  class="pattern-name list-group-item list-group-item-action"
                  data-dismiss="modal"
                >
                  ${x}
                </a>`
            )
            .join("")}
        </div>
          `
    )
    .join("")}
</div>`;

dom.patternList.onmousedown = e => {
  e.preventDefault();
  if (e.target.classList[0] === "pattern-name") {
    mouseTracker.draggedShape = rleToArray(
      patternLibrary.patterns[e.target.innerText].rle
    );
    mouseTracker.mode = "pattern";
    mouseTracker.canvasMove(e);
    setModeButtons("pattern");
  }
};
