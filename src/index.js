import "@fortawesome/fontawesome-free/js/all";
import { GameRenderer, createGameRenderer } from "./gameRenderer";
import { GameController, createGameController } from "./gameController";
import { MouseTracker, createMouseTracker } from "./mouseTracker";
import { PanControls, createPanControls } from "./panControls";
import { PatternLibrary } from "./patternLibrary";

/** Stores refrences to used DOM elements with JSDoc type casting */
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

/** Factory function for PatternLibrary object. */
/** @type {PatternLibrary} */
const patternLibrary = new PatternLibrary(handlePatternChange);

/** Variables for most game related objects. To be set by initializeGame function. */
/** @type {GameRenderer?} */
let gameRenderer = null;
/** @type {GameController?} */
let gameController = null;
/** @type {MouseTracker?} */
let mouseTracker = null;
/** @type {PanControls?} */
let panControls = null;

/**
 * Perform all actions required on page load to bring game to a working state.
 * @async
 */
async function init() {
  try {
    setEventListeners();
    initializeGame();
    /**
     * Initialize pattern library object and related DOM elements.
     * Placed after game init to prevent any noticible delay in page load.
     */
    await patternLibrary.loadDataFromFiles();
    dom.patternList.innerHTML = patternLibrary.generateListHTML();
    // @ts-ignore
    [...dom.categoryLinks].forEach(el => new Collapse(el));
  } catch (err) {
    /** Terminate game on error (most likely from pattern library). */
    console.error(err);
    terminateGame();
  }
}

/**
 * Sets all necessary DOM element event listeners.
 */
function setEventListeners() {
  /** Terminate game after any unhandled errors. */
  window.addEventListener("error", terminateGame);

  /** Update game state on window resize. */
  window.addEventListener("resize", handleResize);

  /** Global keypress handler. */
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") patternLibrary.setSelected(null);
    else if (e.key === "r") patternLibrary.rotateSelected();
    else if (e.key === "f") patternLibrary.flipSelected();
    else if (e.key.includes("Arrow")) {
      const direction = e.key.replace("Arrow", "").toLowerCase();
      panControls?.start(direction);
    }
  });

  /** Stop panning on keyup of arrow buttons. */
  document.addEventListener("keyup", e => {
    if (e.key.includes("Arrow")) panControls?.stop();
  });

  /** Forward all mouse events to mouseTracker object (except on modal). */
  document.addEventListener("mouseup", e => {
    mouseTracker?.mouseUp(e, isOnCanvas(e), patternLibrary.isSelected);
  });
  document.addEventListener("mousedown", e => {
    mouseTracker?.mouseDown(e, isOnCanvas(e));
  });
  document.addEventListener("mousemove", e => {
    mouseTracker?.mouseMove(e, isOnCanvas(e), patternLibrary.isSelected);
  });
  document.addEventListener("mouseleave", () => {
    mouseTracker?.mouseLeave();
  });
  document.addEventListener("wheel", e => {
    mouseTracker?.mouseWheel(e, isOnCanvas(e)),
      {
        passive: true
      };
  });

  /** Disable all scrolling (except on modal). */
  dom.main.addEventListener("wheel", e => e.preventDefault(), {
    passive: false
  });

  /** Handle all clicks on top bar buttons/dropdowns. */
  dom.topBar.addEventListener("click", e => {
    // @ts-ignore
    const btn = e.target?.closest("button");

    if (btn?.dataset.speed) {
      /** Update game speed on selection of new spped in dropdown. */
      gameController?.setSpeed(parseFloat(btn.dataset.speed));
    } else {
      /** Perform intended action on click of top bar buttons. */
      if (btn?.id === "play-btn") gameController?.play();
      else if (btn?.id === "pause-btn") gameController?.pause();
      else if (btn?.id === "default-btn") patternLibrary.setSelected(null);
      else if (btn?.id === "reset-btn") {
        terminateGame();
        initializeGame();
      }
    }
  });

  /** Prevent focus on top bar buttons. */
  dom.topBar.addEventListener("mousedown", e => e.preventDefault());

  /** Prevent focus of pattern button after modal close. */
  dom.patternBtn.addEventListener("focus", () => dom.patternBtn.blur());

  /** Handle all clicks on pattern library modal. */
  dom.patternModal.addEventListener("click", e => {
    // @ts-ignore
    const { pattern, role } = e.target?.dataset;

    /** Update details section on selection of pattern from list. */
    if (pattern && role === "listItem")
      dom.patternDetails.innerHTML = patternLibrary.generateDetailHTML(pattern);
    /** Set a new selected pattern on confirmation button click. */
    if (pattern && role === "selectBtn") patternLibrary.setSelected(pattern);
  });

  /** On modal open, clear previously selected pattern and activate pattern button. */
  dom.patternModal.addEventListener("show.bs.modal", e => {
    patternLibrary.setSelected(null);
    dom.patternBtn.classList.add("active");
  });

  /** On modal close, set pattern button as inactive if no pattern was selected. */
  dom.patternModal.addEventListener("hide.bs.modal", e => {
    if (patternLibrary.selected === null)
      dom.patternBtn.classList.remove("active");
  });

  /** Add necessary event listeners for each pan buttons. */
  [...dom.panButtonGroup.children].forEach(child => {
    const btn = /** @type {HTMLButtonElement} */ (child);
    btn.addEventListener("focus", () => btn.blur());
    btn.addEventListener("mousedown", () => {
      if (btn.dataset.direction) panControls?.start(btn.dataset.direction);
    });
    btn.addEventListener("mouseup", () => panControls?.stop());
    btn.addEventListener("mouseleave", () => panControls?.stop());
  });

  /** Update game zoom value on change in zoon slider position. */
  dom.zoomSlider.addEventListener("input", e =>
    gameRenderer?.zoomAtPoint(
      Math.round(Math.pow(parseFloat(dom.zoomSlider.value), 2)),
      window.innerWidth / 2,
      window.innerHeight / 2
    )
  );
}

