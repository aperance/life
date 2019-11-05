function* gameEngine(size, initialAlive) {
  let universe = new Uint8Array(size * size);
  let born, died, alive;
  let generation = 0;
  let cellsToCheck;
  let checkNextTime = new Set();

  for (let cellIndex of initialAlive) {
    universe[cellIndex] = 1;
    const neighbors = getNeighbors(cellIndex, size);
    checkNextTime.add(cellIndex);
    for (let n of neighbors) checkNextTime.add(n);
  }

  while (true) {
    cellsToCheck = checkNextTime.values();
    checkNextTime = new Set();

    born = [];
    died = [];
    alive = [];
    generation++;

    for (const cellIndex of cellsToCheck) {
      const prevState = universe[cellIndex];
      const neighbors = getNeighbors(cellIndex, size);
      let aliveNeighborCount = 0;
      let isAlive = false;
      let isChanged = false;

      for (let neighborIndex of neighbors)
        aliveNeighborCount += universe[neighborIndex];

      switch (aliveNeighborCount) {
        case 2:
          isAlive = prevState === 1 ? true : false;
          break;
        case 3:
          isAlive = true;
          isChanged = prevState === 0 ? true : false;
          break;
        default:
          isAlive = false;
          isChanged = prevState === 1 ? true : false;
          break;
      }

      if (isAlive) {
        alive.push(cellIndex);
        checkNextTime.add(cellIndex);
      }

      if (isChanged) {
        if (isAlive) born.push(cellIndex);
        else died.push(cellIndex);
        checkNextTime.add(cellIndex);
        for (let n of neighbors) checkNextTime.add(n);
      }
    }

    for (let cellIndex of born) universe[cellIndex] = 1;
    for (let cellIndex of died) universe[cellIndex] = 0;

    yield { born, died, alive, generation };
  }
}

// function getNeighbors(index, size, wrap) {
//   const row = Math.floor(index / size);
//   const col = index % size;

//   let arr = [];

//   if (row !== 0) {
//     if (col !== 0) arr.push(index - size - 1);
//     arr.push(index - size);
//     if (col !== size - 1) arr.push(index - size + 1);
//   }

//   if (col !== 0) arr.push(index - 1);
//   if (col !== size - 1) arr.push(index + 1);

//   if (row !== size - 1) {
//     if (col !== 0) arr.push(index + size - 1);
//     arr.push(index + size);
//     if (col !== size - 1) arr.push(index + size + 1);
//   }

//   return arr;
// }

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
