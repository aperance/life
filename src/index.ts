import {switchMap, map, first} from "rxjs/operators";
import "materialize-css/sass/materialize.scss";
import "./styles.scss";

import {ViewController, createViewController} from "./viewController";
import {GameController, createGameController} from "./gameController";
import * as patternLibrary from "./patternLibrary";
import * as domEvents from "./domEvents";

/** Stores refrences to used DOM elements with JSDoc type casting */
const dom = {
  main: document.getElementById("main") as HTMLDivElement,
  gridCanvas: document.getElementById("grid-canvas") as HTMLCanvasElement,
  cellCanvas: document.getElementById("cell-canvas") as HTMLCanvasElement,
  leftStatus: document.getElementById("left-status") as HTMLSpanElement,
  rightStatus: document.getElementById("right-status") as HTMLSpanElement,
  playIcon: document.getElementById("play-icon") as HTMLElement,
  pauseIcon: document.getElementById("pause-icon") as HTMLElement,
  speedBtn: document.getElementById("speed-btn") as HTMLButtonElement,
  defaultBtn: document.getElementById("default-btn") as HTMLButtonElement,
  patternBtn: document.getElementById("pattern-btn") as HTMLButtonElement,
  patternList: document.getElementById("pattern-list") as HTMLDivElement,
  patternDetails: document.getElementById("pattern-details") as HTMLDivElement,
  zoomSlider: document.getElementById("zoom-slider") as HTMLInputElement
};

const isWasm = true;

/** Variables for most game related objects. To be set by initializeGame function. */
let viewController: ViewController | null = null;
let gameController: GameController | null = null;

document.documentElement.dataset.theme =
  localStorage.getItem("theme") ?? "light";

/** Perform all actions required on page load to bring game to a working state. */
(async () => {
  try {
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
 * Perform all actions necessary to initialize a new game.
 */
function initializeGame() {
  /** Initialize web worker which calculates game results. */
  const worker = new Worker("./worker.js");

  /** Get rendering contexts for all canvases. */
  const gridCtx = dom.gridCanvas.getContext("2d") as CanvasRenderingContext2D;
  const cellCtx = dom.cellCanvas.getContext("2d") as CanvasRenderingContext2D;

  /** Factory function for GameRenderer object. */
  viewController = createViewController(
    gridCtx,
    cellCtx,
    5000,
    document.documentElement.dataset.theme,
    handleViewChange
  );
  /** Factory function for GameController object. */
  gameController = createGameController(
    worker,
    viewController,
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
  viewController?.clearCanvases();
  patternLibrary.setSelected(null);
  /** Delete references to relevant object to ensure they are garbage collected */
  viewController = null;
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
  speed: number
) {
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
    (6 / speed).toString().replace("0.5", "1/2").replace("0.25", "1/4") + "x";
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
}

/** Terminate game after any unhandled errors. */
window.addEventListener("error", terminateGame);

/** Disable all scrolling (except on modal). */
dom.main.addEventListener("wheel", e => e.preventDefault(), {
  passive: false
});

/**
 * Perform necessary adjustments after window initialization or resize.
 */
domEvents.windowResize$.subscribe(() => {
  /** Updates game state with current window dimensions. */
  viewController?.setWindow(window.innerWidth, window.innerHeight);
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
      break;
    case "default-btn":
      patternLibrary.setSelected(null);
      break;
    case "reset-btn":
      terminateGame();
      initializeGame();
      viewController?.setWindow(window.innerWidth, window.innerHeight);
      break;
    case "dark-btn":
      document.documentElement.dataset.theme =
        document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      viewController?.setColorTheme(document.documentElement.dataset.theme);
      localStorage.setItem("theme", document.documentElement.dataset.theme);
      break;
    default:
      /** Update game speed on selection of new spped in dropdown. */
      if (btn.dataset.speed)
        gameController?.setSpeed(parseFloat(btn.dataset.speed));
      break;
  }
});

/** Update game zoom value on change in zoon slider position. */
domEvents.zoomSlider$.subscribe(value => {
  viewController?.zoomAtPoint(
    Math.round(Math.pow(parseFloat(value), 2)),
    window.innerWidth / 2,
    window.innerHeight / 2
  );
});

domEvents.arrowKeyPress$.subscribe(key => {
  if (viewController?.view?.panX && viewController?.view?.panY)
    switch (key) {
      case "ArrowUp":
        viewController.setView({panY: viewController.view.panY - 2});
        break;
      case "ArrowDown":
        viewController.setView({panY: viewController.view.panY + 2});
        break;
      case "ArrowLeft":
        viewController.setView({panX: viewController.view.panX - 2});
        break;
      case "ArrowRight":
        viewController.setView({panX: viewController.view.panX + 2});
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
    document.body.style.cursor = "default";
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
    if (pattern === null) gameController?.toggleCell(e.clientX, e.clientY);
    else gameController?.placePattern(e.clientX, e.clientY, pattern);
  });

domEvents.canvasDrag$.subscribe(({deltaX, deltaY}) => {
  if (viewController?.view?.panX && viewController?.view?.panY)
    viewController.setView({
      panX: Math.round(viewController.view.panX + deltaX),
      panY: Math.round(viewController.view.panY + deltaY)
    });
  gameController?.clearPreview();
  document.body.style.cursor = "all-scroll";
});

domEvents.canvasLeave$.subscribe(() => gameController?.clearPreview());

domEvents.canvasPinch$.subscribe(({scale, centerX, centerY}) => {
  if (viewController?.view?.zoom)
    viewController.zoomAtPoint(
      viewController.view.zoom * scale,
      Math.round(centerX),
      Math.round(centerY)
    );
});

domEvents.canvasScroll$.subscribe(e => {
  if (viewController?.view?.zoom) {
    const newZoom =
      viewController.view.zoom +
      Math.ceil(viewController.view.zoom / 25) * Math.sign(e.deltaY);

    viewController.zoomAtPoint(newZoom, e.clientX, e.clientY);
  }
});

//@ts-ignore
domEvents.patternModalCLick$.subscribe(({pattern, role}) => {
  /** Update details section on selection of pattern from list. */
  if (role === "listItem")
    dom.patternDetails.innerHTML = patternLibrary.generateDetailHTML(pattern);
  /** Set a new selected pattern on confirmation button click. */
  if (role === "selectBtn") patternLibrary.setSelected(pattern);
});

/** Set pattern library button as active when a pattern is selected, default otherwise. */
patternLibrary.selection$.subscribe(pattern => {
  dom.defaultBtn.classList.toggle("active", pattern === null);
  dom.patternBtn.classList.toggle("active", pattern !== null);
});
