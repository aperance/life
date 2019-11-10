function* gameEngine(size, initialAlive) {
  let born, died;
  let generation = 0;
  let cellsToCheck;
  let checkNextTime = new Set();
  let alive = new Set(initialAlive);

  for (let cellIndex of initialAlive) {
    const neighbors = getNeighbors(cellIndex, size);
    checkNextTime.add(cellIndex);
    for (let n of neighbors) checkNextTime.add(n);
  }

  while (true) {
    cellsToCheck = checkNextTime.values();
    checkNextTime = new Set();

    born = [];
    died = [];
    generation++;

    for (const cellIndex of cellsToCheck) {
      let isAlive, isChanged;
      let wasAlive = alive.has(cellIndex);
      let aliveNeighborCount = 0;
      const neighbors = getNeighbors(cellIndex, size);

      for (let neighborIndex of neighbors)
        if (alive.has(neighborIndex)) aliveNeighborCount++;

      switch (aliveNeighborCount) {
        case 2:
          isAlive = wasAlive;
          isChanged = false;
          break;
        case 3:
          isAlive = true;
          isChanged = !wasAlive;
          break;
        default:
          isAlive = false;
          isChanged = wasAlive;
          break;
      }

      if (isChanged) {
        if (isAlive) born.push(cellIndex);
        else died.push(cellIndex);
        checkNextTime.add(cellIndex);
        for (let n of neighbors) checkNextTime.add(n);
      }
    }

    for (let cellIndex of born) alive.add(cellIndex);
    for (let cellIndex of died) alive.delete(cellIndex);

    yield { born, died, generation };
  }
}

function getNeighbors(index, size) {
  const wrap = true;
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
