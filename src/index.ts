import "materialize-css/sass/materialize.scss";
import "./styles.scss";

import {
  canvasController,
  createCanvasController,
  destroyCanvasController
} from "./canvasController";
import {
  gameController,
  createGameController,
  destroyGameController
} from "./gameController";
import * as patternLibrary from "./patternLibrary";
import * as observables from "./observables";

/** Stores refrences to used DOM elements with JSDoc type casting */
const dom = {
  main: document.getElementById("main") as HTMLDivElement,
  canvasContainer: document.getElementById(
    "canvas-container"
  ) as HTMLDivElement,
  gridCanvas: document.getElementById("grid-canvas") as HTMLCanvasElement,
  cellCanvas: document.getElementById("cell-canvas") as HTMLCanvasElement,
  leftStatus: document.getElementById("left-status") as HTMLSpanElement,
  rightStatus: document.getElementById("right-status") as HTMLSpanElement,
  playIcon: document.getElementById("play-icon") as HTMLElement,
  pauseIcon: document.getElementById("pause-icon") as HTMLElement,
  defaultBtn: document.getElementById("default-btn") as HTMLButtonElement,
  patternBtn: document.getElementById("pattern-btn") as HTMLButtonElement,
  patternDropdown: document.getElementById(
    "pattern-dropdown"
  ) as HTMLDivElement,
  speedSlider: document.getElementById("speed-slider") as HTMLInputElement,
  zoomSlider: document.getElementById("zoom-slider") as HTMLInputElement
};

const isWasm = true;

/**
 *  Get color theme from local storage. If not set use prefrence from client os.
 */
