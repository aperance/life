import {CanvasController} from "./canvasController";
import {ControllerSubject} from "./observables";
import {WorkerResult} from "./worker";

const batchSize = 25;
const bufferSize = 50;

/**
 * GameController is responsible for managing the game state. If not yet
 * started, the game state is updated based on user actions. If started, the
 * game state is updated based on results calculated by the web worker. The
 * game state is then passed to the ViewController to be displayed to the user.
 */
export class GameController {
  /** Reference to initialized web worker. */
  readonly #worker: Worker;
  /** Reference to initialized CanvasController object. */
  readonly #canvasController: CanvasController;
  /** RxJS subject used to communicate state changes to UI. */
  readonly #subject: ControllerSubject;
  /** Set containing the indices of the currently alive cells. */
  readonly #aliveCells = new Set<number>();
  /** Set containing the indices of the pattern being previewed. */
  readonly #alivePreview = new Set<number>();
  /** Array storing results generated by the worker. */
  readonly #resultBuffer: WorkerResult[] = [];
  /** Timestamp of pending request sent to worker for game results. Null if no request is pending. */
  #resultsRequestedAt: number | null = null;
  /** True if aliveCells was modified since last animation cycle. */
  #didCellsChange = true;
  /** Number of cycles to elapse before rendering next result, and current cycle count. */
  readonly speed: {
    id: number;
    cyclesPerRender: number;
    currentCycle: number;
    set(id: number): void;
  };
  /** The generation number of the results currently being displayed. */
  #generation = 0;
  /** True if the recursive animationCycle calls should be stopped. */
  #haltAnimationCycle = false;
  /** True if game results have started being generated by worker. */
  isGameStarted = false;
  /** True if game has started but results are paused. */
  isGamePaused = false;

  constructor(
    worker: Worker,
    canvasController: CanvasController,
    subject: ControllerSubject
  ) {
    this.#worker = worker;
    this.#canvasController = canvasController;
    this.#subject = subject;
    this.speed = {
      id: 3,
      currentCycle: 1,
      get cyclesPerRender() {
        const lookup = [60, 30, 12, 6, 3, 2];
        return lookup[this.id];
      },
      set(id: number) {
        this.id = Math.round(Math.max(0, Math.min(id, 5)));
      }
    };

    this.#worker.onmessage = this.handleWorkerMessage.bind(this);
    this.animationCycle();
  }

