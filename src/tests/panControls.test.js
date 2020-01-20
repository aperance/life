import { createPanControls } from "../panControls";

const viewController = { view: { panX: 100, panY: 100 }, setView: jest.fn() };
const panControls = createPanControls(viewController);

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});

describe.each([
  ["up", { panY: 98 }],
  ["down", { panY: 102 }],
  ["left", { panX: 98 }],
  ["right", { panX: 102 }]
])("For %s direction", (direction, expected) => {
  it("initializes panning when start method called", () => {
    panControls.start(direction);
    expect(panControls.direction).toBe(direction);
    expect(typeof panControls.intervalID).toBe("number");
  });

  it("pans occur at the correct frequency", () => {
    jest.advanceTimersByTime(1000);
    expect(viewController.setView).toHaveBeenCalledTimes(100);
    expect(viewController.setView).toHaveBeenLastCalledWith(expected);
  });

  it("halts panning when stop method called", () => {
    panControls.stop();
    expect(panControls.direction).toBe(null);
    expect(panControls.intervalID).toBe(null);
  });

  it("no additional panning occurs", () => {
    jest.advanceTimersByTime(1000);
    expect(viewController.setView).toHaveBeenCalledTimes(0);
  });

  it("no effect when additional stop method called", () => {
    panControls.stop();
    expect(panControls.direction).toBe(null);
    expect(panControls.intervalID).toBe(null);
  });
});

describe("Change direction while panning in progress", () => {
  afterAll(() => panControls.stop());
  beforeAll(() => panControls.start("left"));

  it("panning state changes to new direction", () => {
    panControls.start("up");
    expect(panControls.direction).toBe("up");
    expect(typeof panControls.intervalID).toBe("number");
  });

  it("panning occurs only for new direction", () => {
    jest.advanceTimersByTime(1000);
    expect(viewController.setView).toHaveBeenCalledTimes(100);
    expect(viewController.setView).toHaveBeenLastCalledWith({ panY: 98 });
  });
});

describe("For invalid direction", () => {
  it("panning is not initialized", () => {
    expect(panControls.direction).toBe(null);
    expect(panControls.intervalID).toBe(null);
  });

  it("no panning occurs", () => {
    panControls.start("invalid");
    jest.advanceTimersByTime(1000);
    expect(viewController.setView).toHaveBeenCalledTimes(0);
  });
});