document.documentElement.dataset.theme =
  localStorage.getItem("theme") ??
  (window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light");

/**
 * Perform all actions required on page load to bring game to a working state.
 */
(async () => {
  try {
    initializeGame();
    // Initialize pattern library object and related DOM elements.
    // Placed after game init to prevent any noticible delay in page load.
    await patternLibrary.loadDataFromFiles();
    dom.patternDropdown.innerHTML = patternLibrary.generateDropdownHTML();
    // @ts-ignore
    M.AutoInit();
  } catch (err) {
    /** Terminate game on error (most likely from pattern library). */
    console.error(err);
    terminateGame();
  }
})();

/**
 * Perform all actions necessary to initialize a new game.
 */
function initializeGame() {
  /** Initialize web worker which calculates game results. */
  const worker = new Worker("./worker.js");

  /** Get rendering contexts for all canvases. */
  const gridCtx = dom.gridCanvas.getContext("2d") as CanvasRenderingContext2D;
  const cellCtx = dom.cellCanvas.getContext("2d") as CanvasRenderingContext2D;

  /** Factory function for GameRenderer object. */
  createCanvasController(
    gridCtx,
    cellCtx,
    5000,
    document.documentElement.dataset.theme,
    observables.controllerSubject
  );
  if (canvasController === null) throw Error("");

  /** Factory function for GameController object. */
  createGameController(
    worker,
    canvasController,
    5000,
    isWasm,
    observables.controllerSubject
  );
  if (gameController === null) throw Error("");

  /** Ensure all UI elements are visible */
  document.body.hidden = false;
}

/**
 * Perform all actions necessary to terminate the current game.
 */
function terminateGame() {
  /** Call methods necessary to stop game fumctionality. */
  destroyCanvasController();
  destroyGameController();

  /** Clear selected pattern. */
  patternLibrary.setSelected(null);

  /** Hide all UI elements. */
  document.body.hidden = true;
}

/** Terminate game after any unhandled errors. */
window.addEventListener("error", terminateGame);

/** Disable all scrolling (except on modal). */
dom.main.addEventListener("wheel", e => e.preventDefault(), {
  passive: false
});

dom.patternBtn.addEventListener("mousedown", e => e.preventDefault());
dom.patternDropdown.addEventListener("mousedown", e => e.preventDefault());

/**
 * Updates navbar based on changes to gameController and viewController state.
 */
observables.controllerUpdate$.subscribe(
  ({isPlaying, isPaused, speed, zoom}) => {
    /** Toggle play/pause buttons based on current game state. */
    dom.playIcon.hidden = (isPlaying && !isPaused) ?? true;
    dom.pauseIcon.hidden = (!isPlaying || isPaused) ?? true;
    /** Disable edit buttons after game has started. */
    dom.defaultBtn.disabled = isPlaying ?? true;
    dom.patternBtn.disabled = isPlaying ?? true;
    /** Ensure speed slider values match the current game speed. */
    dom.speedSlider.value = speed?.id.toString();
    dom.speedSlider.parentElement?.setAttribute(
      "data-tooltip-content",
      `Speed: ${60 / speed?.cyclesPerRender} Generations / second`
    );
    /** Ensure zoom slider value matches the current zoom level. */
    dom.zoomSlider.value = Math.sqrt(zoom ?? 1).toString();
    dom.zoomSlider.parentElement?.setAttribute(
      "data-tooltip-content",
      `Zoom: ${zoom}%`
    );
  }
);

/**
 * Updates status bar based on changes to gameController and viewController state.
 */
observables.controllerUpdate$.subscribe(
  ({isPlaying, isPaused, generation, aliveCount, changedCount, row, col}) => {
    /** Update bottom bar with current game state. */
    dom.leftStatus.textContent =
      `${!isPlaying ? "Stopped" : !isPaused ? "Running" : "Paused"}, ` +
      `Generation: ${generation}, ` +
      `Population: ${aliveCount}, ` +
      `Changed Cells: ${changedCount ?? "0"}`;

    /** Update bottom bar with current view state. */
    dom.rightStatus.textContent = `Position: (${col},${row})`;
  }
);

/**
 * Perform necessary adjustments after window initialization or resize.
 */
observables.windowResize$.subscribe(() => {
  /** Updates game state with current window dimensions. */
  canvasController?.setWindow(window.innerWidth, window.innerHeight);
  /** Adjust all canvas dimensions to match window dimensions. */
  [dom.gridCanvas, dom.cellCanvas].forEach(canvas => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
});

observables.navButtonClick$.subscribe(btn => {
  switch (btn.id) {
    case "play-btn":
      if (gameController?.isGamePaused || !gameController?.isGameStarted)
        gameController?.play();
      else gameController?.pause();
      patternLibrary.setSelected(null);
      dom.defaultBtn.classList.add("disabled");
      dom.patternBtn.classList.add("disabled");
      break;
    case "default-btn":
      patternLibrary.setSelected(null);
      break;
    case "reset-btn":
      terminateGame();
      initializeGame();
      canvasController?.setWindow(window.innerWidth, window.innerHeight);
      dom.defaultBtn.classList.remove("disabled");
      dom.patternBtn.classList.remove("disabled");
      break;
    case "dark-btn":
      document.documentElement.dataset.theme =
        document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      canvasController?.setColorTheme(document.documentElement.dataset.theme);
      localStorage.setItem("theme", document.documentElement.dataset.theme);
      break;
    default:
      break;
  }
});

observables.navDown$.subscribe(target => {
  if (target.id === "pattern-btn")
    dom.patternDropdown.hidden = !dom.patternDropdown.hidden;
  else if (
    dom.patternDropdown.hidden === false &&
    target.closest("div")?.id !== "pattern-dropdown"
  )
    dom.patternDropdown.hidden = true;
});

observables.speedSlider$.subscribe(value => {
  const speedID = parseInt(value);
  gameController?.speed.set(speedID);
});

/** Update game zoom value on change in zoon slider position. */
observables.zoomSlider$.subscribe(value => {
  canvasController?.zoomAtPoint(
    Math.round(Math.pow(parseFloat(value), 2)),
    window.innerWidth / 2,
    window.innerHeight / 2
  );
});

observables.arrowKeyPress$.subscribe(key => {
  if (canvasController?.view?.panX && canvasController?.view?.panY)
    switch (key) {
      case "ArrowUp":
        canvasController.setView({panY: canvasController.view.panY - 2});
        break;
      case "ArrowDown":
        canvasController.setView({panY: canvasController.view.panY + 2});
        break;
      case "ArrowLeft":
        canvasController.setView({panX: canvasController.view.panX - 2});
        break;
      case "ArrowRight":
        canvasController.setView({panX: canvasController.view.panX + 2});
        break;
      default:
        break;
    }
});

observables.keyDown$.subscribe(e => {
  switch (e.key) {
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

observables.canvasHover$.subscribe(({e, pattern}) => {
  if (pattern) gameController?.placePreview(e.clientX, e.clientY, pattern);

  dom.canvasContainer.style.setProperty(
    "--tooltip-x-position",
    e.clientX.toString() + "px"
  );
  dom.canvasContainer.style.setProperty(
    "--tooltip-y-position",
    e.clientY.toString() + "px"
  );
  dom.canvasContainer.style.setProperty("--tooltip-transition", "none");
  dom.canvasContainer.style.setProperty("--tooltip-opacity", "0");
});

observables.canvasHoverPaused$.subscribe(({pattern}) => {
  if (pattern) {
    dom.canvasContainer.style.setProperty(
      "--tooltip-transition",
      "opacity 0.5s"
    );
    dom.canvasContainer.style.setProperty("--tooltip-opacity", "1");
  }
});

observables.canvasClick$.subscribe(({e, pattern}) => {
  if (dom.patternDropdown.hidden === false) dom.patternDropdown.hidden = true;
  else {
    if (pattern === null) gameController?.toggleCell(e.clientX, e.clientY);
    else gameController?.placePattern(e.clientX, e.clientY, pattern);
  }
});

observables.canvasDrag$.subscribe(({deltaX, deltaY}) => {
  if (canvasController?.view?.panX && canvasController?.view?.panY)
    canvasController.setView({
      panX: Math.round(canvasController.view.panX + deltaX),
      panY: Math.round(canvasController.view.panY + deltaY)
    });
  gameController?.clearPreview();
  document.body.style.cursor = "all-scroll";
});

observables.mouseUp$.subscribe(() => (document.body.style.cursor = "default"));

observables.canvasLeave$.subscribe(() => gameController?.clearPreview());

observables.canvasPinch$.subscribe(({scale, centerX, centerY}) => {
  if (canvasController?.view?.zoom)
    canvasController.zoomAtPoint(
      canvasController.view.zoom * scale,
      Math.round(centerX),
      Math.round(centerY)
    );
});

observables.canvasScroll$.subscribe((arr: WheelEvent[]) => {
  const currentZoom = canvasController?.view?.zoom;
  if (!canvasController || !currentZoom) return;

  const zoomFactor = arr
    .map(e => Math.max(-7, Math.min(e.deltaY, 10)) / 50)
    .reduce((accumulator, x) => accumulator + x, 0);

  const newZoom =
    currentZoom +
    Math.ceil(currentZoom * Math.abs(zoomFactor)) * Math.sign(zoomFactor);

  canvasController.zoomAtPoint(newZoom, arr[0].clientX, arr[0].clientY);
});

/** Set a new selected pattern on button click. */
observables.patternDropdownCLick$.subscribe(pattern => {
  patternLibrary.setSelected(pattern);
  dom.patternDropdown.hidden = true;
});

/** Set pattern library button as active when a pattern is selected, default otherwise. */
observables.patternSelection$.subscribe(pattern => {
  dom.defaultBtn.classList.toggle("active", pattern === null);
  dom.patternBtn.classList.toggle("active", pattern !== null);
});
