import { createGameRenderer } from "../gameRenderer";

const gridCtx = {};
const cellCtx = {};
const previewCtx = {};
const observer = jest.fn();

let gameRenderer;

describe("Initialize window size and view", () => {
  describe.each([
    [7, 10, 497],
    [225, 10, 388],
    [1000, 10, 0],
    [2500, 25, 0]
  ])("For window width and height of %i", (size, zoom, pan) => {
    beforeAll(() => {
      jest.clearAllMocks();
      gameRenderer = createGameRenderer(
        gridCtx,
        cellCtx,
        previewCtx,
        100,
        observer
      );
      gameRenderer.setWindow(size, size);
    });
    test("Observer function called with correct view parameters", () => {
      expect(observer).toHaveBeenCalledWith(zoom, pan, pan);
    });
  });
});

describe("Update window size and view", () => {
  beforeAll(() => {
    gameRenderer = createGameRenderer(
      gridCtx,
      cellCtx,
      previewCtx,
      100,
      observer
    );
    gameRenderer.setWindow(10, 10);
  });
  describe.each([
    [225, 10, 495],
    [1000, 10, 0],
    [2500, 25, 0]
  ])("For window width and height of %i", (size, zoom, pan) => {
    beforeAll(() => {
      jest.clearAllMocks();
      gameRenderer.setWindow(size, size);
    });
    test("Observer function called with correct view parameters", () => {
      expect(observer).toHaveBeenCalledWith(zoom, pan, pan);
    });
  });
});
