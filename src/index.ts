import {switchMap, map, first, delay, takeUntil, take} from "rxjs/operators";
import "materialize-css/sass/materialize.scss";
import "./styles.scss";

import {CanvasController, createCanvasController} from "./canvasController";
import {GameController, createGameController} from "./gameController";
import * as patternLibrary from "./patternLibrary";
import * as domEvents from "./domEvents";
import {interval} from "rxjs";

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
  patternList: document.getElementById("pattern-list") as HTMLDivElement,
  patternDetails: document.getElementById("pattern-details") as HTMLDivElement,
  speedSlider: document.getElementById("speed-slider") as HTMLInputElement,
  zoomSlider: document.getElementById("zoom-slider") as HTMLInputElement
};

const isWasm = true;

/** Variables for most game related objects. To be set by initializeGame function. */
let canvasController: CanvasController | null = null;
let gameController: GameController | null = null;

/** Get color theme from local storage. If not set use prefrence from client os. Defaults to light. */
document.documentElement.dataset.theme =
  localStorage.getItem("theme") ??
  (window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light");

/** Perform all actions required on page load to bring game to a working state. */
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
  canvasController = createCanvasController(
    gridCtx,
    cellCtx,
    5000,
    document.documentElement.dataset.theme,
    handleViewChange
  );
  /** Factory function for GameController object. */
  gameController = createGameController(
    worker,
    canvasController,
    5000,
    isWasm,
    handleGameChange
  );

  /** Ensure all UI elements are visible */
  document.body.hidden = false;
}

/**
 * Perform all actions necessary to terminate the current game.
 */
function terminateGame() {
  /** Call methods necessary to stop game fumctionality. */
  gameController?.terminate();
  canvasController?.clearCanvases();
  patternLibrary.setSelected(null);
  /** Delete references to relevant object to ensure they are garbage collected */
  canvasController = null;
  gameController = null;
  /** Hide all UI elements. */
  document.body.hidden = true;
}

/**
 * Observer function passed to GameController object.
 * Updates UI elements on changes to GameController state.
 * @param {boolean} isPlaying
 * @param {number} generation
 * @param {number} speed
 */
function handleGameChange(
  isPlaying: boolean,
  isPaused: boolean,
  generation: number,
  population: number,
  speedID: number,
  cyclesPerRender: number,
  calcTimePerGeneration: number,
  changedCellCount: number
) {
  const state = isPlaying ? (isPaused ? "Paused" : "Running") : "Stopped";
  /** Update bottom bar with current game state. */
  dom.leftStatus.textContent =
    `${state}, ` +
    `Generation: ${generation}, ` +
    `Population: ${population}, ` +
    `Changed Cells: ${changedCellCount}, ` +
    `Processing Time: ${calcTimePerGeneration.toFixed(3)} ms/generation`;
  /** Toggle play/pause buttons based on current game state. */
  dom.playIcon.hidden = isPlaying && !isPaused;
  dom.pauseIcon.hidden = !isPlaying || isPaused;
  /** Disable edit buttons after game has started. */
  dom.defaultBtn.disabled = isPlaying;
  dom.patternBtn.disabled = isPlaying;
  /** Ensure speed slider values match the current game speed. */
  dom.speedSlider.value = speedID.toString();
  dom.speedSlider.parentElement?.setAttribute(
    "data-tooltip-content",
    `Speed: ${60 / cyclesPerRender} Generations / second`
  );
}

/**
 * Observer function passed to GameRenderer object.
 * Updates UI elements on changes to GameRenderer view state.
 * @param {number} zoom
 * @param {number} centerRow
 * @param {number} centerCol
 */
