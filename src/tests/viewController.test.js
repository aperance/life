import { createViewController } from "../viewController";

/** @type {CanvasRenderingContext2D} */
const gridCtx = (document.createElement("canvas").getContext("2d"));
/** @type {CanvasRenderingContext2D} */
const cellCtx = (document.createElement("canvas").getContext("2d"));
/** @type {CanvasRenderingContext2D} */
const previewCtx = (document.createElement("canvas").getContext("2d"));
const observer = jest.fn();

let viewController;

describe("Initialize window size and view", () => {
  describe.each([
    [7, 10, 497],
    [225, 10, 388],
    [1000, 10, 0],
    [2500, 25, 0]
  ])("For window width and height of %i", (size, zoom, pan) => {
    beforeAll(() => {
      jest.clearAllMocks();
      viewController = createViewController(
        gridCtx,
        cellCtx,
        previewCtx,
        100,
        observer
      );
      viewController.setWindow(size, size);
    });
    test("Observer function called with correct view parameters", () => {
      expect(viewController.view).toEqual({ panX: pan, panY: pan, zoom });
    });
  });
});

describe("Update window size and view", () => {
  beforeAll(() => {
    viewController = createViewController(
      gridCtx,
      cellCtx,
      previewCtx,
      100,
      observer
    );
    viewController.setWindow(10, 10);
  });
  describe.each([
    [225, 10, 495],
    [1000, 10, 0],
    [2500, 25, 0]
  ])("For window width and height of %i", (size, zoom, pan) => {
    beforeAll(() => {
      jest.clearAllMocks();
      viewController.setWindow(size, size);
    });
    test("Observer function called with correct view parameters", () => {
      expect(viewController.view).toEqual({ panX: pan, panY: pan, zoom });
    });
  });
});
