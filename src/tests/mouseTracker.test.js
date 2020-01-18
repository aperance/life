//@ts-ignore

import { MouseTracker, createMouseTracker } from "../mouseTracker";

const gameRenderer = {
  view: { zoom: 10, panX: 100, panY: 100 },
  setView: jest.fn(),
  zoomAtPoint: jest.fn(),
  xyToRowColIndex: jest.fn().mockReturnValue({ row: 0, col: 0, index: 0 })
};
const gameController = {
  toggleCell: jest.fn(),
  placePattern: jest.fn(),
  clearAliveCells: jest.fn(),
  clearPreview: jest.fn()
};

const observer = jest.fn();

//@ts-ignore
const mouseTracker = createMouseTracker(gameRenderer, gameController, observer);

describe("For wheel spin", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("With mouse over canvas", () => {
    test.each([-100, -10, 10, 100])(
      "with deltaY of %i, calls zoom requested with correct arguments",
      val => {
        /** @type {*} */
        const e = {
          deltaY: val,
          clientX: 100,
          clientY: 100
        };
        mouseTracker.mouseWheel(e, true);
        expect(gameRenderer.zoomAtPoint).toHaveBeenCalledTimes(1);
        expect(gameRenderer.zoomAtPoint).toHaveBeenCalledWith(
          10 + Math.sign(val),
          100,
          100
        );
      }
    );
  });

  describe("With mouse not over canvas", () => {
    test.each([-100, -10, 10, 100])(
      "with deltaY of %i, zoom not requested",
      val => {
        /** @type {*} */
        const e = {
          deltaY: val,
          clientX: 100,
          clientY: 100,
          target: { id: "default-btn" }
        };
        mouseTracker.mouseWheel(e, false);
        expect(gameRenderer.zoomAtPoint).not.toHaveBeenCalled();
      }
    );
  });
});

