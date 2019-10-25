class MouseTracker {
  constructor(game, canvas) {
    this.game = game;
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
      this.draggedShape = [[0, 1, 0], [0, 0, 1], [1, 1, 1]];
    }
  }

  canvasLeave() {
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
        this.game.placeElement(e.offsetX, e.offsetY, this.draggedShape);
      else this.game.toggleCell(e.offsetX, e.offsetY);
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
    if (this.dragging) return;

    const movementX = this.lastX - e.clientX;
    const movementY = this.lastY - e.clientY;

    if (this.panning || Math.abs(movementX) > 5 || Math.abs(movementY) > 5) {
      this.game.setView({
        panX: this.game.view.panX + movementX,
        panY: this.game.view.panY + movementY
      });
      this.panning = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    }
  }

  canvasWheel(e) {
    const prevZoom = this.game.view.zoom;
    this.game.setView({
      zoom: this.game.view.zoom + e.deltaY / 50
    });
    const scale = this.game.view.zoom / prevZoom - 1;
    this.game.setView({
      panX:
        this.game.view.panX + this.game.view.panX * scale + e.offsetX * scale,
      panY:
        this.game.view.panY + this.game.view.panY * scale + e.offsetY * scale
    });
  }
}

export { MouseTracker };
