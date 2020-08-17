import "materialize-css";
import "materialize-css/sass/materialize.scss";
import "./styles.scss";

import {CanvasController} from "./canvasController";
import {GameController} from "./gameController";
import * as patternLibrary from "./patternLibrary";
import {controllerSubject} from "./observables";

export let canvasController: CanvasController | null = null;
export let gameController: GameController | null = null;
let worker: Worker;

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
    // Initialize pattern library object (after initializeGame to not block game load).
    await patternLibrary.loadDataFromFiles();
    // Generate and insert HTML for pattern library dropdown.
    patternLibrary.generateDropdownHTML("pattern-dropdown");
  } catch (err) {
    // Terminate game on error (most likely from pattern library).
    console.error(err);
    terminateGame();
  }
})();

/**
 * Perform all actions necessary to initialize a new game.
 */
export function initializeGame(): void {
  /** Initialize web worker which calculates game results. */
  worker = new Worker("./worker.js");
  worker.postMessage({
    action: "init",
    payload: {size: 5000, wasm: true}
  });

  /** Get rendering contexts for all canvases. */
  const gridCanvas = document.getElementById(
    "grid-canvas"
  ) as HTMLCanvasElement;
  const cellCanvas = document.getElementById(
    "cell-canvas"
  ) as HTMLCanvasElement;
  const gridCtx = gridCanvas.getContext("2d") as CanvasRenderingContext2D;
  const cellCtx = cellCanvas.getContext("2d") as CanvasRenderingContext2D;

  /** Factory function for CanvasController object. */
  canvasController = new CanvasController(
    gridCtx,
    cellCtx,
    5000,
    document.documentElement.dataset.theme,
    controllerSubject
  );

  /** Factory function for GameController object. */
  gameController = new GameController(
    worker,
    canvasController,
    5000,
    controllerSubject
  );

  /** Ensure all UI elements are visible */
  document.body.hidden = false;
}

/**
 * Perform all actions necessary to terminate the current game.
 */
export function terminateGame(): void {
  /** Call methods necessary to stop game fumctionality. */
  canvasController?.clearCanvases();
  canvasController = null;
  gameController?.terminate();
  gameController = null;
  worker.terminate();

  /** Clear selected pattern. */
  patternLibrary.setSelected(null);

  /** Hide all UI elements. */
  document.body.hidden = true;
}
