import "@fortawesome/fontawesome-free/js/all";
import { createGameRenderer } from "./gameRenderer";
import { createGameController } from "./gameController";
import { createMouseTracker } from "./mouseTracker";
import { createPanControls } from "./panControls";
import { createPatternLibrary } from "./patternLibrary";

const dom = {
  /**  @type {HTMLDivElement} */
  main: (document.getElementById("main")),
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
  /** @type {HTMLButtonElement} */
  defaultBtn: (document.getElementById("default-btn")),
  /** @type {HTMLButtonElement} */
  patternBtn: (document.getElementById("pattern-btn")),
  /** @type {HTMLDivElement} */
  patternModal: (document.getElementById("pattern-modal")),
  /** @type {HTMLDivElement} */
  patternList: (document.getElementById("pattern-list")),
  /** @type {HTMLDivElement} */
  patternDetails: (document.getElementById("pattern-details")),
  /** @type {HTMLCollection} */
  categoryLinks: (document.getElementsByClassName("collapse-link")),
  /** @type {HTMLDivElement} */
  panButtonGroup: (document.getElementById("pan-btn-group")),
  /** @type {HTMLInputElement} */
  zoomSlider: (document.getElementById("zoom-slider"))
};

const wasm = true;

/** @type {import('./patternLibrary').PatternLibrary} */
const patternLibrary = createPatternLibrary(handlePatternChange);

/** @type {import('./gameRenderer').GameRenderer?} */
let gameRenderer = null;
/** @type {import('./gameController').GameController?} */
let gameController = null;
/** @type {import('./mouseTracker').MouseTracker?} */
// eslint-disable-next-line no-unused-vars
let mouseTracker = null;
/** @type {import('./panControls').PanControls?} */
let panControls = null;

/**
 *
 */
async function init() {
  try {
    setEventListeners();
    initializeGame();
    await patternLibrary.loadDataFromFiles();
    dom.patternList.innerHTML = patternLibrary.generateListHTML();
    // @ts-ignore
    [...dom.categoryLinks].forEach(el => new Collapse(el));
  } catch (err) {
    console.error(err);
    terminateGame();
  }
}

/**
 *
 */
