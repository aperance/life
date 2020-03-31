import { fromEvent, merge, interval, Observable } from "rxjs";
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

const isDragging = (downEvent, moveEvent) =>
  Math.abs(downEvent.clientX - moveEvent.clientX) > 3 ||
  Math.abs(downEvent.clientY - moveEvent.clientY) > 3;

export const windowResize$ = merge(
  fromEvent(window, "resize"),
  fromEvent(window, "DOMContentLoaded")
);

export const keyDown$ = fromEvent(document, "keydown").pipe(pluck("key"));
export const keyUp$ = fromEvent(document, "keyup").pipe(pluck("key"));

export const arrowKeyPress$ = keyDown$.pipe(
  filter(key => key.includes("Arrow")),
  switchMap(key =>
    interval(10).pipe(
      takeUntil(keyUp$.pipe(filter(key => key.includes("Arrow")))),
      mapTo(key)
    )
  )
);

export const navButtonClick$ = fromEvent(nav, "click").pipe(
  // @ts-ignore
  filter(e => e.target.tagName === "A"),
  // @ts-ignore
  filter(e => e.target.href === "" || e.target.href === "#!")
);

/** @type {Observable<string>} */
export const zoomSlider$ = fromEvent(zoomSlider, "input").pipe(
  pluck("target", "value"),
  filter(value => value)
);

/** @type {Observable<MouseEvent>} */
export const mouseUp$ = (fromEvent(document, "mouseup"));

/** @type {Observable<WheelEvent>} */
export const canvasScroll$ = (fromEvent(cellCanvas, "mousewheel", {
  passive: true
}));

export const canvasDrag$ = merge(
  fromEvent(cellCanvas, "mousedown").pipe(
    switchMap((/** @type {MouseEvent} */ downEvent) => {
      let prevEvent = downEvent;

      return fromEvent(document, "mousemove").pipe(
        map((/** @type {MouseEvent} */ moveEvent) => {
          let deltaX = prevEvent.clientX - moveEvent.clientX;
          let deltaY = prevEvent.clientY - moveEvent.clientY;

          prevEvent = moveEvent;

          return { deltaX, deltaY };
        }),
        skipUntil(
          fromEvent(document, "mousemove").pipe(
            first(moveEvent => isDragging(downEvent, moveEvent))
          )
        ),
        takeUntil(mouseUp$)
      );
    })
  ),
  fromEvent(cellCanvas, "touchstart").pipe(
    pluck("touches"),
    filter(({ length }) => length === 1),
    switchMap(([initialTouch]) => {
      let prevTouch = initialTouch;

      return fromEvent(document, "touchmove").pipe(
        pluck("touches"),
        filter(({ length }) => length === 1),
        map(([currentTouch]) => {
          let deltaX = prevTouch.clientX - currentTouch.clientX;
          let deltaY = prevTouch.clientY - currentTouch.clientY;

          prevTouch = currentTouch;

          return { deltaX, deltaY };
        }),
        takeUntil(
          fromEvent(document, "touchend").pipe(
            pluck("touches"),
            filter(({ length }) => length === 0)
          )
        ),
        takeUntil(
          fromEvent(document, "touchstart").pipe(
            pluck("touches"),
            filter(({ length }) => length !== 1)
          )
        )
      );
    })
  )
);

export const canvasClick$ = fromEvent(cellCanvas, "mousedown").pipe(
  switchMap(downEvent =>
    /** @type {Observable<MouseEvent>} */
    (fromEvent(document, "mouseup").pipe(
      take(1),
      takeUntil(
        fromEvent(document, "mousemove").pipe(
          first(moveEvent => isDragging(downEvent, moveEvent))
        )
      )
    ))
  )
);

/** @type {Observable<Object>} */
export const canvasPinch$ = fromEvent(cellCanvas, "touchstart").pipe(
  pluck("touches"),
  filter(({ length }) => length === 2),
  switchMap(() => {
    let prevScale = 1;

    return fromEvent(document, "touchmove").pipe(
      map((/** @type {TouchEvent} */ e) => {
        //@ts-ignore
        let scale = e.scale / prevScale;
        let centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        let centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        // @ts-ignore
        prevScale = e.scale;
        return { scale, centerX, centerY };
      }),
      takeUntil(fromEvent(document, "touchend"))
    );
  })
);

export const canvasHover$ = fromEvent(cellCanvas, "mousemove").pipe(
  filter((/** @type {MouseEvent} */ e) => e.buttons === 0)
);

export const canvasLeave$ = fromEvent(cellCanvas, "mouseleave");

export const patternModalCLick$ = fromEvent(patternModal, "click").pipe(
  pluck("target", "dataset"),
  filter(dataset => dataset && dataset.pattern && dataset.role)
);