function handleViewChange(zoom: number, centerRow: number, centerCol: number) {
  /** Update bottom bar with current view state. */
  dom.rightStatus.textContent = `Zoom: ${zoom}, Position: (${centerCol},${centerRow})`;
  /** Ensure zoom slider value matches the current zoom level. */
  dom.zoomSlider.value = Math.sqrt(zoom).toString();
  dom.zoomSlider.parentElement?.setAttribute(
    "data-tooltip-content",
    `Zoom: ${zoom}%`
  );
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
 * Perform necessary adjustments after window initialization or resize.
 */
domEvents.windowResize$.subscribe(() => {
  /** Updates game state with current window dimensions. */
  canvasController?.setWindow(window.innerWidth, window.innerHeight);
  /** Adjust all canvas dimensions to match window dimensions. */
  [dom.gridCanvas, dom.cellCanvas].forEach(canvas => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
});

domEvents.navButtonClick$.subscribe(btn => {
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

domEvents.navDown$.subscribe(target => {
  if (target.id === "pattern-btn") {
    dom.patternDropdown.hidden = !dom.patternDropdown.hidden;
  } else if (
    dom.patternDropdown.hidden === false &&
    target.closest("div")?.id !== "pattern-dropdown"
  )
    dom.patternDropdown.hidden = true;
});

domEvents.speedSlider$.subscribe(value => {
  const speedID = parseInt(value);
  gameController?.speed.set(speedID);
});

/** Update game zoom value on change in zoon slider position. */
domEvents.zoomSlider$.subscribe(value => {
  canvasController?.zoomAtPoint(
    Math.round(Math.pow(parseFloat(value), 2)),
    window.innerWidth / 2,
    window.innerHeight / 2
  );
});

domEvents.arrowKeyPress$.subscribe(key => {
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

domEvents.keyDown$.subscribe(e => {
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

domEvents.canvasHover$
  .pipe(
    switchMap(e =>
      patternLibrary.selection$.pipe(map(pattern => ({e, pattern})))
    )
  )
  .subscribe(({e, pattern}) => {
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

domEvents.canvasHoverPaused$
  .pipe(switchMap(() => patternLibrary.selection$))
  .subscribe(pattern => {
    if (pattern) {
      dom.canvasContainer.style.setProperty(
        "--tooltip-transition",
        "opacity 0.5s"
      );
      dom.canvasContainer.style.setProperty("--tooltip-opacity", "1");
    }
  });

domEvents.canvasClick$
  .pipe(
    switchMap(e =>
      patternLibrary.selection$.pipe(
        first(),
        map(pattern => ({e, pattern}))
      )
    )
  )
  .subscribe(({e, pattern}) => {
    if (dom.patternDropdown.hidden === false) {
      dom.patternDropdown.hidden = true;
      return;
    }

    if (pattern === null) gameController?.toggleCell(e.clientX, e.clientY);
    else gameController?.placePattern(e.clientX, e.clientY, pattern);
  });

domEvents.canvasDrag$.subscribe(({deltaX, deltaY}) => {
  if (canvasController?.view?.panX && canvasController?.view?.panY)
    canvasController.setView({
      panX: Math.round(canvasController.view.panX + deltaX),
      panY: Math.round(canvasController.view.panY + deltaY)
    });
  gameController?.clearPreview();
  document.body.style.cursor = "all-scroll";
});

domEvents.mouseUp$.subscribe(e => (document.body.style.cursor = "default"));

domEvents.canvasLeave$.subscribe(() => gameController?.clearPreview());

domEvents.canvasPinch$.subscribe(({scale, centerX, centerY}) => {
  if (canvasController?.view?.zoom)
    canvasController.zoomAtPoint(
      canvasController.view.zoom * scale,
      Math.round(centerX),
      Math.round(centerY)
    );
});

domEvents.canvasScroll$.subscribe((arr: WheelEvent[]) => {
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

domEvents.patternDropdownCLick$.subscribe(pattern => {
  console.log(pattern);

  /** Set a new selected pattern on button click. */
  patternLibrary.setSelected(pattern);
  dom.patternDropdown.hidden = true;
});

/** Set pattern library button as active when a pattern is selected, default otherwise. */
patternLibrary.selection$.subscribe(pattern => {
  dom.defaultBtn.classList.toggle("active", pattern === null);
  dom.patternBtn.classList.toggle("active", pattern !== null);
});

window.addEventListener("scroll", function (e) {
  console.log(e);
});
