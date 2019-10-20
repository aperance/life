function* gameEngine(size, startingUniverse) {
  let currentUniverse = startingUniverse;
  let newUniverse, born, died, alive;
  while (true) {
    newUniverse = new Uint8Array(size * size);
    born = [];
    died = [];
    alive = [];
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

        if (newUniverse[selfIndex] === 1) alive.push(selfIndex);
      }
    }
    currentUniverse = newUniverse;

    yield { newUniverse, born, died, alive };
  }
}

export { gameEngine };
