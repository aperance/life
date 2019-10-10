const cellSize = 5;

class GameEngine {
  constructor(size, canvas) {
    this.size = size;
    this.universe = new Uint8Array(size * size);
    this.canvas = canvas;
    this.canvas.addEventListener("mousedown", this.clickHandler.bind(this));
  }

  clickHandler(e) {
    console.log(e);
    const rect = this.canvas.getBoundingClientRect();
    const row = Math.floor((e.clientY - rect.top) / cellSize);
    const col = Math.floor((e.clientX - rect.left) / cellSize);
    const index = this.size * row + col;
    this.universe[index] = this.universe[index] === 0 ? 1 : 0;
    this.drawUniverse();
  }

  play(cycleTime) {
    this.game = this.generator(this.size, this.universe);
    this.interval = setInterval(() => {
      const { newUniverse } = this.game.next().value;
      this.universe = newUniverse;
      this.drawUniverse();
    }, cycleTime);
  }

  drawUniverse() {
    let ctx = this.canvas.getContext("2d");
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        ctx.strokeStyle = "lightgrey";
        ctx.lineWidth = ".25";
        ctx.strokeRect(col * cellSize, row * cellSize, cellSize, cellSize);
        if (this.universe[this.size * row + col] === 1) {
          ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
        }
      }
    }
  }

  *generator(size, startingUniverse) {
    let currentUniverse = startingUniverse;
    let newUniverse, born, died;
    while (true) {
      newUniverse = new Uint8Array(size * size);
      born = [];
      died = [];
      for (let row = 0; row < size; row++) {
        const rowPrev = row === 0 ? size - 1 : row - 1;
        const rowNext = row === size - 1 ? 0 : row + 1;

        for (let col = 0; col < size; col++) {
          const colPrev = col === 0 ? size - 1 : col - 1;
          const colNext = col === size - 1 ? 0 : col + 1;

          const selfIndex = size * row + col;
          const neighborIndecies = [
            size * rowPrev + colPrev,
            size * rowPrev + col,
            size * rowPrev + colNext,
            size * row + colPrev,
            size * row + colNext,
            size * rowNext + colPrev,
            size * rowNext + col,
            size * rowNext + colNext
          ];

          let aliveNeighborCount = 0;

          neighborIndecies.forEach(i => {
            if (currentUniverse[i]) aliveNeighborCount++;
          });

          switch (aliveNeighborCount) {
            case 2:
              newUniverse[selfIndex] = currentUniverse[selfIndex];
              break;
            case 3:
              newUniverse[selfIndex] = 1;
              if (currentUniverse[selfIndex] === 0) born.push(selfIndex);
              break;
            default:
              newUniverse[selfIndex] = 0;
              if (currentUniverse[selfIndex] === 1) died.push(selfIndex);
              break;
          }
        }
      }
      currentUniverse = newUniverse;

      yield { newUniverse, born, died };
    }
  }
}

export { GameEngine };