  /**
   * The next game results to be rendered. Includes arrays of cells born and
   * died since previous generation.
   */
  private get nextResult(): WorkerResult | null {
    if (!this.isGameStarted) return null;

    if (this.#resultBuffer.length < bufferSize && !this.#resultsRequestedAt) {
      performance.mark("Request Start");
      this.#worker.postMessage({
        action: "requestResults",
        payload: {count: batchSize}
      });
      this.#resultsRequestedAt = Date.now();
    }

    return this.#resultBuffer.shift() || null;
  }

  /**
   * Toggles the state of the cell at the specified window coordinates.
   * @param x x coordinate of the cell to be toggled
   * @param y y coordinate of the cell to be toggled
   */
  toggleCell(x: number, y: number): void {
    if (this.isGameStarted) return;

    const {index} = this.#canvasController.xyToRowColIndex(x, y);
    ``;
    this.#aliveCells.has(index)
      ? this.#aliveCells.delete(index)
      : this.#aliveCells.add(index);
    this.#didCellsChange = true;
  }

  /**
   * Takes the selected pattern in the pattern library and adds it to
   * aliveCells at the specified window coordinates.
   * @param x x coordinate of where pattern should be placed
   * @param y y coordinate of where pattern should be placed
   * @param pattern 2D array representing the selected pattern
   */
  placePattern(x: number, y: number, pattern: number[][]): void {
    if (this.isGameStarted) return;

    this.iterateOverPattern(x, y, pattern, (index, isAlive) => {
      if (isAlive) this.#aliveCells.add(index);
      else this.#aliveCells.delete(index);
    });
  }

  /**
   * Takes the selected pattern in the pattern library and adds it to
   * alivePreview at the specified window coordinates.
   * @param x x coordinate of where pattern should be placed
   * @param y y coordinate of where pattern should be placed
   * @param pattern 2D array representing the selected pattern
   */
  placePreview(x: number, y: number, pattern: number[][]): void {
    if (this.isGameStarted) return;

    this.#alivePreview.clear();

    this.iterateOverPattern(x, y, pattern, (index, isAlive) => {
      if (isAlive) this.#alivePreview.add(index);
    });
  }

  /**
   * Iterates over 2D array of selected pattern and performs function on each cell.
   * @param {number} x x coordinate of where pattern should be placed
   * @param {number} y y coordinate of where pattern should be placed
   * @param {number[][]} pattern 2D array representing the selected pattern
   * @param {function} fn function to be called for each cell
   */
  private iterateOverPattern(
    x: number,
    y: number,
    pattern: number[][],
    fn: (index: number, isAlive: boolean) => void
  ): void {
    const {row, col} = this.#canvasController.xyToRowColIndex(x, y);
    const startRow = row + 1 - Math.round(pattern.length / 2);
    const startCol = col + 1 - Math.round(pattern[0].length / 2);

    pattern.forEach((rowData, relativeRow) => {
      rowData.forEach((cellState, relativeCol) => {
        const index =
          this.#canvasController.cellCount * (startRow + relativeRow) +
          (startCol + relativeCol);
        const isAlive = cellState === 1 ? true : false;

        fn(index, isAlive);
      });
    });

    this.#didCellsChange = true;
  }

  /**
   *
   * @memberof GameController#
   */
  clearAliveCells(): void {
    this.#aliveCells.clear();
    this.#didCellsChange = true;
  }

  /**
   *
   * @memberof GameController#
   */
  clearPreview(): void {
    this.#alivePreview.clear();
    this.#didCellsChange = true;
  }

  /**
   * Sends message to worker to start generating game results.
   * @memberof GameController#
   */
  play(): void {
    if (this.isGameStarted) this.isGamePaused = false;
    else {
      console.log("Game started");

      this.#worker.postMessage({
        action: "start",
        payload: {
          initialAlive: Array.from(this.#aliveCells)
        }
      });
    }
  }

  /**
   * Sets flag to pause game at current generation.
   * @memberof GameController#
   */
  pause(): void {
    this.isGamePaused = true;
  }

  /**
   * Terminates worker and recursive animationCycle calls, to prepare for
   * object deletion.
   * @memberof GameController#
   */
  terminate(): void {
    this.#haltAnimationCycle = true;
  }

  /**
   * Gets next game results and passes game state to viewController render
   * method. Called 60 times per second using requestAnimationFrame timer.
   * @memberof GameController#
   */
  private animationCycle(): void {
    if (this.#haltAnimationCycle) return;

    let born: Array<number> | null = null;
    let died: Array<number> | null = null;

    if (this.isGameStarted && !this.isGamePaused) {
      if (this.speed.currentCycle < this.speed.cyclesPerRender) {
        this.speed.currentCycle++;
      } else {
        this.speed.currentCycle = 1;
        const result = this.nextResult;
        if (result) {
          born = result.born;
          died = result.died;

          for (const cellIndex of born) this.#aliveCells.add(cellIndex);
          for (const cellIndex of died) this.#aliveCells.delete(cellIndex);

          this.#didCellsChange = true;
          this.#generation++;
        }
      }
    }

    this.#canvasController.updateCanvases(
      Array.from(this.#aliveCells),
      born,
      died,
      Array.from(this.#alivePreview),
      this.#didCellsChange
    );

    this.#didCellsChange = false;

    this.#subject.next({
      isPlaying: this.isGameStarted,
      isPaused: this.isGamePaused,
      generation: this.#generation,
      aliveCount: this.#aliveCells.size,
      speed: this.speed,
      ...(born && died && {changedCount: born.length + died.length})
    });

    requestAnimationFrame(this.animationCycle.bind(this));
  }

  /**
   * Parses messages received from worker. Moves received game results to results buffer.
   */
  private handleWorkerMessage(e: MessageEvent): void {
    if (e.data === "started") this.isGameStarted = true;
    else {
      const workerDuration = e.data.duration;
      this.#resultBuffer.push(...e.data.results);

      performance.mark("Request End");
      performance.measure("Request Duration", "Request Start", "Request End");
      const requestDuration = performance
        .getEntriesByName("Request Duration")
        .map(x => x.duration)[0];
      const durationAverage = requestDuration / batchSize;
      const minCylesPerGeneration = Math.ceil((durationAverage * 60) / 1000);
      performance.clearMeasures();

      console.table({
        "Worker Duration (ms)": workerDuration,
        "Request Duration (ms)": requestDuration,
        "Worker Latency (ms)": requestDuration - workerDuration,
        "Worker Latency / Generation (ms)":
          (requestDuration - workerDuration) / batchSize,
        "Average Generation Duration (ms)": durationAverage,
        "Theoretical Maximum Generations / Second": Math.floor(
          1000 / durationAverage
        ),
        "Effective Maximum Generations / Second": 60 / minCylesPerGeneration,
        "Effective Minimum Animation Cycles / Generation": minCylesPerGeneration
      });

      if (this.speed.cyclesPerRender < minCylesPerGeneration) {
        this.speed.set(this.speed.id - 1);
        console.warn("Reducing speed to " + 60 / this.speed.cyclesPerRender);
      }

      this.#resultsRequestedAt = null;
    }
  }
}
