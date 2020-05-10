import M from "materialize-css";
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
import {controllerSubject} from "./observables";

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
    // Initialize pattern library object (after initializeGame to not block game load).
    await patternLibrary.loadDataFromFiles();
    // Generate and insert HTML for pattern library dropdown.
    patternLibrary.generateDropdownHTML("pattern-dropdown");
    // Initialize js components from materialize library.
    M.AutoInit();
  } catch (err) {
    // Terminate game on error (most likely from pattern library).
    console.error(err);
    terminateGame();
  }
})();

/**
 * Perform all actions necessary to initialize a new game.
 */
export function initializeGame() {
  /** Initialize web worker which calculates game results. */
  const worker = new Worker("./worker.js");

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
  createCanvasController(
    gridCtx,
    cellCtx,
    5000,
    document.documentElement.dataset.theme,
    controllerSubject
  );
  if (canvasController === null) throw Error("");

  /** Factory function for GameController object. */
  createGameController(
    worker,
    canvasController,
    5000,
    isWasm,
    controllerSubject
  );
  if (gameController === null) throw Error("");

  /** Ensure all UI elements are visible */
  document.body.hidden = false;
}

/**
 * Perform all actions necessary to terminate the current game.
 */
export function terminateGame() {
  /** Call methods necessary to stop game fumctionality. */
  destroyCanvasController();
  destroyGameController();

  /** Clear selected pattern. */
  patternLibrary.setSelected(null);

  /** Hide all UI elements. */
  document.body.hidden = true;
}
