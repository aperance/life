import { createMouseTracker } from "../mouseTracker";

const gameRenderer = {
  view: { zoom: 10, panX: 100, panY: 100 },
  setView: jest.fn(),
  zoomAtPoint: jest.fn()
};
const gameController = {
  toggleCell: jest.fn(),
  placeElement: jest.fn(),
  placePreview: jest.fn(),
  clearPreview: jest.fn()
};
const observer = jest.fn();

const mouseTracker = createMouseTracker(gameRenderer, gameController, observer);

// beforeEach(() => {
//   jest.clearAllMocks();
// });

describe("For wheel spin", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("With mouse over canvas", () => {
    test.each([-100, -10, 10, 100])(
      "with deltaY of %i, calls zoom requested with correct arguments",
      val => {
        mouseTracker.mouseWheel({
          deltaY: val,
          clientX: 100,
          clientY: 100,
          target: { tagName: "CANVAS" }
        });
        expect(gameRenderer.zoomAtPoint).toHaveBeenCalledTimes(1);
        expect(gameRenderer.zoomAtPoint).toHaveBeenCalledWith(
          10 + Math.sign(val),
          100,
          100
        );
      }
    );
  });

  describe("With mouse over button", () => {
    test.each([-100, -10, 10, 100])(
      "with deltaY of %i, zoom not requested",
      val => {
        mouseTracker.mouseWheel({
          deltaY: val,
          clientX: 100,
          clientY: 100,
          target: { tagName: "BUTTON" }
        });
        expect(gameRenderer.zoomAtPoint).not.toHaveBeenCalled();
      }
    );
  });
});