describe("With pattern selected", () => {
  describe("Moving over canvas", () => {
    /** @type {*} */
    const e = { clientX: 500, clientY: 500, target: { id: "cell-canvas" } };
    beforeAll(() => {
      jest.clearAllMocks();
      mouseTracker.mouseMove(e, true, true);
    });
    test("Toggle cell not requested", () => {
      expect(gameController.toggleCell).not.toHaveBeenCalled();
    });
    test("Place pattern is requested with coordinates and pattern", () => {
      expect(gameController.placePattern).toHaveBeenCalledWith(500, 500, true);
    });
    test("Clear preview not requested", () => {
      expect(gameController.clearPreview).not.toHaveBeenCalled();
    });
    test("Set view not requested", () => {
      expect(gameRenderer.setView).not.toHaveBeenCalled();
    });
    test("Observer function is not called", () => {
      expect(observer).not.toHaveBeenCalled();
    });
  });

  describe("Moving over button", () => {
    /** @type {*} */
    const e = { clientX: 500, clientY: 500, target: { id: "default-btn" } };
    beforeAll(() => {
      jest.clearAllMocks();
      mouseTracker.mouseMove(e, false, true);
    });
    test("Toggle cell not requested", () => {
      expect(gameController.toggleCell).not.toHaveBeenCalled();
    });
    test("Place pattern not requested", () => {
      expect(gameController.placePattern).not.toHaveBeenCalled();
    });
    test("Clear preview is requested", () => {
      expect(gameController.clearPreview).toHaveBeenCalled();
    });
    test("Set view not requested", () => {
      expect(gameRenderer.setView).not.toHaveBeenCalled();
    });
    test("Observer function is not called", () => {
      expect(observer).not.toHaveBeenCalled();
    });
  });

  describe("Moving out of window", () => {
    beforeAll(() => {
      jest.clearAllMocks();
      mouseTracker.mouseLeave();
    });
    test("Toggle cell not requested", () => {
      expect(gameController.toggleCell).not.toHaveBeenCalled();
    });
    test("Place pattern not requested", () => {
      expect(gameController.placePattern).not.toHaveBeenCalled();
    });
    test("Clear preview is requested", () => {
      expect(gameController.clearPreview).toHaveBeenCalled();
    });
    test("Set view not requested", () => {
      expect(gameRenderer.setView).not.toHaveBeenCalled();
    });
    test("Observer function is not called", () => {
      expect(observer).not.toHaveBeenCalled();
    });
  });

  describe.each([
    [2, 0],
    [-2, 0],
    [0, 2],
    [0, -2]
  ])("Dragging from canvas < 3px (%i,%i)", (deltaX, deltaY) => {
    /** @type {*} */
    const e = {
      clientX: 500,
      clientY: 500,
      button: 0,
      target: { id: "cell-canvas" }
    };
    beforeAll(() => {
      jest.clearAllMocks();
      mouseTracker.mouseDown(e, true);
      e.clientX += deltaX;
      e.clientY += deltaY;
      mouseTracker.mouseMove(e, true, true);
      mouseTracker.mouseUp(e, true, true);
    });
    test("Toggle cell not requested", () => {
      expect(gameController.toggleCell).not.toHaveBeenCalled();
    });
    test("Place pattern is requested twice", () => {
      expect(gameController.placePattern).toBeCalledTimes(2);
    });
    test("Place pattern is requested as preview", () => {
      expect(gameController.placePattern).toHaveBeenNthCalledWith(
        1,
        e.clientX,
        e.clientY,
        true
      );
    });
    test("Place pattern is requested as not preview", () => {
      expect(gameController.placePattern).toHaveBeenNthCalledWith(
        2,
        e.clientX,
        e.clientY,
        false
      );
    });
    test("Clear preview not requested", () => {
      expect(gameController.clearPreview).not.toHaveBeenCalled();
    });
    test("Set view not requested", () => {
      expect(gameRenderer.setView).not.toHaveBeenCalled();
    });
    test("Observer function is called", () => {
      expect(observer).toHaveBeenCalled();
    });
  });

  describe.each([
    [3, 0],
    [-3, 0],
    [0, 3],
    [0, -3]
  ])("Dragging from canvas to canvas >= 3px (%i,%i)", (deltaX, deltaY) => {
    /** @type {*} */
    const e = {
      clientX: 500,
      clientY: 500,
      button: 0
    };
    beforeAll(() => {
      jest.clearAllMocks();
      mouseTracker.mouseDown(e, true);
      e.clientX += deltaX;
      e.clientY += deltaY;
      mouseTracker.mouseMove(e, true, true);
      mouseTracker.mouseUp(e, true, true);
    });
    test("Toggle cell not requested", () => {
      expect(gameController.toggleCell).not.toHaveBeenCalled();
    });
    test("Place pattern is requested once", () => {
      expect(gameController.placePattern).toBeCalledTimes(1);
    });
    test("Place pattern is requested as preview", () => {
      expect(gameController.placePattern).toHaveBeenCalledWith(
        e.clientX,
        e.clientY,
        true
      );
    });
    test("Clear preview is requested", () => {
      expect(gameController.clearPreview).toHaveBeenCalled();
    });
    test("Set view requested with correct values", () => {
      expect(gameRenderer.setView).toHaveBeenCalledWith({
        panX: gameRenderer.view.panX - deltaX,
        panY: gameRenderer.view.panY - deltaY
      });
    });
    test("Observer function is called", () => {
      expect(observer).toHaveBeenCalled();
    });
  });

  describe.each([
    [3, 0],
    [-3, 0],
    [0, 3],
    [0, -3]
  ])("Dragging from canvas to button >= 3px (%i,%i)", (deltaX, deltaY) => {
    /** @type {*} */
    const e = {
      clientX: 500,
      clientY: 500,
      button: 0
    };
    beforeAll(() => {
      jest.clearAllMocks();
      mouseTracker.mouseDown(e, true);
      e.clientX += deltaX;
      e.clientY += deltaY;
      mouseTracker.mouseMove(e, false, true);
      mouseTracker.mouseUp(e, false, true);
    });
    test("Toggle cell not requested", () => {
      expect(gameController.toggleCell).not.toHaveBeenCalled();
    });
    test("Place pattern not requested", () => {
      expect(gameController.placePattern).not.toHaveBeenCalled();
    });
    test("Clear preview is requested", () => {
      expect(gameController.clearPreview).toHaveBeenCalled();
    });
    test("Set view requested with correct values", () => {
      expect(gameRenderer.setView).toHaveBeenCalledWith({
        panX: gameRenderer.view.panX - deltaX,
        panY: gameRenderer.view.panY - deltaY
      });
    });
    test("Observer function is called", () => {
      expect(observer).toHaveBeenCalled();
    });
  });

  describe.each([
    [3, 0],
    [-3, 0],
    [0, 3],
    [0, -3]
  ])("Dragging from button to canvas >= 3px (%i,%i)", (deltaX, deltaY) => {
    /** @type {*} */
    const e = {
      clientX: 500,
      clientY: 500,
      button: 0
    };
    beforeAll(() => {
      jest.clearAllMocks();
      mouseTracker.mouseDown(e, false);
      e.clientX += deltaX;
      e.clientY += deltaY;
      mouseTracker.mouseMove(e, true, true);
      mouseTracker.mouseUp(e, true, true);
    });
    test("Toggle cell not requested", () => {
      expect(gameController.toggleCell).not.toHaveBeenCalled();
    });
    test("Place pattern is requested once", () => {
      expect(gameController.placePattern).toBeCalledTimes(1);
    });
    test("Place pattern is requested as preview", () => {
      expect(gameController.placePattern).toHaveBeenCalledWith(
        e.clientX,
        e.clientY,
        true
      );
    });
    test("Clear preview not requested", () => {
      expect(gameController.clearPreview).not.toHaveBeenCalled();
    });
    test("Set view not requested", () => {
      expect(gameRenderer.setView).not.toHaveBeenCalled();
    });
    test("Observer function is called", () => {
      expect(observer).toHaveBeenCalled();
    });
  });
});

