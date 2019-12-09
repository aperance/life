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
  /** @type {HTMLDivElement} */
  topBar: (document.getElementById("top-bar")),
  /** @type {HTMLButtonElement} */
  speedBtn: (document.getElementById("speed-btn")),
  /** @type {HTMLDivElement} */
  speedDropdown: (document.getElementById("speed-dropdown")),
  /** @type {HTMLDivElement} */
  modeButtonGroup: (document.getElementById("mode-btn-group")),
  /** @type {HTMLDivElement} */
  patternModal: (document.getElementById("pattern-modal")),
  /** @type {HTMLUListElement} */
  patternList: (document.getElementById("pattern-list")),
  /** @type {HTMLInputElement} */
  zoomSlider: (document.getElementById("zoom-slider"))
};

/** @type {import('./gameRenderer').GameRenderer} */
let gameRenderer;

/** @type {import('./gameController').GameController} */
let gameController;

/** @type {import('./mouseTracker').MouseTracker} */
// eslint-disable-next-line no-unused-vars
let mouseTracker;

const wasm = true;

window.addEventListener("resize", handleResize);

document.addEventListener("DOMContentLoaded", function() {
  [...document.getElementsByClassName("collapse-link")].forEach(
    // @ts-ignore
    x => new Collapse(x)
  );
});

dom.topBar.addEventListener("mousedown", e => e.preventDefault());

dom.topBar.addEventListener("click", handleButton);

dom.speedDropdown.addEventListener("click", e => {
  const btn = /** @type {HTMLButtonElement} */ (e.target);
  if (btn.type === "button")
    gameController.setSpeed(btn.attributes["data-speed"].value);
});

dom.zoomSlider.addEventListener("input", e =>
  gameRenderer.zoomAtPoint(
    Math.round(Math.pow(parseFloat(dom.zoomSlider.value), 2)),
    dom.container.clientWidth / 2,
    dom.container.clientHeight / 2
  )
);

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

dom.patternList.addEventListener("mousedown", e => {
  /** @type {HTMLUListElement} */
  const target = (e.target);
  if (target.classList[0] === "pattern-name") {
    mouseTracker.draggedShape = getPatternRle(target.innerText);
    mouseTracker.canvasMove(e);
  }
});

dom.container.addEventListener("mouseleave", e => mouseTracker.canvasLeave(e));
dom.container.addEventListener("mousemove", e => mouseTracker.canvasMove(e));
dom.container.addEventListener("mouseup", e => mouseTracker.canvasUp(e));

dom.container.addEventListener("wheel", e => e.preventDefault(), {
  passive: false
});
dom.container.addEventListener("wheel", e => mouseTracker.canvasWheel(e), {
  passive: true
});

dom.patternList.innerHTML = generatePatternList();

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
    btn.className = "btn btn-primary";
    if (btn.id === mode + "-btn") btn.classList.add("active");
    btn.blur();
  });
}

/**
 *
 */
function handleGameChange({ generation, playing, speed }) {
  dom.leftStatus.textContent = `Playing: ${playing}, Generation: ${generation}`;
  dom.speedBtn.querySelector("span").textContent =
    (6 / speed)
      .toString()
      .replace("0.5", "1/2")
      .replace("0.25", "1/4") + "x";
}

/**
 *
 */
function handleViewChange({ zoom, panX, panY }) {
  dom.rightStatus.textContent = `Zoom: ${zoom}, Position: (${panX},${panY})`;
  dom.zoomSlider.value = Math.sqrt(zoom).toString();
}

/**
 *
 * @param {MouseEvent} e
 */
function handleButton(e) {
  const el = /** @type {HTMLElement} */ (e.target).closest("button");
  if (el === null) return;

  switch (el.id) {
    case "start-btn":
      gameController.start();
      break;
    case "pause-btn":
      break;
    case "reset-btn":
      initializeGame();
      break;
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
}
