/**
 *
 */

import {Subject} from "rxjs";
import {ControllerState} from "./observables";

export interface Window {
  width: number;
  height: number;
}

export interface View {
  zoom?: number;
  panX?: number;
  panY?: number;
}

/**
 *
 */
export class CanvasController {
  gridCtx: CanvasRenderingContext2D;
  cellCtx: CanvasRenderingContext2D;
  cellCount: number;
  isDarkMode: boolean;
  subject: Subject<ControllerState>;
  window?: Window;
  view: View = {};
  isRedrawNeeded = true;

  constructor(
    gridCtx: CanvasRenderingContext2D,
    cellCtx: CanvasRenderingContext2D,
    cellCount: number,
    initialTheme: string | undefined,
    subject: Subject<ControllerState>
  ) {
    this.gridCtx = gridCtx;
    this.cellCtx = cellCtx;
    this.cellCount = cellCount;
    this.isDarkMode = initialTheme === "dark";
    this.subject = subject;
  }

  /**
   * The minimum zoom value where the game area is not smaller than the window.
   */
  get minZoom(): number {
    if (!this.window || !this.view) throw Error("Canvas not initialized");

    return Math.ceil(
      Math.max(this.window.width, this.window.height) / this.cellCount
    );
  }

  /**
   * The maximum pan value in the x direction that dosen't extend off the game area.
   */
  get maxPanX(): number {
    if (!this.window || !this.view?.zoom) throw Error("Canvas not initialized");

    return this.cellCount * this.view.zoom - this.window.width;
  }

  /**
   * The maximum pan value in the y direction that dosen't extend off the game area.
   */
  get maxPanY(): number {
    if (!this.window || !this.view?.zoom) throw Error("Canvas not initialized");

    return this.cellCount * this.view.zoom - this.window.height;
  }

  /**
   * The row and column on the game area at the current center of the window. Adjusted
   * so that the center of the game area is 0,0 (internally 0,0 is the top left corner).
   */
  get centerRowCol(): {row: number; col: number} {
    if (!this.window || !this.view) throw Error("Canvas not initialized");

    const {row, col} = this.xyToRowColIndex(
      this.window.width / 2,
      this.window.height / 2
    );
    return {row: row - this.cellCount / 2, col: col - this.cellCount / 2};
  }

  /**
   * Receives the current window dimensions and stores it in object state. Triggers
   * setView method to calculate view parameters using updated window dimensions.
   * @param width Current window width in pixels
   * @param height Current height width in pixels
   */
  setWindow(width: number, height: number): void {
    this.window = {width, height};
    this.setView(null);
  }

  /**
   * Updates the zoom and panning properties with the provided object, and ensures the values are
   * within acceptable bounds. If parameter is null, current zoom and panning properties are rechecked.
   * @param newView Object containing updated zoom and pan parameters
   */
  setView(newView: View | null): void {
    if (!this.window) throw Error("Canvas not initialized");

    // if (typeof this.view === "undefined") {
    //   this.view = {};
    //   this.view.zoom = 10;
    //   this.view.panX = Math.round(this.maxPanX / 2);
    //   this.view.panY = Math.round(this.maxPanY / 2);
    // }

    if (newView) this.view = {...this.view, ...newView};

    this.view.zoom = this.clamp(this.view.zoom ?? 10, this.minZoom, 100);

    this.view.panX = this.clamp(
      this.view.panX ?? Math.round(this.maxPanX / 2),
      0,
      this.maxPanX
    );

    this.view.panY = this.clamp(
      this.view.panY ?? Math.round(this.maxPanY / 2),
      0,
      this.maxPanY
    );

    this.isRedrawNeeded = true;

    const {row, col} = this.centerRowCol;

    this.subject.next({zoom: this.view.zoom, row, col});
  }

  /**
   * Updates zoom property with the specified value, and adjusts
   * panning properties so that the specified point is stationary.
   * @param zoom Desired zoom value
   * @param x x-coordinate of point to keep stationary
   * @param y y-coordinate of point to keep stationary
   */
  zoomAtPoint(zoom: number, x: number, y: number): void {
    if (!this.view?.zoom || !this.view?.panX || !this.view?.panY)
      throw Error("Canvas not initialized");

    const {zoom: oldZoom, panX: oldPanX, panY: oldPanY} = this.view;
    const newZoom = this.clamp(zoom, this.minZoom, 100);
    const scale = newZoom / oldZoom - 1;
    const newPanX = Math.round(oldPanX + scale * (oldPanX + x));
    const newPanY = Math.round(oldPanY + scale * (oldPanY + y));
    this.setView({zoom: newZoom, panX: newPanX, panY: newPanY});
  }

  setColorTheme(theme: string): void {
    this.isDarkMode = theme === "dark" ? true : false;
    this.isRedrawNeeded = true;
  }