describe("With pattern cleared", () => {
  describe("Clicking on canvas", () => {
    /** @type {*} */
    const e = {
      clientX: 500,
      clientY: 500,
      button: 0
    };
    beforeAll(() => {
      jest.clearAllMocks();
      mouseTracker.mouseDown(e, true);
      mouseTracker.mouseUp(e, true, false);
    });
    test("Toggle cell requested with correct coordinates", () => {
      expect(gameController.toggleCell).toHaveBeenCalledWith(500, 500);
    });
    test("Place pattern not requested", () => {
      expect(gameController.placePattern).not.toHaveBeenCalled();
    });
    test("Clear preview not requested", () => {
      expect(gameController.clearPreview).not.toHaveBeenCalled();
    });
    test("Set view not requested", () => {
      expect(gameRenderer.setView).not.toHaveBeenCalled();
    });
    test("Observer function is called", () => {
      expect(observer).toHaveBeenCalled();
    });
  });

  describe("Clicking off canvas", () => {
    /** @type {*} */
    const e = {
      clientX: 500,
      clientY: 500,
      button: 0
    };
    beforeAll(() => {
      jest.clearAllMocks();
      mouseTracker.mouseDown(e, false);
      mouseTracker.mouseUp(e, false, false);
    });
    test("Toggle cell not requested", () => {
      expect(gameController.toggleCell).not.toHaveBeenCalled();
    });
    test("Place pattern not requested", () => {
      expect(gameController.placePattern).not.toHaveBeenCalled();
    });
    test("Clear preview not requested", () => {
      expect(gameController.clearPreview).not.toHaveBeenCalled();
    });
    test("Set view not requested", () => {
      expect(gameRenderer.setView).not.toHaveBeenCalled();
    });
    test("Observer function is called", () => {
      expect(observer).toHaveBeenCalled();
    });
  });

  describe.each([
    [2, 0],
    [-2, 0],
    [0, 2],
    [0, -2]
  ])("Dragging from canvas < 3px (%i,%i)", (deltaX, deltaY) => {
    /** @type {*} */
    const e = {
      clientX: 500,
      clientY: 500,
      button: 0
    };
    beforeAll(() => {
      jest.clearAllMocks();
      mouseTracker.mouseDown(e, true);
      e.clientX += deltaX;
      e.clientY += deltaY;
      mouseTracker.mouseMove(e, true, false);
      mouseTracker.mouseUp(e, true, false);
    });
    test("Toggle cell requested with correct coordinates", () => {
      expect(gameController.toggleCell).toHaveBeenCalledWith(
        e.clientX,
        e.clientY
      );
    });
    test("Place pattern not requested", () => {
      expect(gameController.placePattern).not.toHaveBeenCalled();
    });
    test("Clear preview not requested", () => {
      expect(gameController.clearPreview).toHaveBeenCalled();
    });
    test("Set view not requested", () => {
      expect(gameRenderer.setView).not.toHaveBeenCalled();
    });
    test("Observer function is called", () => {
      expect(observer).toHaveBeenCalled();
    });
  });

  describe.each([
    [3, 0],
    [-3, 0],
    [0, 3],
    [0, -3]
  ])("Dragging from canvas to canvas >= 3px (%i,%i)", (deltaX, deltaY) => {
    /** @type {*} */
    const e = {
      clientX: 500,
      clientY: 500,
      button: 0
    };
    beforeAll(() => {
      jest.clearAllMocks();
      mouseTracker.mouseDown(e, true);
      e.clientX += deltaX;
      e.clientY += deltaY;
      mouseTracker.mouseMove(e, true, false);
      mouseTracker.mouseUp(e, true, false);
    });
    test("Toggle cell not requested", () => {
      expect(gameController.toggleCell).not.toHaveBeenCalled();
    });
    test("Place pattern not requested", () => {
      expect(gameController.placePattern).not.toHaveBeenCalled();
    });
    test("Clear preview is requested", () => {
      expect(gameController.clearPreview).toHaveBeenCalled();
    });
    test("Set view requested with correct values", () => {
      expect(gameRenderer.setView).toHaveBeenCalledWith({
        panX: gameRenderer.view.panX - deltaX,
        panY: gameRenderer.view.panY - deltaY
      });
    });
    test("Observer function is called", () => {
      expect(observer).toHaveBeenCalled();
    });
  });

  describe.each([
    [3, 0],
    [-3, 0],
    [0, 3],
    [0, -3]
  ])("Dragging from canvas to button >= 3px (%i,%i)", (deltaX, deltaY) => {
    /** @type {*} */
    const e = {
      clientX: 500,
      clientY: 500,
      button: 0
    };
    beforeAll(() => {
      jest.clearAllMocks();
      mouseTracker.mouseDown(e, true);
      e.clientX += deltaX;
      e.clientY += deltaY;
      mouseTracker.mouseMove(e, false, false);
      mouseTracker.mouseUp(e, false, false);
    });
    test("Toggle cell not requested", () => {
      expect(gameController.toggleCell).not.toHaveBeenCalled();
    });
    test("Place pattern not requested", () => {
      expect(gameController.placePattern).not.toHaveBeenCalled();
    });
    test("Clear preview is requested", () => {
      expect(gameController.clearPreview).toHaveBeenCalled();
    });
    test("Set view requested with correct values", () => {
      expect(gameRenderer.setView).toHaveBeenCalledWith({
        panX: gameRenderer.view.panX - deltaX,
        panY: gameRenderer.view.panY - deltaY
      });
    });
    test("Observer function is called", () => {
      expect(observer).toHaveBeenCalled();
    });
  });

  describe.each([
    [3, 0],
    [-3, 0],
    [0, 3],
    [0, -3]
  ])("Dragging from button to canvas >= 3px (%i,%i)", (deltaX, deltaY) => {
    /** @type {*} */
    const e = {
      clientX: 500,
      clientY: 500,
      button: 0
    };
    beforeAll(() => {
      jest.clearAllMocks();
      mouseTracker.mouseDown(e, false);
      e.clientX += deltaX;
      e.clientY += deltaY;
      mouseTracker.mouseMove(e, true, false);
      mouseTracker.mouseUp(e, true, false);
    });
    test("Toggle cell not requested", () => {
      expect(gameController.toggleCell).not.toHaveBeenCalled();
    });
    test("Place pattern not requested", () => {
      expect(gameController.placePattern).not.toHaveBeenCalled();
    });
    test("Clear preview is requested", () => {
      expect(gameController.clearPreview).toHaveBeenCalled();
    });
    test("Set view not requested", () => {
      expect(gameRenderer.setView).not.toHaveBeenCalled();
    });
    test("Observer function is called", () => {
      expect(observer).toHaveBeenCalled();
    });
  });
});
