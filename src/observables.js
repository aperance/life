import { fromEvent, merge, interval, of, Observable } from "rxjs";
import {
  map,
  switchMap,
  take,
  takeUntil,
  filter,
  first,
  skipUntil,
  pluck,
  mapTo
} from "rxjs/operators";

/** @type {HTMLCanvasElement} */
const cellCanvas = (document.getElementById("cell-canvas"));
/** @type {HTMLElement} */
const nav = (document.getElementById("nav"));
/** @type {HTMLDivElement} */
const patternModal = (document.getElementById("pattern-modal"));
/** @type {HTMLInputElement} */
const zoomSlider = (document.getElementById("zoom-slider"));

const windowResize$ = merge(
  fromEvent(window, "resize"),
  fromEvent(window, "DOMContentLoaded")
);

const keyDown$ = fromEvent(document, "keydown").pipe(pluck("key"));
const keyUp$ = fromEvent(document, "keyup").pipe(pluck("key"));

const arrowKeyPress$ = keyDown$.pipe(
  filter(key => key.includes("Arrow")),
  switchMap(key =>
    interval(10).pipe(
      takeUntil(keyUp$.pipe(filter(key => key.includes("Arrow")))),
      mapTo(key)
    )
  )
);

const navButtonClick$ = fromEvent(nav, "click").pipe(
  // @ts-ignore
  filter(e => e.target.tagName === "A"),
  // @ts-ignore
  filter(e => e.target.href === "" || e.target.href === "#!")
);

/** @type {Observable<string>} */
const zoomSlider$ = fromEvent(zoomSlider, "input").pipe(
  pluck("target", "value"),
  filter(value => value)
);

/** @type {Observable<MouseEvent>} */
const mouseDown$ = (fromEvent(cellCanvas, "mousedown"));
/** @type {Observable<MouseEvent>} */
const mouseUp$ = (fromEvent(document, "mouseup"));
/** @type {Observable<MouseEvent>} */
const mouseMove$ = (fromEvent(document, "mousemove"));

/** @type {Observable<WheelEvent>} */
const canvasScroll$ = (fromEvent(cellCanvas, "mousewheel", { passive: true }));

const createDragStart$ = downEvent =>
  mouseMove$.pipe(
    first(
      (/** @type {MouseEvent} */ moveEvent) =>
        Math.abs(downEvent.clientX - moveEvent.clientX) > 3 ||
        Math.abs(downEvent.clientY - moveEvent.clientY) > 3
    )
  );

const canvasDrag$ = mouseDown$.pipe(
  switchMap((/** @type {MouseEvent} */ downEvent) => {
    let prevEvent = downEvent;

    return mouseMove$.pipe(
      map((/** @type {MouseEvent} */ moveEvent) => {
        let deltaX = prevEvent.clientX - moveEvent.clientX;
        let deltaY = prevEvent.clientY - moveEvent.clientY;

        prevEvent = moveEvent;

        return { deltaX, deltaY };
      }),
      skipUntil(createDragStart$(downEvent)),
      takeUntil(mouseUp$)
    );
  })
);

const canvasClick$ = mouseDown$.pipe(
  switchMap(downEvent =>
    mouseUp$.pipe(take(1), takeUntil(createDragStart$(downEvent)))
  )
);

const canvasHover$ = fromEvent(cellCanvas, "mousemove").pipe(
  filter((/** @type {MouseEvent} */ e) => e.buttons === 0)
);

const canvasLeave$ = fromEvent(cellCanvas, "mouseleave");

const patternModalCLick$ = fromEvent(patternModal, "click").pipe(
  pluck("target", "dataset"),
  filter(dataset => dataset && dataset.pattern && dataset.role)
);

export {
  windowResize$,
  mouseUp$,
  navButtonClick$,
  zoomSlider$,
  canvasScroll$,
  canvasClick$,
  canvasDrag$,
  canvasHover$,
  canvasLeave$,
  keyDown$,
  arrowKeyPress$,
  patternModalCLick$
};