describe("With pattern selected", () => {
  const testPattern = [
    [1, 0, 1],
    [0, 1, 0],
    [1, 0, 1]
  ];
  test("pattern is saved and observer updated", () => {
    mouseTracker.setPattern(testPattern);
    expect(mouseTracker.pattern).toEqual(testPattern);
    expect(observer).toHaveBeenCalled();
  });

  describe("Moving over canvas", () => {
    const e = { clientX: 500, clientY: 500, target: { tagName: "CANVAS" } };
    beforeAll(() => {
      jest.clearAllMocks();
      mouseTracker.mouseMove(e);
    });
    test("Toggle cell not requested", () => {
      expect(gameController.toggleCell).not.toHaveBeenCalled();
    });
    test("Place element not requested", () => {
      expect(gameController.placeElement).not.toHaveBeenCalled();
    });
    test("Place preview is requested with coordinates and pattern", () => {
      expect(gameController.placePreview).toHaveBeenCalledWith(
        e.clientX,
        e.clientY,
        testPattern
      );
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
    const e = { clientX: 500, clientY: 500, target: { tagName: "BUTTON" } };
    beforeAll(() => {
      jest.clearAllMocks();
      mouseTracker.mouseMove(e);
    });
    test("Toggle cell not requested", () => {
      expect(gameController.toggleCell).not.toHaveBeenCalled();
    });
    test("Place element not requested", () => {
      expect(gameController.placeElement).not.toHaveBeenCalled();
    });
    test("Place preview not requested", () => {
      expect(gameController.placePreview).not.toHaveBeenCalled();
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
    test("Place element not requested", () => {
      expect(gameController.placeElement).not.toHaveBeenCalled();
    });
    test("Place preview not requested", () => {
      expect(gameController.placePreview).not.toHaveBeenCalled();
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
    const e = { clientX: 500, clientY: 500, target: { tagName: "CANVAS" } };
    beforeAll(() => {
      jest.clearAllMocks();
      mouseTracker.mouseDown(e);
      e.clientX += deltaX;
      e.clientY += deltaY;
      mouseTracker.mouseMove(e);
      mouseTracker.mouseUp(e);
    });
    test("Toggle cell not requested", () => {
      expect(gameController.toggleCell).not.toHaveBeenCalled();
    });
    test("Place element is requested", () => {
      expect(gameController.placeElement).toHaveBeenCalledWith(
        e.clientX,
        e.clientY,
        testPattern
      );
    });
    test("Place preview is requested", () => {
      expect(gameController.placePreview).toHaveBeenCalledWith(
        e.clientX,
        e.clientY,
        testPattern
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
    const e = { clientX: 500, clientY: 500, target: { tagName: "CANVAS" } };
    beforeAll(() => {
      jest.clearAllMocks();
      mouseTracker.mouseDown(e);
      e.clientX += deltaX;
      e.clientY += deltaY;
      mouseTracker.mouseMove(e);
      mouseTracker.mouseUp(e);
    });
    test("Toggle cell not requested", () => {
      expect(gameController.toggleCell).not.toHaveBeenCalled();
    });
    test("Place element not requested", () => {
      expect(gameController.placeElement).not.toHaveBeenCalled();
    });
    test("Place preview is requested", () => {
      expect(gameController.placePreview).toHaveBeenCalledWith(
        e.clientX,
        e.clientY,
        testPattern
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
    const e = { clientX: 500, clientY: 500, target: { tagName: "CANVAS" } };
    beforeAll(() => {
      jest.clearAllMocks();
      mouseTracker.mouseDown(e);
      e.clientX += deltaX;
      e.clientY += deltaY;
      e.target.tagName = "BUTTON";
      mouseTracker.mouseMove(e);
      mouseTracker.mouseUp(e);
    });
    test("Toggle cell not requested", () => {
      expect(gameController.toggleCell).not.toHaveBeenCalled();
    });
    test("Place element not requested", () => {
      expect(gameController.placeElement).not.toHaveBeenCalled();
    });
    test("Place preview not requested", () => {
      expect(gameController.placePreview).not.toHaveBeenCalled();
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
    const e = { clientX: 500, clientY: 500, target: { tagName: "BUTTON" } };
    beforeAll(() => {
      jest.clearAllMocks();
      mouseTracker.mouseDown(e);
      e.clientX += deltaX;
      e.clientY += deltaY;
      e.target.tagName = "CANVAS";
      mouseTracker.mouseMove(e);
      mouseTracker.mouseUp(e);
    });
    test("Toggle cell not requested", () => {
      expect(gameController.toggleCell).not.toHaveBeenCalled();
    });
    test("Place element not requested", () => {
      expect(gameController.placeElement).not.toHaveBeenCalled();
    });
    test("Place preview is requested", () => {
      expect(gameController.placePreview).toHaveBeenCalledWith(
        e.clientX,
        e.clientY,
        testPattern
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
  test("pattern is cleared and observer updated", () => {
    mouseTracker.clearPattern();
    expect(mouseTracker.pattern).toEqual(null);
    expect(observer).toHaveBeenCalled();
  });

  describe("Clicking on canvas", () => {
    const e = { clientX: 500, clientY: 500, target: { tagName: "CANVAS" } };
    beforeAll(() => {
      jest.clearAllMocks();
      mouseTracker.mouseDown(e);
      mouseTracker.mouseUp(e);
    });
    test("Toggle cell requested with correct coordinates", () => {
      expect(gameController.toggleCell).toHaveBeenCalledWith(
        e.clientX,
        e.clientY
      );
    });
    test("Place element not requested", () => {
      expect(gameController.placeElement).not.toHaveBeenCalled();
    });
    test("Place preview not requested", () => {
      expect(gameController.placePreview).not.toHaveBeenCalled();
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
    const e = { clientX: 500, clientY: 500, target: { tagName: "BUTTON" } };
    beforeAll(() => {
      jest.clearAllMocks();
      mouseTracker.mouseDown(e);
      mouseTracker.mouseUp(e);
    });
    test("Toggle cell not requested", () => {
      expect(gameController.toggleCell).not.toHaveBeenCalled();
    });
    test("Place element not requested", () => {
      expect(gameController.placeElement).not.toHaveBeenCalled();
    });
    test("Place preview not requested", () => {
      expect(gameController.placePreview).not.toHaveBeenCalled();
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
    const e = { clientX: 500, clientY: 500, target: { tagName: "CANVAS" } };
    beforeAll(() => {
      jest.clearAllMocks();
      mouseTracker.mouseDown(e);
      e.clientX += deltaX;
      e.clientY += deltaY;
      mouseTracker.mouseMove(e);
      mouseTracker.mouseUp(e);
    });
    test("Toggle cell requested with correct coordinates", () => {
      expect(gameController.toggleCell).toHaveBeenCalledWith(
        e.clientX,
        e.clientY
      );
    });
    test("Place element not requested", () => {
      expect(gameController.placeElement).not.toHaveBeenCalled();
    });
    test("Place preview not requested", () => {
      expect(gameController.placePreview).not.toHaveBeenCalled();
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
  ])("Dragging from canvas to button >= 3px (%i,%i)", (deltaX, deltaY) => {
    const e = { clientX: 500, clientY: 500, target: { tagName: "CANVAS" } };
    beforeAll(() => {
      jest.clearAllMocks();
      mouseTracker.mouseDown(e);
      e.clientX += deltaX;
      e.clientY += deltaY;
      e.target.tagName = "BUTTON";
      mouseTracker.mouseMove(e);
      mouseTracker.mouseUp(e);
    });
    test("Toggle cell not requested", () => {
      expect(gameController.toggleCell).not.toHaveBeenCalled();
    });
    test("Place element not requested", () => {
      expect(gameController.placeElement).not.toHaveBeenCalled();
    });
    test("Place preview not requested", () => {
      expect(gameController.placePreview).not.toHaveBeenCalled();
    });
    test("Clear preview not requested", () => {
      expect(gameController.clearPreview).not.toHaveBeenCalled();
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
    const e = { clientX: 500, clientY: 500, target: { tagName: "BUTTON" } };
    beforeAll(() => {
      jest.clearAllMocks();
      mouseTracker.mouseDown(e);
      e.clientX += deltaX;
      e.clientY += deltaY;
      e.target.tagName = "CANVAS";
      mouseTracker.mouseMove(e);
      mouseTracker.mouseUp(e);
    });
    test("Toggle cell not requested", () => {
      expect(gameController.toggleCell).not.toHaveBeenCalled();
    });
    test("Place element not requested", () => {
      expect(gameController.placeElement).not.toHaveBeenCalled();
    });
    test("Place preview not requested", () => {
      expect(gameController.placePreview).not.toHaveBeenCalled();
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
