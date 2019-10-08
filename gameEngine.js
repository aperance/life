function* gameEngine(size, startingUniverse) {
  let currentUniverse = startingUniverse;
  while (true) {
    yield currentUniverse;

    let newUniverse = [];
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
            break;
          default:
            newUniverse[selfIndex] = 0;
            break;
        }
      }
    }
    currentUniverse = newUniverse;
  }
}

export { gameEngine };
