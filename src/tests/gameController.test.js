import { createGameController } from "../gameController";

const worker = { postMessage: jest.fn() };

const viewController = {
  updateCanvases: jest.fn(),
  xyToRowColIndex: jest.fn().mockReturnValue({ row: 5, col: 5, index: 55 })
};

const patternLibrary = {
  /** @type {number[][]?} */
  selected: null
};

const observer = jest.fn();

let gameController;

describe("Starting game", () => {
  const testAlive = [3, 24, 49, 75];
  beforeAll(() => {
    gameController = createGameController(
      worker,
      viewController,
      patternLibrary,
      100,
      true,
      observer
    );
    gameController.aliveCells = new Set(testAlive);
  });
  beforeEach(() => {
    jest.clearAllMocks();
    gameController.play();
  });
  describe("With game not running", () => {
    test("Start message to worker is sent", () => {
      expect(worker.postMessage).toHaveBeenCalledWith({
        action: "start",
        payload: { initialAlive: testAlive, size: 100, wasm: true }
      });
    });
  });
  describe("With game running", () => {
    beforeAll(() => gameController.handleWorkerMessage({ data: "started" }));
    test("Start message to worker not sent", () => {
      expect(worker.postMessage).not.toHaveBeenCalled();
    });
  });
});

describe("With game not running", () => {
  const testPattern = [
    [1, 0, 1],
    [0, 1, 0],
    [1, 0, 1]
  ];
  beforeAll(() => {
    gameController = createGameController(
      worker,
      viewController,
      patternLibrary,
      10,
      true,
      observer
    );
  });
  beforeEach(() => {
    jest.clearAllMocks();
    gameController.animationCycle();
  });
  describe.each([
    [44, [44]],
    [92, [44, 92]],
    [92, [44]],
    [44, []]
  ])("Toggling cell %i", (index, aliveArray) => {
    beforeAll(() => {
      viewController.xyToRowColIndex.mockReturnValue({ row: 5, col: 5, index });
      gameController.toggleCell(0, 0);
    });
    test("Render called on next cycle with changed flag set to true", () => {
      expect(viewController.updateCanvases).toHaveBeenCalledWith(
        aliveArray,
        null,
        null,
        [],
        true
      );
    });
    test("Render called on following cycle with changed flag set to false", () => {
      expect(viewController.updateCanvases).toHaveBeenCalledWith(
        aliveArray,
        null,
        null,
        [],
        false
      );
    });
  });

  describe.each([
    [1, 1, [0, 2, 11, 20, 22]],
    [8, 8, [77, 79, 88, 97, 99]]
  ])("Placing pattern preview at %i and %i", (row, col, previewArray) => {
    beforeAll(() => {
      patternLibrary.selected = testPattern;
      viewController.xyToRowColIndex.mockReturnValue({ row, col, index: 0 });
      gameController.placePreview(row, col);
    });
    test("Render called on next cycle with changed flag set to true", () => {
      expect(viewController.updateCanvases).toHaveBeenCalledWith(
        [],
        null,
        null,
        previewArray,
        true
      );
    });
    test("Render called on following cycle with changed flag set to false", () => {
      expect(viewController.updateCanvases).toHaveBeenCalledWith(
        [],
        null,
        null,
        previewArray,
        false
      );
    });
  });

  describe.each([
    [1, 1, [0, 2, 11, 20, 22]],
    [8, 8, [0, 2, 11, 20, 22, 77, 79, 88, 97, 99]]
  ])("Placing pattern at %i and %i", (row, col, aliveArray) => {
    beforeAll(() => {
      patternLibrary.selected = testPattern;
      viewController.xyToRowColIndex.mockReturnValue({ row, col, index: 0 });
      gameController.placePreview(row, col);
      gameController.placePattern(row, col);
    });
    test("Render called on next cycle with changed flag set to true", () => {
      expect(viewController.updateCanvases).toHaveBeenCalledWith(
        aliveArray,
        null,
        null,
        aliveArray.slice(-5),
        true
      );
    });
    test("Render called on following cycle with changed flag set to false", () => {
      expect(viewController.updateCanvases).toHaveBeenCalledWith(
        aliveArray,
        null,
        null,
        aliveArray.slice(-5),
        false
      );
    });
  });
});

describe("With game running", () => {
  const testPattern = [
    [1, 0, 1],
    [0, 1, 0],
    [1, 0, 1]
  ];
  beforeAll(() => {
    gameController = createGameController(
      worker,
      viewController,
      patternLibrary,
      10,
      true,
      observer
    );
    //@ts-ignore
    gameController.handleWorkerMessage({ data: "started" });
  });
  beforeEach(() => {
    jest.clearAllMocks();
    gameController.animationCycle();
  });
  describe("Toggling cell", () => {
    beforeAll(() => gameController.toggleCell(44));
    test("Render called on next cycle without cell index added", () => {
      expect(viewController.updateCanvases).toHaveBeenCalledWith(
        [],
        null,
        null,
        [],
        false
      );
    });
  });

  describe("Placing element preview", () => {
    beforeAll(() => gameController.placePattern(0, 0, testPattern, true));
    test("Render called on next cycle without pattern added", () => {
      expect(viewController.updateCanvases).toHaveBeenCalledWith(
        [],
        null,
        null,
        [],
        false
      );
    });
  });

  describe("Placing element", () => {
    beforeAll(() => {
      gameController.placePattern(0, 0, testPattern, true);
      gameController.placePattern(0, 0, testPattern, false);
    });
    test("Render called on next cycle without pattern added", () => {
      expect(viewController.updateCanvases).toHaveBeenCalledWith(
        [],
        null,
        null,
        [],
        false
      );
    });
  });
});
