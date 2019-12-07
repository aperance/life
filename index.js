// @ts-check
import "@fortawesome/fontawesome-free/js/all";
import { createGameRenderer } from "./gameRenderer";
import { createGameController } from "./gameController";
import { createMouseTracker } from "./mouseTracker";
import { generatePatternList, getPatternRle } from "./patterns";

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

dom.patternList.innerHTML = generatePatternList();

document.addEventListener("DOMContentLoaded", function() {
  [...document.getElementsByClassName("collapse-link")].forEach(
    // @ts-ignore
    x => new Collapse(x)
  );
});

window.addEventListener("resize", handleResize);

dom.container.addEventListener("wheel", e => e.preventDefault(), {
  passive: false
});

document.getElementById("top-bar").onmousedown = e => e.preventDefault();

document.getElementById("pan-btn").onclick = e => {
  mouseTracker.mode = "pan";
  setModeButtons("pan");
};

document.getElementById("edit-btn").onclick = e => {
  mouseTracker.mode = "edit";
  setModeButtons("edit");
};

document.getElementById("pattern-btn").onclick = e => {
  mouseTracker.mode = "pattern";
  setModeButtons("pattern");
};

dom.patternModal.addEventListener(
  "hidden.bs.modal",
  e => {
    if (mouseTracker.draggedShape !== null) {
      mouseTracker.mode = "pattern";
      setModeButtons("pattern");
    } else {
      mouseTracker.mode = "pan";
      setModeButtons("pan");
    }
  },
  false
);

dom.patternList.onmousedown = e => {
  e.preventDefault();
  if (e.target.classList[0] === "pattern-name") {
    mouseTracker.draggedShape = getPatternRle(e.target.innerText);
    mouseTracker.canvasMove(e);
  }
};

dom.container.onmouseleave = e => {
  if (mouseTracker) mouseTracker.canvasLeave(e);
};
dom.container.onmousemove = e => {
  if (mouseTracker) mouseTracker.canvasMove(e);
};
dom.container.onmouseup = e => {
  if (mouseTracker) mouseTracker.canvasUp(e);
};

dom.container.addEventListener(
  "wheel",
  e => {
    if (mouseTracker) mouseTracker.canvasWheel(e);
  },
  {
    passive: true
  }
);

dom.start.onclick = () => gameController.start();

document.getElementById("reset-btn").onclick = e => {
  initializeGame();
};

initializeGame();

/**
 *
 */
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

  handleResize();
}

/**
 *
 */
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

/**
 *
 */
function setModeButtons(mode) {
  /** @type {Array<HTMLButtonElement>} */
  const buttons = ([...dom.modeButtonGroup.children]);
  buttons.forEach(btn => {
    btn.className = "btn btn-secondary";
    if (btn.id === mode + "-btn") btn.classList.add("active");
    btn.blur();
  });
}

/**
 *
 */
function handleGameChange({ generation, playing }) {
  dom.leftStatus.textContent = `Playing: ${playing}, Generation: ${generation}`;
}

/**
 *
 */
function handleViewChange({ zoom, panX, panY }) {
  dom.rightStatus.textContent = `Zoom: ${zoom}, Position: (${panX},${panY})`;
}