function setEventListeners() {
  /**
   *
   */
  window.addEventListener("error", terminateGame);

  /**
   *
   */
  window.addEventListener("resize", handleResize);

  /**
   *
   */
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") patternLibrary.setSelected(null);
    else if (e.key === "r") patternLibrary.rotateSelected();
    else if (e.key === "f") patternLibrary.flipSelected();
    else if (e.key.includes("Arrow")) {
      const direction = e.key.replace("Arrow", "").toLowerCase();
      panControls?.start(direction);
    }
  });

  /**
   *
   */
  document.addEventListener("keyup", e => {
    if (e.key.includes("Arrow")) panControls?.stop();
  });

  /**
   *
   */
  document.addEventListener("mouseup", e => mouseTracker?.mouseUp(e));
  document.addEventListener("mousedown", e => mouseTracker?.mouseDown(e));
  document.addEventListener("mousemove", e => mouseTracker?.mouseMove(e));
  document.addEventListener("mouseleave", () => mouseTracker?.mouseLeave());

  /**
   *
   */
  dom.main.addEventListener("wheel", e => e.preventDefault(), {
    passive: false
  });

  /**
   *
   */
  dom.main.addEventListener("wheel", e => mouseTracker?.mouseWheel(e), {
    passive: true
  });

  /**
   *
   */
  dom.topBar.addEventListener("mousedown", e => e.preventDefault());

  /**
   *
   */
  dom.topBar.addEventListener("click", e => {
    /** @type {HTMLElement} */
    const el = (e.target);
    const btn = el.closest("button");
    if (btn?.dataset.speed)
      gameController?.setSpeed(parseFloat(btn.dataset.speed));
    else if (btn?.id === "play-btn") gameController?.play();
    else if (btn?.id === "pause-btn") gameController?.pause();
    else if (btn?.id === "default-btn") patternLibrary.setSelected(null);
    else if (btn?.id === "reset-btn") {
      terminateGame();
      initializeGame();
    }
  });

  /**
   *
   */
  dom.patternBtn.addEventListener("focus", () => dom.patternBtn.blur());

  /**
   *
   */
  dom.patternModal.addEventListener("click", e => {
    const el = /** @type {HTMLElement} */ (e.target);
    const { pattern, role } = el.dataset;

    if (pattern && role === "listItem")
      dom.patternDetails.innerHTML = patternLibrary.generateDetailHTML(pattern);
    else if (pattern && role === "selectBtn")
      patternLibrary.setSelected(pattern);
  });

  /**
   *
   */
  dom.patternModal.addEventListener("show.bs.modal", e => {
    patternLibrary.setSelected(null);
    dom.patternBtn.classList.add("active");
  });

  /**
   *
   */
  dom.patternModal.addEventListener("hide.bs.modal", e => {
    if (patternLibrary.selected === null)
      dom.patternBtn.classList.remove("active");
  });

  /**
   *
   */
  [...dom.panButtonGroup.children].forEach(child => {
    const btn = /** @type {HTMLButtonElement} */ (child);
    btn.addEventListener("focus", () => btn.blur());
    btn.addEventListener("mousedown", () => {
      const direction = btn.dataset.direction;
      if (direction) panControls?.start(direction);
    });
    btn.addEventListener("mouseup", () => panControls?.stop());
    btn.addEventListener("mouseleave", () => panControls?.stop());
  });

  /**
   *
   */
  dom.zoomSlider.addEventListener("input", e =>
    gameRenderer?.zoomAtPoint(
      Math.round(Math.pow(parseFloat(dom.zoomSlider.value), 2)),
      window.innerWidth / 2,
      window.innerHeight / 2
    )
  );
}

/**
 *
 */
function initializeGame() {
  const worker = new Worker("./worker.js");

  /** @type {CanvasRenderingContext2D} */
  const gridCtx = (dom.gridCanvas.getContext("2d"));
  /** @type {CanvasRenderingContext2D} */
  const cellCtx = (dom.cellCanvas.getContext("2d"));
  /** @type {CanvasRenderingContext2D} */
  const previewCtx = (dom.previewCanvas.getContext("2d"));

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
    patternLibrary,
    handleMouseChange
  );

  panControls = createPanControls(gameRenderer);

  document.body.hidden = false;

  handleResize();
}

/**
 *
 */
function terminateGame() {
  gameController?.terminate();
  gameRenderer?.clearAll();
  panControls?.stop();

  gameRenderer = null;
  gameController = null;
  mouseTracker = null;
  panControls = null;

  document.body.hidden = true;
}

/**
 *
 */
function handleResize() {
  gameRenderer?.setWindow(window.innerWidth, window.innerHeight);

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
  dom.defaultBtn.disabled = isPlaying;
  dom.patternBtn.disabled = isPlaying;

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
 * @param {number} centerRow
 * @param {number} centerCol
 */
function handleViewChange(zoom, centerRow, centerCol) {
  dom.rightStatus.textContent = `Zoom: ${zoom}, Position: (${centerCol},${centerRow})`;
  dom.zoomSlider.value = Math.sqrt(zoom).toString();
}

/**
 *
 * @param {boolean} isPanning
 */
function handleMouseChange(isPanning) {
  document.body.style.cursor = isPanning ? "all-scroll" : "default";
}

/**
 *
 * @param {boolean} isPatternSelected
 */
function handlePatternChange(isPatternSelected) {
  dom.defaultBtn.className = `btn btn-primary ${!isPatternSelected &&
    "active"}`;
  dom.patternBtn.className = `btn btn-primary ${isPatternSelected && "active"}`;

  mouseTracker?.forcePreviewCheck();
}

init();
