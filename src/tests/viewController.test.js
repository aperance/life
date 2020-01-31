import { createViewController } from "../viewController";

/** @type {CanvasRenderingContext2D} */
const gridCtx = (document.createElement("canvas").getContext("2d"));
/** @type {CanvasRenderingContext2D} */
const cellCtx = (document.createElement("canvas").getContext("2d"));
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
      viewController = createViewController(gridCtx, cellCtx, 100, observer);
      viewController.setWindow(size, size);
    });
    test("Observer function called with correct view parameters", () => {
      expect(viewController.view).toEqual({ panX: pan, panY: pan, zoom });
    });
  });
});

describe("Update window size and view", () => {
  beforeAll(() => {
    viewController = createViewController(gridCtx, cellCtx, 100, observer);
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

describe("Clearing all canvases", () => {
  beforeAll(() => {
    jest.clearAllMocks();
    viewController = createViewController(gridCtx, cellCtx, 100, observer);
    viewController.clearCanvases();
  });
  test("ClearRect called on gridCtx over full canvas area", () => {
    expect(gridCtx.__getEvents()[1]).toEqual({
      props: { height: 150, width: 300, x: 0, y: 0 },
      transform: [1, 0, 0, 1, 0, 0],
      type: "clearRect"
    });
  });
  test("ClearRect called on cellCtx over full canvas area", () => {
    expect(cellCtx.__getEvents()[1]).toEqual({
      props: { height: 150, width: 300, x: 0, y: 0 },
      transform: [1, 0, 0, 1, 0, 0],
      type: "clearRect"
    });
  });
});

describe("Updating canvas request", () => {
  beforeAll(() => {
    jest.clearAllMocks();
    viewController = createViewController(gridCtx, cellCtx, 100, observer);
  });
  test("ClearRect called on gridCtx over full canvas area", () => {
    viewController.updateCanvases();
    expect(gridCtx.__getEvents()[1]).toEqual({
      props: { height: 150, width: 300, x: 0, y: 0 },
      transform: [1, 0, 0, 1, 0, 0],
      type: "clearRect"
    });
  });
});
