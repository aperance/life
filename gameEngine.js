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

function getNeighbors(index, size) {
  const wrap = false;
  const row = Math.floor(index / size);
  const col = index % size;
  const max = size - 1;

  const rowBack = row === 0 ? size * max : -size;
  const rowFwd = row === max ? -size * max : size;
  const colBack = col === 0 ? max : -1;
  const colFwd = col === max ? -max : 1;

  let arr = [];

  if (wrap || (row !== 0 && col !== 0)) arr.push(index + rowBack + colBack);
  if (wrap || row !== 0) arr.push(index + rowBack);
  if (wrap || (row !== 0 && col !== max)) arr.push(index + rowBack + colFwd);
  if (wrap || col !== 0) arr.push(index + colBack);
  if (wrap || col !== max) arr.push(index + colFwd);
  if (wrap || (row !== max && col !== 0)) arr.push(index + rowFwd + colBack);
  if (wrap || row !== max) arr.push(index + rowFwd);
  if (wrap || (row !== max && col !== max)) arr.push(index + rowFwd + colFwd);

  return arr;
}

export { gameEngine };
