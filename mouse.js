import { patterns, rleToArray } from "./patterns";

class MouseTracker {
  constructor(gameRenderer, gameController, canvas) {
    this.gameRenderer = gameRenderer;
    this.gameController = gameController;
    this.canvas = canvas;
    this.down = false;
    this.panning = false;
    this.dragging = false;
    this.draggedShape = null;
    this.lastX = null;
    this.lastY = null;

    canvas.onmouseenter = this.canvasEnter.bind(this);
    canvas.onmousedown = this.canvasDown.bind(this);
    canvas.onmouseleave = this.canvasLeave.bind(this);
    canvas.onmousemove = this.canvasMove.bind(this);
    canvas.onmouseup = this.canvasUp.bind(this);

    canvas.addEventListener("wheel", this.canvasWheel.bind(this), {
      passive: true
    });
  }

  canvasEnter(e) {
    if (e.buttons === 1) {
      this.down = true;
      this.dragging = true;
      this.draggedShape = rleToArray(patterns.max);
    }
  }

  canvasLeave() {
    if (this.dragging) this.gameController.clearPreview();

    this.down = false;
    this.panning = false;
    this.dragging = false;
    this.draggedShape = null;
    this.lastX = null;
    this.lastY = null;
  }

  canvasDown(e) {
    this.down = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  }

  canvasUp(e) {
    if (!this.panning) {
      if (this.dragging)
        this.gameController.placeElement(
          e.offsetX,
          e.offsetY,
          this.draggedShape
        );
      else this.gameController.toggleCell(e.offsetX, e.offsetY);
    }

    this.down = false;
    this.panning = false;
    this.dragging = false;
    this.draggedShape = null;
    this.lastX = null;
    this.lastY = null;
  }

  canvasMove(e) {
    if (!this.down) return;

    if (this.dragging)
      this.gameController.placePreview(e.offsetX, e.offsetY, this.draggedShape);
    else {
      const movementX = this.lastX - e.clientX;
      const movementY = this.lastY - e.clientY;

      if (this.panning || Math.abs(movementX) > 5 || Math.abs(movementY) > 5) {
        this.gameRenderer.setView({
          panX: Math.round(this.gameRenderer.view.panX + movementX),
          panY: Math.round(this.gameRenderer.view.panY + movementY)
        });
        this.panning = true;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
      }
    }
  }

  canvasWheel(e) {
    const { zoom, panX, panY } = this.gameRenderer.view;
    this.gameRenderer.setView({
      zoom: Math.round(zoom + Math.sign(e.deltaY) * (1 + zoom / 50))
    });

    const scale = this.gameRenderer.view.zoom / zoom - 1;
    this.gameRenderer.setView({
      panX: Math.round(panX + (panX + e.offsetX) * scale),
      panY: Math.round(panY + (panY + e.offsetY) * scale)
    });
  }
}

export { MouseTracker };
