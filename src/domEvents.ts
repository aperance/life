import {fromEvent, merge, interval} from "rxjs";
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
  bufferTime
} from "rxjs/operators";

const cellCanvas = document.getElementById("cell-canvas") as HTMLCanvasElement;
const nav = document.getElementById("nav") as HTMLElement;
//const patternModal = document.getElementById("pattern-modal") as HTMLDivElement;
const patternDropdown = document.getElementById(
  "pattern-dropdown"
) as HTMLDivElement;
const speedSlider = document.getElementById("speed-slider") as HTMLInputElement;
const zoomSlider = document.getElementById("zoom-slider") as HTMLInputElement;

export const windowResize$ = merge(
  fromEvent(window, "resize"),
  fromEvent(window, "DOMContentLoaded")
);

export const keyDown$ = fromEvent<KeyboardEvent>(document, "keydown");
export const keyUp$ = fromEvent<KeyboardEvent>(document, "keyup");

export const arrowKeyPress$ = keyDown$.pipe(
  filter(e => e.key.includes("Arrow")),
  switchMap(e =>
    interval(10).pipe(
      takeUntil(keyUp$.pipe(filter(e => e.key.includes("Arrow")))),
      mapTo(e.key)
    )
  )
);

export const navDown$ = fromEvent<MouseEvent>(nav, "mousedown").pipe(
  tap(e => console.log(e)),
  pluck<MouseEvent, HTMLLinkElement>("target")
);

export const navButtonClick$ = fromEvent<MouseEvent>(nav, "click").pipe(
  tap(e => console.log(e)),
  pluck<MouseEvent, HTMLLinkElement>("target"),
  filter(target => target.tagName === "A"),
  filter(target => target.href === "" || target.href === "#!")
);

export const speedSlider$ = fromEvent<InputEvent>(speedSlider, "input").pipe(
  pluck<Event, string>("target", "value"),
  filter(value => value !== null)
);

export const zoomSlider$ = fromEvent<InputEvent>(zoomSlider, "input").pipe(
  pluck<Event, string>("target", "value"),
  filter(value => value !== null)
);

export const mouseUp$ = fromEvent<MouseEvent>(document, "mouseup");

export const canvasScroll$ = fromEvent<WheelEvent>(cellCanvas, "mousewheel", {
  passive: true
}).pipe(
  bufferTime(50),
  filter(arr => arr.length !== 0)
);

export const canvasDrag$ = merge(
  fromEvent<MouseEvent>(cellCanvas, "mousedown").pipe(
    switchMap(downEvent => {
      let prevEvent = downEvent;

      return fromEvent<MouseEvent>(document, "mousemove").pipe(
        map(moveEvent => {
          let deltaX = prevEvent.clientX - moveEvent.clientX;
          let deltaY = prevEvent.clientY - moveEvent.clientY;

          prevEvent = moveEvent;

          return {deltaX, deltaY};
        }),
        skipUntil(
          fromEvent<MouseEvent>(document, "mousemove").pipe(
            first(moveEvent => isDragging(downEvent, moveEvent))
          )
        ),
        takeUntil(mouseUp$)
      );
    })
  ),
  fromEvent<TouchEvent>(cellCanvas, "touchstart").pipe(
    pluck("touches"),
    filter(({length}) => length === 1),
    switchMap(([initialTouch]) => {
      let prevTouch = initialTouch;

      return fromEvent<TouchEvent>(document, "touchmove").pipe(
        pluck("touches"),
        filter(({length}) => length === 1),
        map(([currentTouch]) => {
          let deltaX = prevTouch.clientX - currentTouch.clientX;
          let deltaY = prevTouch.clientY - currentTouch.clientY;

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

export const canvasClick$ = fromEvent<MouseEvent>(cellCanvas, "mousedown").pipe(
  switchMap(downEvent =>
    fromEvent<MouseEvent>(document, "mouseup").pipe(
      take(1),
      takeUntil(
        fromEvent<MouseEvent>(document, "mousemove").pipe(
          first(moveEvent => isDragging(downEvent, moveEvent))
        )
      )
    )
  )
);

export const canvasPinch$ = fromEvent<TouchEvent>(
  cellCanvas,
  "touchstart"
).pipe(
  pluck("touches"),
  filter(({length}) => length === 2),
  switchMap(() => {
    let prevScale = 1;

    return fromEvent<TouchEvent>(document, "touchmove").pipe(
      map(e => {
        //@ts-ignore
        let scale = e.scale / prevScale;
        let centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        let centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        // @ts-ignore
        prevScale = e.scale;
        return {scale, centerX, centerY};
      }),
      takeUntil(fromEvent<TouchEvent>(document, "touchend"))
    );
  })
);

export const canvasHover$ = merge(
  fromEvent<MouseEvent>(cellCanvas, "mousemove").pipe(
    filter(e => e.buttons === 0)
  ),
  fromEvent<MouseEvent>(patternDropdown, "mouseup")
);

export const canvasLeave$ = fromEvent<MouseEvent>(cellCanvas, "mouseleave");

export const patternDropdownCLick$ = fromEvent<MouseEvent>(
  patternDropdown,
  "click"
).pipe(
  pluck<Event, string>("target", "dataset", "pattern"),
  filter(pattern => typeof pattern === "string")
);

function isDragging(downEvent: MouseEvent, moveEvent: MouseEvent): boolean {
  return (
    Math.abs(downEvent.clientX - moveEvent.clientX) > 3 ||
    Math.abs(downEvent.clientY - moveEvent.clientY) > 3
  );
}
