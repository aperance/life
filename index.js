const size = 10;

const universe = [
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [1, 0, 0, 0, 1, 1, 0, 0, 0, 1],
  [0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0]
].flat();
console.table(reshape(universe));

function step(universe) {
  let newUniverse = [];

  for (let row = 0; row < size; row++) {
    const rowPrev = row === 0 ? size - 1 : row - 1;
    const rowNext = row === size - 1 ? 0 : row + 1;

    for (let col = 0; col < size; col++) {
      const colPrev = col === 0 ? size - 1 : col - 1;
      const colNext = col === size - 1 ? 0 : col + 1;

      const neighborCount =
        universe[size * rowPrev + colPrev] +
        universe[size * rowPrev + col] +
        universe[size * rowPrev + colNext] +
        universe[size * row + colPrev] +
        universe[size * row + colNext] +
        universe[size * rowNext + colPrev] +
        universe[size * rowNext + col] +
        universe[size * rowNext + colNext];

      const index = row * size + col;

      switch (neighborCount) {
        case 2:
          newUniverse[index] = universe[index];
          break;
        case 3:
          newUniverse[index] = 1;
          break;
        default:
          newUniverse[index] = 0;
          break;
      }
    }
  }
  console.table(reshape(newUniverse));
}

function reshape(arr) {
  const oldArr = [...arr];
  const newArr = [];
  while (oldArr.length) newArr.push(oldArr.splice(0, 10));
  return newArr;
}

step(universe);
