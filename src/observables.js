import { fromEvent, merge, interval } from "rxjs";
import {
  map,
  switchMap,
  take,
  takeUntil,
  filter,
  first,
  skipUntil,
  pluck,
  tap,
  mapTo
} from "rxjs/operators";

/** @type {HTMLCanvasElement} */
const cellCanvas = (document.getElementById("cell-canvas"));

const mouseDown$ = fromEvent(cellCanvas, "mousedown");
const mouseUp$ = fromEvent(document, "mouseup");
const mouseMove$ = fromEvent(document, "mousemove");

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

const canvasHover$ = merge(
  fromEvent(cellCanvas, "mousemove").pipe(
    filter((/** @type {MouseEvent} */ e) => e.buttons === 0)
  ),
  fromEvent(cellCanvas, "mouseup")
);

const canvasLeave$ = fromEvent(cellCanvas, "mouseleave");

const keyDown$ = fromEvent(document, "keydown").pipe(
  pluck("key"),
  tap(key => console.log(key))
);

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

export {
  canvasClick$,
  canvasDrag$,
  canvasHover$,
  canvasLeave$,
  keyDown$,
  arrowKeyPress$
};
