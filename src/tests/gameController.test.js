import { GameController } from "../gameController";

const worker = { postMessage: jest.fn() };
const gameRenderer = {
  render: jest.fn(),
  xyToRowColIndex: jest.fn().mockReturnValue({ row: 5, col: 5, index: 55 })
};
const observer = jest.fn();

let gameController;

describe("Starting game", () => {
  const testAlive = [3, 24, 49, 75];
  beforeAll(() => {
    gameController = new GameController(
      worker,
      gameRenderer,
      100,
      true,
      observer
    );
    gameController.alive = new Set(testAlive);
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
    gameController = new GameController(
      worker,
      gameRenderer,
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
      gameRenderer.xyToRowColIndex.mockReturnValue({ row: 5, col: 5, index });
      gameController.toggleCell(0, 0);
    });
    test("Render called on next cycle with changed flag set to true", () => {
      expect(gameRenderer.render).toHaveBeenCalledWith(
        aliveArray,
        null,
        null,
        [],
        true
      );
    });
    test("Render called on following cycle with changed flag set to false", () => {
      expect(gameRenderer.render).toHaveBeenCalledWith(
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
      gameRenderer.xyToRowColIndex.mockReturnValue({ row, col, index: 0 });
      gameController.placePattern(row, col, testPattern, true);
    });
    test("Render called on next cycle with changed flag set to true", () => {
      expect(gameRenderer.render).toHaveBeenCalledWith(
        [],
        null,
        null,
        previewArray,
        true
      );
    });
    test("Render called on following cycle with changed flag set to false", () => {
      expect(gameRenderer.render).toHaveBeenCalledWith(
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
      gameRenderer.xyToRowColIndex.mockReturnValue({ row, col, index: 0 });
      gameController.placePattern(row, col, testPattern, true);
      gameController.placePattern(row, col, testPattern, false);
    });
    test("Render called on next cycle with changed flag set to true", () => {
      expect(gameRenderer.render).toHaveBeenCalledWith(
        aliveArray,
        null,
        null,
        [],
        true
      );
    });
    test("Render called on following cycle with changed flag set to false", () => {
      expect(gameRenderer.render).toHaveBeenCalledWith(
        aliveArray,
        null,
        null,
        [],
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
    gameController = new GameController(
      worker,
      gameRenderer,
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
      expect(gameRenderer.render).toHaveBeenCalledWith(
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
      expect(gameRenderer.render).toHaveBeenCalledWith(
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
      expect(gameRenderer.render).toHaveBeenCalledWith(
        [],
        null,
        null,
        [],
        false
      );
    });
  });
});
