function* gameEngine(size, initialAlive) {
  let universe = new Uint8Array(size * size);
  let pastUniverse, born, died, alive, checkNextTime;
  let generation = 0;
  let cellsToCheck = [];

  for (let i = 0, n = initialAlive.length; i < n; i++) {
    const index = initialAlive[i];
    universe[index] = 1;
    const neighbors = getNeighbors(index, size);
    cellsToCheck.push(index, ...neighbors);
  }
  cellsToCheck = [...new Set(cellsToCheck)];

  while (true) {
    pastUniverse = new Uint8Array(universe);
    born = [];
    died = [];
    alive = [];
    checkNextTime = [];

    for (let i = 0, n = cellsToCheck.length; i < n; i++) {
      const index = cellsToCheck[i];
      const neighbors = getNeighbors(index, size);

      let aliveNeighborCount = 0;

      for (let i = 0; i < 8; i++) {
        aliveNeighborCount += pastUniverse[neighbors[i]];
      }

      switch (aliveNeighborCount) {
        case 2:
          universe[index] = pastUniverse[index];
          break;
        case 3:
          universe[index] = 1;
          if (pastUniverse[index] === 0) born.push(index);
          break;
        default:
          universe[index] = 0;
          if (pastUniverse[index] === 1) died.push(index);
          break;
      }

      if (universe[index] === 1) alive.push(index);

      if (universe[index] !== pastUniverse[index])
        checkNextTime.push(index, ...neighbors);
    }

    generation++;

    yield { born, died, alive, generation };

    cellsToCheck = Array.from(new Set(checkNextTime));
  }
}

function getNeighbors(index, size) {
  const row = Math.floor(index / size);
  const col = index % size;
  const rowPrev = row === 0 ? size - 1 : row - 1;
  const rowNext = row === size - 1 ? 0 : row + 1;
  const colPrev = col === 0 ? size - 1 : col - 1;
  const colNext = col === size - 1 ? 0 : col + 1;

  return [
    size * rowPrev + colPrev,
    size * rowPrev + col,
    size * rowPrev + colNext,
    size * row + colPrev,
    size * row + colNext,
    size * rowNext + colPrev,
    size * rowNext + col,
    size * rowNext + colNext
  ];
}

export { gameEngine };
