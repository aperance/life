import "@fortawesome/fontawesome-free/js/all";
import { ViewController, createViewController } from "./viewController";
import { GameController, createGameController } from "./gameController";
import { MouseTracker, createMouseTracker } from "./mouseTracker";
import { PatternLibrary } from "./patternLibrary";
import {
  canvasClick$,
  canvasDrag$,
  canvasHover$,
  canvasLeave$,
  keyDown$,
  arrowKeyPress$
} from "./observables";

/** Stores refrences to used DOM elements with JSDoc type casting */
const dom = {
  /**  @type {HTMLDivElement} */
  main: (document.getElementById("main")),
  /**  @type {HTMLCanvasElement} */
  gridCanvas: (document.getElementById("grid-canvas")),
  /** @type {HTMLCanvasElement} */
  cellCanvas: (document.getElementById("cell-canvas")),
  /** @type {HTMLSpanElement} */
  leftStatus: (document.getElementById("left-status")),
  /** @type {HTMLSpanElement} */
  rightStatus: (document.getElementById("right-status")),
  /** @type {HTMLElement} */
  nav: (document.getElementById("nav")),
  /** @type {HTMLElement} */
  playIcon: (document.getElementById("play-icon")),
  /** @type {HTMLElement} */
  pauseIcon: (document.getElementById("pause-icon")),
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
  /** @type {HTMLInputElement} */
  zoomSlider: (document.getElementById("zoom-slider"))
};

const wasm = true;

/** Factory function for PatternLibrary object. */
/** @type {PatternLibrary} */
const patternLibrary = new PatternLibrary(handlePatternChange);

/** Variables for most game related objects. To be set by initializeGame function. */
/** @type {ViewController?} */
let viewController = null;
/** @type {GameController?} */
let gameController = null;
/** @type {MouseTracker?} */
let mouseTracker = null;

/** Perform all actions required on page load to bring game to a working state. */
(async () => {
  try {
    setEventListeners();
    initializeGame();
    // Initialize pattern library object and related DOM elements.
    // Placed after game init to prevent any noticible delay in page load.
    await patternLibrary.loadDataFromFiles();
    dom.patternList.innerHTML = patternLibrary.generateListHTML();
    // @ts-ignore
    M.AutoInit();
  } catch (err) {
    /** Terminate game on error (most likely from pattern library). */
    console.error(err);
    terminateGame();
  }
})();

/**
 * Sets all necessary event listeners DOM element.
 */
function setEventListeners() {
  /** Terminate game after any unhandled errors. */
  window.addEventListener("error", terminateGame);

  /** Update game state on window resize. */
  window.addEventListener("resize", handleResize);

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
  dom.nav.addEventListener("click", e => {
    // @ts-ignore
    const btn = e.target?.closest("a");

    /** Prevent focus on top bar buttons. */
    if (btn?.id !== "github-btn") e.preventDefault();

    if (btn?.dataset.speed) {
      /** Update game speed on selection of new spped in dropdown. */
      gameController?.setSpeed(parseFloat(btn.dataset.speed));
    } else {
      /** Perform intended action on click of top bar buttons. */
      if (btn?.id === "play-btn") {
        if (gameController?.isGamePaused || !gameController?.isGameStarted)
          gameController?.play();
        else gameController?.pause();
      } else if (btn?.id === "default-btn") patternLibrary.setSelected(null);
      else if (btn?.id === "reset-btn") {
        terminateGame();
        initializeGame();
      }
    }
  });

  /** Prevent focus of pattern button after modal close. */
  dom.patternBtn.addEventListener("focus", () => dom.patternBtn.blur());

  /** Prevent focus of speed button after dropdown close. */
  dom.speedBtn.addEventListener("focus", () => dom.speedBtn.blur());

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

  /** Update game zoom value on change in zoon slider position. */
  dom.zoomSlider.addEventListener("input", e =>
    viewController?.zoomAtPoint(
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

  /** Factory function for GameRenderer object. */
  viewController = createViewController(
    gridCtx,
    cellCtx,
    5000,
    handleViewChange
  );
  /** Factory function for GameController object. */
  gameController = createGameController(
    worker,
    viewController,
    patternLibrary,
    5000,
    wasm,
    handleGameChange
  );
  /** Factory function for MouseTracker object. */
  mouseTracker = createMouseTracker(
    viewController,
    gameController,
    handleMouseChange
  );

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
  viewController?.clearCanvases();
  patternLibrary.setSelected(null);
  /** Delete references to relevant object to ensure they are garbage collected */
  viewController = null;
  gameController = null;
  mouseTracker = null;
  /** Hide all UI elements. */
  document.body.hidden = true;
}

/**
 * Perform necessary adjustments after window initialization or resize.
 */
function handleResize() {
  /** Updates game state with current window dimensions. */
  viewController?.setWindow(window.innerWidth, window.innerHeight);
  /** Adjust all canvas dimensions to match window dimensions. */
  [dom.gridCanvas, dom.cellCanvas].forEach(canvas => {
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
  dom.playIcon.hidden = isPlaying && !isPaused;
  dom.pauseIcon.hidden = !isPlaying || isPaused;
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
  dom.defaultBtn.className = `waves-effect waves-light btn-flat ${!isPatternSelected &&
    "active"}`;
  dom.patternBtn.className = `waves-effect waves-light btn-flat modal-trigger ${isPatternSelected &&
    "active"}`;

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

arrowKeyPress$.subscribe(key => {
  switch (key) {
    case "ArrowUp":
      viewController?.setView({ panY: viewController.view.panY - 2 });
      break;
    case "ArrowDown":
      viewController?.setView({ panY: viewController.view.panY + 2 });
      break;
    case "ArrowLeft":
      viewController?.setView({ panX: viewController.view.panX - 2 });
      break;
    case "ArrowRight":
      viewController?.setView({ panX: viewController.view.panX + 2 });
      break;
    default:
      break;
  }
});

keyDown$.subscribe(key => {
  switch (key) {
    case "Escape":
      patternLibrary.setSelected(null);
      gameController?.clearPreview();
      break;
    case "r":
      patternLibrary.rotateSelected();
      break;
    case "f":
      patternLibrary.flipSelected();
      break;
    default:
      break;
  }
});

canvasClick$.subscribe((/** @type {MouseEvent} */ { clientX, clientY }) => {
  if (patternLibrary.isSelected) gameController?.placePattern(clientX, clientY);
  else gameController?.toggleCell(clientX, clientY);
});

canvasDrag$.subscribe(({ deltaX, deltaY }) => {
  if (patternLibrary.isSelected) gameController?.clearPreview();
  viewController?.setView({
    panX: Math.round(viewController?.view.panX + deltaX),
    panY: Math.round(viewController?.view.panY + deltaY)
  });
  document.body.style.cursor = "all-scroll";
});

canvasHover$.subscribe((/** @type {MouseEvent} */ { clientX, clientY }) => {
  if (patternLibrary.isSelected) gameController?.placePreview(clientX, clientY);
  document.body.style.cursor = "default";
});

canvasLeave$.subscribe(() => {
  if (patternLibrary.isSelected) gameController?.clearPreview();
});