/**
 * Perform all actions necessary to initialize a new game.
 */
function initializeGame() {
  /** Initialize web worker which calculates game results. */
  const worker = new Worker("./worker.js");
  /** Get rendering contexts for all canvases. */
  /** @type {CanvasRenderingContext2D} */
  const gridCtx = (dom.gridCanvas.getContext("2d"));
  /** @type {CanvasRenderingContext2D} */
  const cellCtx = (dom.cellCanvas.getContext("2d"));
  /** @type {CanvasRenderingContext2D} */
  const previewCtx = (dom.previewCanvas.getContext("2d"));

  /** Factory function for GameRenderer object. */
  gameRenderer = createGameRenderer(
    gridCtx,
    cellCtx,
    previewCtx,
    5000,
    handleViewChange
  );
  /** Factory function for GameController object. */
  gameController = createGameController(
    worker,
    gameRenderer,
    patternLibrary,
    5000,
    wasm,
    handleGameChange
  );
  /** Factory function for MouseTracker object. */
  mouseTracker = createMouseTracker(
    gameRenderer,
    gameController,
    handleMouseChange
  );
  /** Factory function for PanControls object. */
  panControls = createPanControls(gameRenderer);

  /** Ensure all UI elements are visible */
  document.body.hidden = false;
  /** Ensure game has correct window dimensions */
  handleResize();
}

/**
 * Perform all actions necessary to terminate the current game.
 */
function terminateGame() {
  /** Call methods necessary to stop game fumctionality. */
  gameController?.terminate();
  gameRenderer?.clearCanvases();
  panControls?.stop();
  /** Delete references to relevant object to ensure they are garbage collected */
  gameRenderer = null;
  gameController = null;
  mouseTracker = null;
  panControls = null;
  /** Hide all UI elements. */
  document.body.hidden = true;
}

/**
 * Perform necessary adjustments after window initialization or resize.
 */
function handleResize() {
  /** Updates game state with current window dimensions. */
  gameRenderer?.setWindow(window.innerWidth, window.innerHeight);
  /** Adjust all canvas dimensions to match window dimensions. */
  [dom.gridCanvas, dom.cellCanvas, dom.previewCanvas].forEach(canvas => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

/**
 * Observer function passed to GameController object.
 * Updates UI elements on changes to GameController state.
 * @param {boolean} isPlaying
 * @param {number} generation
 * @param {number} speed
 */
function handleGameChange(isPlaying, isPaused, generation, population, speed) {
  const state = isPlaying ? (isPaused ? "Paused" : "Running") : "Stopped";
  /** Update bottom bar with current game state. */
  dom.leftStatus.textContent = `${state}, Generation: ${generation}, Population: ${population}`;
  /** Toggle play/pause buttons based on current game state. */
  dom.playBtn.hidden = isPlaying && !isPaused;
  dom.pauseBtn.hidden = !isPlaying || isPaused;
  /** Disable edit buttons after game has started. */
  dom.defaultBtn.disabled = isPlaying;
  dom.patternBtn.disabled = isPlaying;
  /** Ensure speed button value matches the current game speed. */
  //@ts-ignore
  dom.speedBtn.querySelector("span").textContent =
    (6 / speed)
      .toString()
      .replace("0.5", "1/2")
      .replace("0.25", "1/4") + "x";
}

/**
 * Observer function passed to GameRenderer object.
 * Updates UI elements on changes to GameRenderer view state.
 * @param {number} zoom
 * @param {number} centerRow
 * @param {number} centerCol
 */
function handleViewChange(zoom, centerRow, centerCol) {
  /** Update bottom bar with current view state. */
  dom.rightStatus.textContent = `Zoom: ${zoom}, Position: (${centerCol},${centerRow})`;
  /** Ensure zoom slider value matches the current zoom level. */
  dom.zoomSlider.value = Math.sqrt(zoom).toString();
}

/**
 * Observer function passed to MouseTracker object.
 * Updates UI elements on changes to MouseTracker state.
 * @param {boolean} isPanning
 */
function handleMouseChange(isPanning) {
  /** Set cursor to multidirection arrow when panning, default otherwise. */
  document.body.style.cursor = isPanning ? "all-scroll" : "default";
}

/**
 * Observer function passed to PatternLibrary object.
 * Updates UI elements on changes to PatternLibrary state.
 * @param {boolean} isPatternSelected
 */
function handlePatternChange(isPatternSelected) {
  /** Set pattern library button as active when a pattern is selected, default otherwise. */
  dom.defaultBtn.className = `btn btn-primary ${!isPatternSelected &&
    "active"}`;
  dom.patternBtn.className = `btn btn-primary ${isPatternSelected && "active"}`;

  /** Force mouseTracker to reevaluate due to change in selected pattern. */
  mouseTracker?.forcePreviewCheck(isPatternSelected);
}

/**
 * Determines if the mouse pointer is directly over the canvas,
 * and not a button or modal, based on the provided event object.
 * @param {WheelEvent | MouseEvent} e
 * @returns {boolean}
 */
function isOnCanvas(e) {
  const target = /** @type {HTMLElement} */ (e.target);
  return target.id === "cell-canvas" || target.id === "top-bar";
}

/** Call init function on file load. */
init();
