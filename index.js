import "@fortawesome/fontawesome-free/js/all";
import { createGameRenderer } from "./gameRenderer";
import { createGameController } from "./gameController";
import { createMouseTracker } from "./mouseTracker";
import { createPanControls } from "./panControls";
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
  /** @type {HTMLButtonElement} */
  defaultBtn: (document.getElementById("default-btn")),
  /** @type {HTMLButtonElement} */
  patternBtn: (document.getElementById("pattern-btn")),
  /** @type {HTMLDivElement} */
  patternModal: (document.getElementById("pattern-modal")),
  /** @type {HTMLUListElement} */
  patternList: (document.getElementById("pattern-list")),
  /** @type {HTMLDivElement} */
  panButtonGroup: (document.getElementById("pan-btn-group")),
  /** @type {HTMLInputElement} */
  zoomSlider: (document.getElementById("zoom-slider"))
};

/** @type {CanvasRenderingContext2D} */
const gridCtx = (dom.gridCanvas.getContext("2d"));
/** @type {CanvasRenderingContext2D} */
const cellCtx = (dom.cellCanvas.getContext("2d"));
/** @type {CanvasRenderingContext2D} */
const previewCtx = (dom.previewCanvas.getContext("2d"));

/** @type {import('./gameRenderer').GameRenderer} */
let gameRenderer;

/** @type {import('./gameController').GameController} */
let gameController;

/** @type {import('./mouseTracker').MouseTracker} */
// eslint-disable-next-line no-unused-vars
let mouseTracker;

/** @type {import('./panControls').PanControls} */
let panControls;

const wasm = true;

window.addEventListener("resize", handleResize);

document.addEventListener("DOMContentLoaded", function() {
  [...document.getElementsByClassName("collapse-link")].forEach(
    // @ts-ignore
    x => new Collapse(x)
  );
});

dom.topBar.addEventListener("mousedown", e => e.preventDefault());

dom.topBar.addEventListener("click", e => {
  const el = /** @type {HTMLElement} */ (e.target).closest("button");
  if (el === null) return;
  else if (el.id === "start-btn") gameController.start();
  else if (el.id === "reset-btn") initializeGame();
  else if (el.id === "default-btn") mouseTracker.clearPattern();
});

dom.speedDropdown.addEventListener("click", e => {
  const btn = /** @type {HTMLButtonElement} */ (e.target);
  if (btn.type === "button")
    gameController.setSpeed(btn.attributes["data-speed"].value);
});

dom.patternModal.addEventListener("click", e => {
  const el = /** @type {HTMLElement} */ (e.target);
  if (el.closest("button")?.className === "close") mouseTracker.clearPattern();
  else if (el.id === "pattern-modal") mouseTracker.clearPattern();
  else if (el.classList[0] === "pattern-name") {
    mouseTracker.setPattern(getPatternRle(el.innerText));
    mouseTracker.canvasMove(e);
  }
});

dom.patternModal.addEventListener("show.bs.modal", e =>
  document.getElementById("pattern-btn")?.classList.add("active")
);

dom.patternModal.addEventListener("hidden.bs.modal", e =>
  document.getElementById("pattern-btn")?.blur()
);

[...dom.panButtonGroup.children].forEach(btn => {
  btn.addEventListener("mousedown", e => {
    panControls.start(btn.id.split("-")[0]);
  });
  btn.addEventListener("mouseup", e => {
    /** @type {HTMLElement} */ (btn).blur();
    panControls.stop();
  });
  btn.addEventListener("mouseleave", e => {
    /** @type {HTMLElement} */ (btn).blur();
    panControls.stop();
  });
});

dom.zoomSlider.addEventListener("input", e =>
  gameRenderer.zoomAtPoint(
    Math.round(Math.pow(parseFloat(dom.zoomSlider.value), 2)),
    dom.container.clientWidth / 2,
    dom.container.clientHeight / 2
  )
);

dom.container.addEventListener("mouseleave", e => mouseTracker.canvasLeave(e));
dom.container.addEventListener("mouseenter", e => mouseTracker.canvasEnter(e));
dom.container.addEventListener("mouseup", e => mouseTracker.canvasUp(e));
dom.container.addEventListener("mousedown", e => mouseTracker.canvasDown(e));
dom.container.addEventListener("mousemove", e => mouseTracker.canvasMove(e));

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
    gridCtx,
    cellCtx,
    previewCtx,
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
    handleMouseChange
  );

  panControls = createPanControls(gameRenderer);

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
function handleGameChange({ generation, playing, speed }) {
  dom.leftStatus.textContent = `Playing: ${playing}, Generation: ${generation}`;

  //@ts-ignore
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
 */
function handleMouseChange({ panning, pattern }) {
  dom.container.style.cursor = panning ? "all-scroll" : "default";
  dom.defaultBtn.className = `btn btn-primary ${!pattern && "active"}`;
  dom.patternBtn.className = `btn btn-primary ${pattern && "active"}`;
}