  /**
   * Clears any drawing on all canvases.
   */
  clearCanvases(): void {
    [this.gridCtx, this.cellCtx].forEach(ctx => {
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
    if (!this.window) return;

    if (born && died && !this.isRedrawNeeded)
      this.renderChangedCells(born, died);
    else if (didCellsChange || this.isRedrawNeeded) {
      this.clearCanvases();
      this.renderGrid();
      this.renderAllCells(alive, preview);
      this.isRedrawNeeded = false;
    }
  }

  /**
   * Redraws all grid lines based on the current zoom and panning properties.
   */
  renderGrid(): void {
    if (!this.view?.zoom || !this.view?.panX || !this.view?.panY)
      throw Error("Canvas not initialized");

    const {width, height} = this.gridCtx.canvas;
    const {row: startRow, col: startCol} = this.xyToRowColIndex(0, 0);
    const {row: endRow, col: endCol} = this.xyToRowColIndex(width, height);

    const {zoom, panX, panY} = this.view;
    this.gridCtx.setTransform(zoom, 0, 0, zoom, -panX, -panY);

    if (zoom < 5) return;

    this.gridCtx.lineWidth = 0.025;

    this.gridCtx.strokeStyle = "lightgrey";
    this.gridCtx.beginPath();
    for (let col = startCol + 1; col <= endCol; col++) {
      this.gridCtx.moveTo(col, startRow);
      this.gridCtx.lineTo(col, endRow + 1);
    }
    for (let row = startRow + 1; row <= endRow; row++) {
      this.gridCtx.moveTo(startCol, row);
      this.gridCtx.lineTo(endCol + 1, row);
    }
    this.gridCtx.stroke();

    this.gridCtx.strokeStyle = this.isDarkMode ? "white" : "darkgray";
    this.gridCtx.beginPath();
    for (let col = startCol + 1; col <= endCol; col++) {
      if (col % 10 === 0) {
        this.gridCtx.moveTo(col, startRow);
        this.gridCtx.lineTo(col, endRow + 1);
      }
    }
    for (let row = startRow + 1; row <= endRow; row++) {
      if (row % 10 === 0) {
        this.gridCtx.moveTo(startCol, row);
        this.gridCtx.lineTo(endCol + 1, row);
      }
    }
    this.gridCtx.stroke();
  }

  /**
   * Redraws all cells in the game area, plus a translucent preview of a
   * pattern selected from the pattern library.
   * @param alive Indices of all alive cells in game
   * @param preview Indices of cells in pattern being previewed
   */
  renderAllCells(alive: number[], preview: number[]): void {
    if (!this.view?.zoom || !this.view?.panX || !this.view?.panY)
      throw Error("Canvas not initialized");

    const {zoom, panX, panY} = this.view;
    this.cellCtx.setTransform(zoom, 0, 0, zoom, -panX, -panY);

    this.cellCtx.fillStyle = this.isDarkMode
      ? "rgba(255, 255, 255, 1)"
      : "rgba(0, 0, 0, 1)";
    for (let i = 0; i < alive.length; ++i) {
      const {row, col} = this.indexToRowCol(alive[i]);
      this.cellCtx.fillRect(col, row, 1, 1);
    }

    this.cellCtx.fillStyle = this.isDarkMode
      ? "rgba(255, 255, 255, 0.5)"
      : "rgba(0, 0, 0, 0.5)";
    for (let i = 0; i < preview.length; ++i) {
      const {row, col} = this.indexToRowCol(preview[i]);
      this.cellCtx.fillRect(col, row, 1, 1);
    }
  }

  /**
   * Draws or clears the modified cells in the game area.
   * @param born Indices of all cells born this generation
   * @param died Indices of all cells died this generation
   */
  renderChangedCells(born: number[], died: number[]): void {
    this.cellCtx.fillStyle = this.isDarkMode
      ? "rgba(255, 255, 255, 1)"
      : "rgba(0, 0, 0, 1)";

    for (let i = 0; i < born.length; ++i) {
      const {row, col} = this.indexToRowCol(born[i]);
      this.cellCtx.fillRect(col, row, 1, 1);
    }

    for (let i = 0; i < died.length; ++i) {
      const {row, col} = this.indexToRowCol(died[i]);
      this.cellCtx.clearRect(col, row, 1, 1);
    }
  }

  /**
   * Converts an index from the game area to the equivilant row and column.
   */
  indexToRowCol(i: number): {row: number; col: number} {
    return {row: Math.floor(i / this.cellCount), col: i % this.cellCount};
  }

  /**
   * Converts coordinates from the window to the row, column, and index on the game area.
   * @param x Window x-coordinate
   * @param y Window y-coordinate
   */
  xyToRowColIndex(
    x: number,
    y: number
  ): {row: number; col: number; index: number} {
    if (!this.view?.zoom || !this.view?.panX || !this.view?.panY)
      throw Error("Canvas not initialized");

    const row = Math.floor((y + this.view.panY) / this.view.zoom);
    const col = Math.floor((x + this.view.panX) / this.view.zoom);
    const index = this.cellCount * row + col;
    return {row, col, index};
  }

  /**
   * Restricts a value between a minimum and maximum.
   * @param val Value to be clamped
   * @param min Minimum value to be returned
   * @param max Maximum value to be returned
   */
  clamp(val: number, min: number, max: number): number {
    return val > max ? max : val < min ? min : val;
  }
}
