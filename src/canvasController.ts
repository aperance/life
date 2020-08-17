import {ControllerSubject} from "./observables";

/**
 * CanvasController is the object reponsible for modifying the HTML canvas elements
 * used to visualize the game area. Three canvas elements are used for drawing
 * grid lines, alive cells, and translucent pattern preview, respectively. The
 * canvases are transformed based on user specified zoom and pan properties.
 */
export class CanvasController {
  /** Number of cells in each dimension of the game universe. */
  readonly cellCount: number;
  /** Context of canvas used to render grid lines. */
  readonly #gridCtx: CanvasRenderingContext2D;
  /** Context of canvas used to render cells. */
  readonly #cellCtx: CanvasRenderingContext2D;
  /** RxJS subject used to communicate state changes to UI. */
  readonly #subject: ControllerSubject;
  /** Dark mode if true. */
  #isDarkMode: boolean;
  /** Offset of the canvas relative to the viewport. */
  #pan?: {x: number; y: number};
  /** Current zoom level. Equal to cell width in pixels. */
  #zoom = 10;
  /** Set to true to force all canvases to be redrawn next cycle. */
  #isRedrawNeeded = true;

  constructor(
    gridCtx: CanvasRenderingContext2D,
    cellCtx: CanvasRenderingContext2D,
    cellCount: number,
    initialTheme: string | undefined,
    subject: ControllerSubject
  ) {
    this.#gridCtx = gridCtx;
    this.#cellCtx = cellCtx;
    this.cellCount = cellCount;
    this.#isDarkMode = initialTheme === "dark";
    this.#subject = subject;
  }

  /**
   * Width and height of the canvases, based on the properties of the grid canvas.
   */
  private get window(): {width: number; height: number} {
    const {width, height} = this.#gridCtx.canvas;
    return {width, height};
  }

  /**
   * The minimum zoom value where the game area is not smaller than the window.
   */
  private get minZoom(): number {
    return Math.ceil(
      Math.max(this.window.width, this.window.height) / this.cellCount
    );
  }

  /**
   * The maximum pan values that dosen't extend off the game area.
   */
  private get maxPan(): {x: number; y: number} {
    return {
      x: this.cellCount * this.#zoom - this.window.width,
      y: this.cellCount * this.#zoom - this.window.height
    };
  }

  /**
   * The current zoom value.
   */
  get zoom(): number {
    return this.#zoom;
  }

  /**
   * Updates color theme and forces redraw.
   */
  set isDarkMode(x: boolean) {
    this.#isDarkMode = x;
    this.#isRedrawNeeded = true;
  }

