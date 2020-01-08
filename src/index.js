import "@fortawesome/fontawesome-free/js/all";
import { createGameRenderer } from "./gameRenderer";
import { createGameController } from "./gameController";
import { createMouseTracker } from "./mouseTracker";
import { createPanControls } from "./panControls";
import { patternLibrary } from "./patterns";

const wasm = true;

/** @type {import('./gameRenderer').GameRenderer} */
let gameRenderer;

/** @type {import('./gameController').GameController} */
let gameController;

/** @type {import('./mouseTracker').MouseTracker} */
// eslint-disable-next-line no-unused-vars
let mouseTracker;

/** @type {import('./panControls').PanControls} */
let panControls;

const dom = {
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
  playBtn: (document.getElementById("play-btn")),
  /** @type {HTMLButtonElement} */
  pauseBtn: (document.getElementById("pause-btn")),
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

window.addEventListener("resize", handleResize);

document.addEventListener("keydown", e => {
  if (e.key === "Escape") mouseTracker.clearPattern();
  else if (e.key.includes("Arrow")) {
    const direction = e.key.replace("Arrow", "").toLowerCase();
    panControls.start(direction);
  }
});

document.addEventListener("keyup", e => {
  if (e.key.includes("Arrow")) panControls.stop();
});

document.addEventListener("wheel", e => e.preventDefault(), {
  passive: false
});

document.addEventListener("wheel", e => mouseTracker.mouseWheel(e), {
  passive: true
});

document.addEventListener("mouseup", e => mouseTracker.mouseUp(e));
document.addEventListener("mousedown", e => mouseTracker.mouseDown(e));
document.addEventListener("mousemove", e => mouseTracker.mouseMove(e));
document.addEventListener("mouseleave", e => mouseTracker.mouseLeave());

dom.topBar.addEventListener("mousedown", e => e.preventDefault());

dom.topBar.addEventListener("click", e => {
  /** @type {HTMLElement} */
  const el = (e.target);
  const btn = el.closest("button");
  // @ts-ignore
  if (btn?.dataset.speed) gameController.setSpeed(btn.dataset.speed);
  else if (btn?.id === "play-btn") gameController.play();
  else if (btn?.id === "pause-btn") gameController.pause();
  else if (btn?.id === "default-btn") mouseTracker.clearPattern();
});

dom.patternModal.addEventListener("click", e => {
  /** @type {HTMLElement} */
  const el = (e.target);
  if (el.closest("button")?.className === "close") mouseTracker.clearPattern();
  else if (el.id === "pattern-modal") mouseTracker.clearPattern();
  else if (el.dataset.pattern) {
    const patternData = patternLibrary.getPatternData(el.dataset.pattern);
    console.log(patternData);
    mouseTracker.setPattern(patternData.array);
    mouseTracker.mouseMove(e);
  }
});

dom.patternModal.addEventListener("show.bs.modal", e =>
  dom.patternBtn.classList.add("active")
);

dom.patternModal.addEventListener("hidden.bs.modal", e =>
  dom.patternBtn.blur()
);

[...dom.panButtonGroup.children].forEach(child => {
  /** @type {HTMLButtonElement} */
  const btn = (child);
  const start = () => {
    if (btn.dataset.direction) panControls.start(btn.dataset.direction);
  };
  const stop = () => {
    btn.blur();
    panControls.stop();
  };
  btn.addEventListener("mousedown", start);
  btn.addEventListener("mouseup", stop);
  btn.addEventListener("mouseleave", stop);
});

dom.zoomSlider.addEventListener("input", e =>
  gameRenderer.zoomAtPoint(
    Math.round(Math.pow(parseFloat(dom.zoomSlider.value), 2)),
    window.innerWidth / 2,
    window.innerHeight / 2
  )
);

const patternListObserver = new MutationObserver(mutationsList => {
  mutationsList.forEach(node => {
    /** @type {HTMLElement} */
    const el = (node.target);
    if (el.id === "pattern-list") {
      // @ts-ignore
      el.querySelectorAll(".collapse-link").forEach(x => new Collapse(x));
    }
  });
});

patternListObserver.observe(dom.patternList, { childList: true });

patternLibrary.init().then(() => {
  dom.patternList.innerHTML = patternLibrary.generateListHTML();
});

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
  gameRenderer.setWindow(window.innerWidth, window.innerHeight);

  [dom.gridCanvas, dom.cellCanvas, dom.previewCanvas].forEach(canvas => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

/**
 *
 * @param {boolean} isPlaying
 * @param {number} generation
 * @param {number} speed
 */
function handleGameChange(isPlaying, isPaused, generation, population, speed) {
  const state = isPlaying ? (isPaused ? "Paused" : "Running") : "Stopped";
  dom.leftStatus.textContent = `${state}, Generation: ${generation}, Population: ${population}`;

  dom.playBtn.hidden = isPlaying && !isPaused;
  dom.pauseBtn.hidden = !isPlaying || isPaused;

  //@ts-ignore
  dom.speedBtn.querySelector("span").textContent =
    (6 / speed)
      .toString()
      .replace("0.5", "1/2")
      .replace("0.25", "1/4") + "x";
}

/**
 *
 * @param {number} zoom
 * @param {number} panX
 * @param {number} panY
 */
function handleViewChange(zoom, panX, panY) {
  dom.rightStatus.textContent = `Zoom: ${zoom}, Position: (${panX},${panY})`;
  dom.zoomSlider.value = Math.sqrt(zoom).toString();
}

/**
 *
 * @param {boolean} panningMode
 * @param {boolean} patternMode
 */
function handleMouseChange(panningMode, patternMode) {
  document.body.style.cursor = panningMode ? "all-scroll" : "default";
  dom.defaultBtn.className = `btn btn-primary ${!patternMode && "active"}`;
  dom.patternBtn.className = `btn btn-primary ${patternMode && "active"}`;
}
