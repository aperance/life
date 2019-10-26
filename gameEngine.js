function* gameEngine(size, startingUniverse) {
  let universe = new Uint8Array(startingUniverse);
  let pastUniverse, born, died, alive;
  let generation = 0;

  while (true) {
    pastUniverse = new Uint8Array(universe);
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

        for (let i = 0, n = neighborIndecies.length; i < n; ++i) {
          const neighborIndex = neighborIndecies[i];
          if (pastUniverse[neighborIndex]) aliveNeighborCount++;
        }

        switch (aliveNeighborCount) {
          case 2:
            universe[selfIndex] = pastUniverse[selfIndex];
            break;
          case 3:
            universe[selfIndex] = 1;
            if (pastUniverse[selfIndex] === 0) born.push(selfIndex);
            break;
          default:
            universe[selfIndex] = 0;
            if (pastUniverse[selfIndex] === 1) died.push(selfIndex);
            break;
        }

        if (universe[selfIndex] === 1) alive.push(selfIndex);
      }
    }
    generation++;

    yield { born, died, alive, generation };
  }
}

export { gameEngine };
