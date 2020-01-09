import "@fortawesome/fontawesome-free/js/all";
import { createGameRenderer } from "./gameRenderer";
import { createGameController } from "./gameController";
import { createMouseTracker } from "./mouseTracker";
import { createPanControls } from "./panControls";
import { patternCategories, createPatternLibrary } from "./patternLibrary";

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
/** @type {Map<string,import('./patternLibrary').PatternData>} */
let patternLibrary;

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

/**
 *
 */
async function init() {
  try {
    setEventListeners();
    initializeGame();
    patternLibrary = await createPatternLibrary();
    dom.patternList.innerHTML = generatePatternListHTML();
    // @ts-ignore
    [...dom.categoryLinks].forEach(el => new Collapse(el));
  } catch (err) {
    console.error(err);
  }
}

/**
 *
 */
function setEventListeners() {
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
    if (btn?.dataset.speed)
      gameController.setSpeed(parseFloat(btn.dataset.speed));
    else if (btn?.id === "play-btn") gameController.play();
    else if (btn?.id === "pause-btn") gameController.pause();
    else if (btn?.id === "default-btn") mouseTracker.clearPattern();
  });

  dom.patternModal.addEventListener("click", e => {
    /** @type {HTMLElement} */
    const el = (e.target);
    if (el.dataset.pattern) {
      const id = el.dataset.pattern;
      const patternArray = patternLibrary.get(id)?.array;
      if (!patternArray) console.error("No pattern data found for " + id);
      else if (el.dataset.role === "listItem")
        dom.patternDetails.innerHTML = generatePatternDetailsHTML(id);
      else if (el.dataset.role === "addBtn")
        mouseTracker.setPattern(e, patternArray);
      else if (el.dataset.role === "replaceBtn") {
        const { row, col } = gameRenderer.xyToRowCol(
          window.innerWidth / 2,
          window.innerHeight / 2
        );
        gameController.clearAliveCells();
        gameController.placeElement(row, col, patternArray);
      }
    } else mouseTracker.clearPattern();
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
    btn.addEventListener("mousedown", () => {
      /** @type {string} */
      const direction = (btn.dataset.direction);
      panControls.start(direction);
    });
    btn.addEventListener("mouseup", () => {
      btn.blur();
      panControls.stop();
    });
    btn.addEventListener("mouseleave", () => {
      btn.blur();
      panControls.stop();
    });
  });

  dom.zoomSlider.addEventListener("input", e =>
    gameRenderer.zoomAtPoint(
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

/**
 * @returns {string}
 */
function generatePatternListHTML() {
  return `<div class="list-group">
      ${Object.entries(patternCategories)
        .map(
          ([category, contents], index) =>
            `<a class="list-group-item list-group-item-action collapse-link"
              data-toggle="collapse"
              href="#category${index}">
              <strong>${category}</strong>
            </a>
            <div id="category${index}" class="collapse">
              ${contents
                .map(
                  id =>
                    `<a href="#"
                      class="pattern-name list-group-item list-group-item-action"
                      data-pattern="${id}"
                      data-role="listItem"
                    >
                      &nbsp;${patternLibrary.get(id)?.name}
                    </a>`
                )
                .join("")}
            </div>`
        )
        .join("")}
    </div>`;
}

function generatePatternDetailsHTML(id) {
  const patternData = patternLibrary.get(id);
  return `
    <div>
      <p>${patternData?.name}</p>
      <p>${patternData?.author}</p>
      ${patternData?.description.map(line => `<p>${line}</p>`).join("")}
      <br></br>
      <button type="button"
        class="btn btn-primary drop-shadow"
        data-dismiss="modal"
        data-pattern="${id}"
        data-role="addBtn"
      >
        Drag and Drop Pattern
      </button>
      <br></br>
      <button type="button"
        class="btn btn-primary drop-shadow"
        data-dismiss="modal"
        data-pattern="${id}"
        data-role="replaceBtn"
      >
        Replace All With Pattern
      </button>
    </div>
    `;
}

init();
