function* gameEngine(startingUniverse) {
  const size = Math.sqrt(startingUniverse.length);
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

        const aliveNeighborCount =
          pastUniverse[size * rowPrev + colPrev] +
          pastUniverse[size * rowPrev + col] +
          pastUniverse[size * rowPrev + colNext] +
          pastUniverse[size * row + colPrev] +
          pastUniverse[size * row + colNext] +
          pastUniverse[size * rowNext + colPrev] +
          pastUniverse[size * rowNext + col] +
          pastUniverse[size * rowNext + colNext];

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
