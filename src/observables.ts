/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import M from "materialize-css";
import {
  Subject,
  BehaviorSubject,
  Observable,
  fromEvent,
  merge,
  interval
} from "rxjs";
import {
  map,
  switchMap,
  take,
  takeUntil,
  filter,
  first,
  skipUntil,
  pluck,
  mapTo,
  tap,
  bufferTime,
  scan,
  delay
} from "rxjs/operators";

import {canvasController} from "./canvasController";
import {gameController} from "./gameController";
import * as patternLibrary from "./patternLibrary";
import {initializeGame, terminateGame} from "./index";

/** Stores refrences to used DOM elements with type casting */
const dom = {
  main: document.getElementById("main") as HTMLDivElement,
  canvasContainer: document.getElementById(
    "canvas-container"
  ) as HTMLDivElement,
  gridCanvas: document.getElementById("grid-canvas") as HTMLCanvasElement,
  cellCanvas: document.getElementById("cell-canvas") as HTMLCanvasElement,
  leftStatus: document.getElementById("left-status") as HTMLSpanElement,
  rightStatus: document.getElementById("right-status") as HTMLSpanElement,
  nav: document.getElementById("nav") as HTMLElement,
  playIcon: document.getElementById("play-icon") as HTMLElement,
  pauseIcon: document.getElementById("pause-icon") as HTMLElement,
  defaultBtn: document.getElementById("default-btn") as HTMLButtonElement,
  patternBtn: document.getElementById("pattern-btn") as HTMLButtonElement,
  patternDropdown: document.getElementById(
    "pattern-dropdown"
  ) as HTMLDivElement,
  speedSlider: document.getElementById("speed-slider") as HTMLInputElement,
  zoomSlider: document.getElementById("zoom-slider") as HTMLInputElement,
  modal: document.getElementById("help-modal") as HTMLDivElement,
  modalCheckbox: document.getElementById("modal-checkbox") as HTMLInputElement
};

interface ControllerState {
  zoom?: number;
  row?: number;
  col?: number;
  isPlaying?: boolean;
  isPaused?: boolean;
  generation?: number;
  aliveCount?: number;
  speed?: any;
  calcTimePerGeneration?: number;
  changedCount?: number;
}

export const controllerSubject = new Subject<ControllerState>();
export const controllerUpdate$: Observable<ControllerState> = controllerSubject
  .asObservable()
  .pipe(
    scan((acc, x) => {
      const next = {...acc, ...x};
      return next;
    }, {})
  );

export const patternSubject = new BehaviorSubject<number[][] | null>(null);
export const patternSelection$ = patternSubject.asObservable();

/**
 * Updates navbar based on changes to gameController and viewController state.
 */
controllerUpdate$.subscribe(({isPlaying, isPaused, speed, zoom}) => {
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
});

/**
 * Updates status bar based on changes to gameController and viewController state.
 */