  /**
   * Ensures the values are within acceptable bounds. Sets default values if undefined.
   */
  initializeView(): void {
    this.#zoom = this.clamp(this.#zoom, this.minZoom, 100);

    this.#pan = {
      x: this.clamp(this.#pan?.x ?? this.maxPan.x / 2, 0, this.maxPan.x),
      y: this.clamp(this.#pan?.y ?? this.maxPan.y / 2, 0, this.maxPan.y)
    };

    this.updateSubject();
    this.#isRedrawNeeded = true;
  }

  /**
   * Updates zoom property with the specified value, and adjusts
   * panning properties so that the specified point is stationary.
   * @param zoom Desired zoom value
   * @param x x-coordinate of point to keep stationary
   * @param y y-coordinate of point to keep stationary
   */
  zoomAtPoint(newZoom: number, x: number, y: number): void {
    if (!this.#pan) throw Error("Canvas not initialized");

    const prevZoom = this.#zoom;
    this.#zoom = this.clamp(newZoom, this.minZoom, 100);
    const scale = this.#zoom / prevZoom - 1;
    this.shiftPan(scale * (this.#pan.x + x), scale * (this.#pan.y + y));

    this.updateSubject();
    this.#isRedrawNeeded = true;
  }

  /**
   * Aleters the pan x and y properties by the specified amounts.
   * @param deltaX Amount to shift the pan.x property by
   * @param deltaY Amount to shift the pan.y property by
   */
  shiftPan(deltaX: number, deltaY: number): void {
    if (!this.#pan) throw Error("Canvas not initialized");

    this.#pan = {
      x: this.clamp(this.#pan?.x + deltaX, 0, this.maxPan.x),
      y: this.clamp(this.#pan?.y + deltaY, 0, this.maxPan.y)
    };

    this.updateSubject();
    this.#isRedrawNeeded = true;
  }

  /**
   * Clears any drawing on all canvases.
   */
  clearCanvases(): void {
    [this.#gridCtx, this.#cellCtx].forEach(ctx => {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.restore();
    });
  }

  /**
   * Public method to initiate rendering of the game area. Triggered by the
   * animation cycle running in GameController. If necessary, all cells and
   * grid lines will be redrawn. Otherwise only changes cells will be edited.
   * @param alive Indices of all alive cells in game
   * @param born Indices of all cells born this generation
   * @param died Indices of all cells died this generation
   * @param preview Indices of cells in pattern being previewed
   * @param didCellsChange True if alive array was modified since last call
   */
  updateCanvases(
    alive: number[],
    born: number[] | null,
    died: number[] | null,
    preview: number[],
    didCellsChange: boolean
  ): void {
    if (born && died && !this.#isRedrawNeeded)
      this.renderChangedCells(born, died);
    else if (didCellsChange || this.#isRedrawNeeded) {
      this.clearCanvases();
      this.renderGrid();
      this.renderAllCells(alive, preview);
      this.#isRedrawNeeded = false;
    }
  }

  /**
   * Redraws all grid lines based on the current zoom and panning properties.
   */
  private renderGrid(): void {
    if (!this.#pan) return;

    const {width, height} = this.#gridCtx.canvas;
    const {row: startRow, col: startCol} = this.xyToRowColIndex(0, 0);
    const {row: endRow, col: endCol} = this.xyToRowColIndex(width, height);

    const {x: panX, y: panY} = this.#pan;
    this.#gridCtx.setTransform(this.#zoom, 0, 0, this.#zoom, -panX, -panY);

    if (this.#zoom < 5) return;

    this.#gridCtx.lineWidth = 0.025;

    this.#gridCtx.strokeStyle = "lightgrey";
    this.#gridCtx.beginPath();
    for (let col = startCol + 1; col <= endCol; col++) {
      this.#gridCtx.moveTo(col, startRow);
      this.#gridCtx.lineTo(col, endRow + 1);
    }
    for (let row = startRow + 1; row <= endRow; row++) {
      this.#gridCtx.moveTo(startCol, row);
      this.#gridCtx.lineTo(endCol + 1, row);
    }
    this.#gridCtx.stroke();

    this.#gridCtx.strokeStyle = this.#isDarkMode ? "white" : "darkgray";
    this.#gridCtx.beginPath();
    for (let col = startCol + 1; col <= endCol; col++) {
      if (col % 10 === 0) {
        this.#gridCtx.moveTo(col, startRow);
        this.#gridCtx.lineTo(col, endRow + 1);
      }
    }
    for (let row = startRow + 1; row <= endRow; row++) {
      if (row % 10 === 0) {
        this.#gridCtx.moveTo(startCol, row);
        this.#gridCtx.lineTo(endCol + 1, row);
      }
    }
    this.#gridCtx.stroke();
  }

  /**
   * Redraws all cells in the game area, plus a translucent preview of a
   * pattern selected from the pattern library.
   * @param alive Indices of all alive cells in game
   * @param preview Indices of cells in pattern being previewed
   */
  private renderAllCells(alive: number[], preview: number[]): void {
    if (!this.#pan) return;

    const {x: panX, y: panY} = this.#pan;
    this.#cellCtx.setTransform(this.#zoom, 0, 0, this.#zoom, -panX, -panY);

    this.#cellCtx.fillStyle = this.#isDarkMode
      ? "rgba(255, 255, 255, 1)"
      : "rgba(0, 0, 0, 1)";
    for (let i = 0; i < alive.length; ++i) {
      const {row, col} = this.indexToRowCol(alive[i]);
      this.#cellCtx.fillRect(col, row, 1, 1);
    }

    this.#cellCtx.fillStyle = this.#isDarkMode
      ? "rgba(255, 255, 255, 0.5)"
      : "rgba(0, 0, 0, 0.5)";
    for (let i = 0; i < preview.length; ++i) {
      const {row, col} = this.indexToRowCol(preview[i]);
      this.#cellCtx.fillRect(col, row, 1, 1);
    }
  }

  /**
   * Draws or clears the modified cells in the game area.
   * @param born Indices of all cells born this generation
   * @param died Indices of all cells died this generation
   */
  private renderChangedCells(born: number[], died: number[]): void {
    this.#cellCtx.fillStyle = this.#isDarkMode
      ? "rgba(255, 255, 255, 1)"
      : "rgba(0, 0, 0, 1)";

    for (let i = 0; i < born.length; ++i) {
      const {row, col} = this.indexToRowCol(born[i]);
      this.#cellCtx.fillRect(col, row, 1, 1);
    }

    for (let i = 0; i < died.length; ++i) {
      const {row, col} = this.indexToRowCol(died[i]);
      this.#cellCtx.clearRect(col, row, 1, 1);
    }
  }

  /**
   * Updates RxJS subject with the current zoom and the row and column on
   * the game area at the current center of the window. Adjusted so that the
   * center of the game area is 0,0 (internally 0,0 is the top left corner).
   */
  private updateSubject(): void {
    const {row, col} = this.xyToRowColIndex(
      this.window.width / 2,
      this.window.height / 2
    );
    this.#subject.next({
      zoom: this.#zoom,
      row: row - this.cellCount / 2,
      col: col - this.cellCount / 2
    });
  }

  /**
   * Converts an index from the game area to the equivilant row and column.
   */
  indexToRowCol(i: number): {row: number; col: number} {
    return {row: Math.floor(i / this.cellCount), col: i % this.cellCount};
  }

  /**
   * Converts coordinates from the window to the row, column, and index on the game area.
   */
  xyToRowColIndex(
    x: number,
    y: number
  ): {row: number; col: number; index: number} {
    if (!this.#pan) throw Error("Canvas not initialized");

    const row = Math.floor((y + this.#pan.y) / this.#zoom);
    const col = Math.floor((x + this.#pan.x) / this.#zoom);
    const index = this.cellCount * row + col;
    return {row, col, index};
  }

  /**
   * Restricts a value between a given range and rounds to whole number.
   * @param val Value to be clamped
   * @param min Minimum value to be returned
   * @param max Maximum value to be returned
   */
  private clamp(val: number, min: number, max: number): number {
    return Math.round(val > max ? max : val < min ? min : val);
  }
}