controllerUpdate$.subscribe(
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
 * Set pattern library button as active when a pattern is selected, default otherwise.
 */
patternSelection$.subscribe(pattern => {
  dom.defaultBtn.classList.toggle("active", pattern === null);
  dom.patternBtn.classList.toggle("active", pattern !== null);
});

/**
 * Prevent certain default behavior.
 */
merge(
  fromEvent(dom.main, "wheel", {passive: false}),
  fromEvent(dom.patternBtn, "mousedown"),
  fromEvent(dom.patternDropdown, "mousedown")
).subscribe(e => e.preventDefault());

/**
 * Perform necessary adjustments after window initialization or resize.
 */
merge(
  fromEvent(window, "resize"),
  fromEvent(window, "DOMContentLoaded")
).subscribe(() => {
  /** Updates game state with current window dimensions. */
  canvasController?.setWindow(window.innerWidth, window.innerHeight);
  /** Adjust all canvas dimensions to match window dimensions. */
  [dom.gridCanvas, dom.cellCanvas].forEach(canvas => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
});

/**
 *
 */
fromEvent(window, "DOMContentLoaded")
  .pipe(delay(1000))
  .subscribe(() => {
    M.Modal.init(dom.modal);

    if (localStorage.getItem("showModal") !== "false") {
      M.Modal.getInstance(dom.modal).open();
      dom.modalCheckbox.checked = true;
    }
  });

/**
 *
 */
fromEvent(dom.modalCheckbox, "click").subscribe(() => {
  localStorage.setItem("showModal", dom.modalCheckbox.checked.toString());
});

/**
 * Terminate game after any unhandled errors.
 */
fromEvent(window, "error").subscribe(() => terminateGame());

/**
 * Perform action on key press (excluding arrow keys).
 */
fromEvent<KeyboardEvent>(document, "keydown").subscribe(e => {
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

/**
 * Update canvas position when holding an arrow key button.
 */
fromEvent<KeyboardEvent>(document, "keydown")
  .pipe(
    filter(e => e.key.includes("Arrow")),
    switchMap(e =>
      interval(10).pipe(
        takeUntil(
          fromEvent<KeyboardEvent>(document, "keyup").pipe(
            filter(e => e.key.includes("Arrow"))
          )
        ),
        mapTo(e.key)
      )
    )
  )
  .subscribe(key => {
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

/**
 *
 */
fromEvent<MouseEvent>(dom.nav, "click")
  .pipe(
    tap(e => console.log(e)),
    pluck<MouseEvent, HTMLLinkElement>("target"),
    filter(target => target.tagName === "A"),
    filter(target => target.href === "" || target.href === "#!")
  )
  .subscribe(btn => {
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

/**
 * Toggle pattern dropdown on pattern library button click,
 * or close dropdown if clicked elsewhere on navbar.
 */
fromEvent<MouseEvent>(dom.nav, "mousedown")
  .pipe(
    tap(e => console.log(e)),
    pluck<MouseEvent, HTMLLinkElement>("target")
  )
  .subscribe(target => {
    if (target.id === "pattern-btn")
      dom.patternDropdown.hidden = !dom.patternDropdown.hidden;
    else if (
      dom.patternDropdown.hidden === false &&
      target.closest("div")?.id !== "pattern-dropdown"
    )
      dom.patternDropdown.hidden = true;
  });

/**
 * Update game speed value on change in speed slider position.
 */
fromEvent<InputEvent>(dom.speedSlider, "input")
  .pipe(
    pluck<Event, string>("target", "value"),
    filter(value => value !== null)
  )
  .subscribe(value => {
    const speedID = parseInt(value);
    gameController?.speed.set(speedID);
  });

/**
 * Update game zoom value on change in zoon slider position.
 */
fromEvent<InputEvent>(dom.zoomSlider, "input")
  .pipe(
    pluck<Event, string>("target", "value"),
    filter(value => value !== null)
  )
  .subscribe(value => {
    canvasController?.zoomAtPoint(
      Math.round(Math.pow(parseFloat(value), 2)),
      window.innerWidth / 2,
      window.innerHeight / 2
    );
  });

/**
 * Toggle canvas cell on click, or place pattern if selected.
 * Observable structured to not emit on canvas dragging.
 * Skip if pattern dropdown is open.
 */
fromEvent<MouseEvent>(dom.cellCanvas, "mousedown")
  .pipe(
    switchMap(downEvent =>
      fromEvent<MouseEvent>(document, "mouseup").pipe(
        take(1),
        takeUntil(
          fromEvent<MouseEvent>(document, "mousemove").pipe(
            first(moveEvent => isDragging(downEvent, moveEvent))
          )
        )
      )
    ),
    switchMap(e =>
      patternSelection$.pipe(
        first(),
        map(pattern => ({e, pattern}))
      )
    )
  )
  .subscribe(({e, pattern}) => {
    if (dom.patternDropdown.hidden === false) dom.patternDropdown.hidden = true;
    else {
      if (pattern === null) gameController?.toggleCell(e.clientX, e.clientY);
      else gameController?.placePattern(e.clientX, e.clientY, pattern);
    }
  });

/**
 * Update canvas position when dragging. Merged observables for mouse and touch.
 */
const canvasDragging$ = merge(
  fromEvent<MouseEvent>(dom.cellCanvas, "mousedown").pipe(
    switchMap(downEvent => {
      let prevEvent = downEvent;

      return fromEvent<MouseEvent>(document, "mousemove").pipe(
        map(moveEvent => {
          const deltaX = prevEvent.clientX - moveEvent.clientX;
          const deltaY = prevEvent.clientY - moveEvent.clientY;

          prevEvent = moveEvent;

          return {deltaX, deltaY};
        }),
        skipUntil(
          fromEvent<MouseEvent>(document, "mousemove").pipe(
            first(moveEvent => isDragging(downEvent, moveEvent))
          )
        ),
        takeUntil(fromEvent<MouseEvent>(document, "mouseup"))
      );
    })
  ),
  fromEvent<TouchEvent>(dom.cellCanvas, "touchstart").pipe(
    pluck("touches"),
    filter(({length}) => length === 1),
    switchMap(([initialTouch]) => {
      let prevTouch = initialTouch;

      return fromEvent<TouchEvent>(document, "touchmove").pipe(
        pluck("touches"),
        filter(({length}) => length === 1),
        map(([currentTouch]) => {
          const deltaX = prevTouch.clientX - currentTouch.clientX;
          const deltaY = prevTouch.clientY - currentTouch.clientY;

          prevTouch = currentTouch;

          return {deltaX, deltaY};
        }),
        takeUntil(
          fromEvent<TouchEvent>(document, "touchend").pipe(
            pluck("touches"),
            filter(({length}) => length === 0)
          )
        ),
        takeUntil(
          fromEvent<TouchEvent>(document, "touchstart").pipe(
            pluck("touches"),
            filter(({length}) => length !== 1)
          )
        )
      );
    })
  )
);

canvasDragging$.subscribe(({deltaX, deltaY}) => {
  if (canvasController?.view?.panX && canvasController?.view?.panY)
    canvasController.setView({
      panX: Math.round(canvasController.view.panX + deltaX),
      panY: Math.round(canvasController.view.panY + deltaY)
    });
  gameController?.clearPreview();
  document.body.style.cursor = "all-scroll";
});

/**
 *
 */
const canvasHoverMoving$ = merge(
  fromEvent<MouseEvent>(dom.cellCanvas, "mousemove").pipe(
    filter(e => e.buttons === 0)
  ),
  fromEvent<MouseEvent>(dom.cellCanvas, "mouseup"),
  fromEvent<MouseEvent>(dom.patternDropdown, "mouseup")
).pipe(switchMap(e => patternSelection$.pipe(map(pattern => ({e, pattern})))));

canvasHoverMoving$.subscribe(({e, pattern}) => {
  if (pattern) gameController?.placePreview(e.clientX, e.clientY, pattern);
});

/**
 *
 */
const canvasHoverStationary$ = canvasHoverMoving$.pipe(
  switchMap(({e, pattern}) =>
    interval(1000).pipe(
      map(() => ({e, pattern})),
      take(1),
      takeUntil(fromEvent<MouseEvent>(dom.cellCanvas, "mousemove")),
      takeUntil(fromEvent<MouseEvent>(dom.cellCanvas, "mouseleave"))
    )
  )
);

canvasHoverStationary$.subscribe(({e, pattern}) => {
  if (pattern) {
    dom.canvasContainer.style.setProperty(
      "--tooltip-x-position",
      e.clientX.toString() + "px"
    );
    dom.canvasContainer.style.setProperty(
      "--tooltip-y-position",
      e.clientY.toString() + "px"
    );
    dom.canvasContainer.style.setProperty(
      "--tooltip-transition",
      "opacity 0.5s"
    );
    dom.canvasContainer.style.setProperty("--tooltip-opacity", "1");
  }
});

/**
 *
 */
merge(canvasHoverMoving$, canvasDragging$).subscribe(() => {
  dom.canvasContainer.style.setProperty("--tooltip-transition", "none");
  dom.canvasContainer.style.setProperty("--tooltip-opacity", "0");
});

/**
 * Ensure default cursor is set on dragging is stopped (mouse button up).
 */
fromEvent<MouseEvent>(document, "mouseup").subscribe(
  () => (document.body.style.cursor = "default")
);

/**
 * Clear pattern preview when mouse pointer leaves canvas.
 */
fromEvent<MouseEvent>(dom.cellCanvas, "mouseleave").subscribe(() =>
  gameController?.clearPreview()
);

/**
 * Update zoom on mouse wheel scroll.
 */
fromEvent<WheelEvent>(dom.cellCanvas, "mousewheel", {
  passive: true
})
  .pipe(
    bufferTime(50),
    filter(arr => arr.length !== 0)
  )
  .subscribe((arr: WheelEvent[]) => {
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

/**
 * Update zoom on canvas pinch gesture.
 */
fromEvent<TouchEvent>(dom.cellCanvas, "touchstart")
  .pipe(
    pluck("touches"),
    filter(({length}) => length === 2),
    switchMap(() => {
      let prevScale = 1;

      return fromEvent<TouchEvent>(document, "touchmove").pipe(
        map(e => {
          //@ts-ignore
          const scale = e.scale / prevScale;
          const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
          // @ts-ignore
          prevScale = e.scale;
          return {scale, centerX, centerY};
        }),
        takeUntil(fromEvent<TouchEvent>(document, "touchend"))
      );
    })
  )
  .subscribe(({scale, centerX, centerY}) => {
    if (canvasController?.view?.zoom)
      canvasController.zoomAtPoint(
        canvasController.view.zoom * scale,
        Math.round(centerX),
        Math.round(centerY)
      );
  });

/** Set a new selected pattern on button click. */
fromEvent<MouseEvent>(dom.patternDropdown, "click")
  .pipe(
    pluck<Event, string>("target", "dataset", "pattern"),
    filter(pattern => typeof pattern === "string")
  )
  .subscribe(pattern => {
    patternLibrary.setSelected(pattern);
    dom.patternDropdown.hidden = true;
  });

function isDragging(downEvent: MouseEvent, moveEvent: MouseEvent): boolean {
  return (
    Math.abs(downEvent.clientX - moveEvent.clientX) > 3 ||
    Math.abs(downEvent.clientY - moveEvent.clientY) > 3
  );
}
