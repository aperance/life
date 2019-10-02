const size = 10;

const universe = [
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0]
];

console.table(universe);

function step() {
  const newUniverse = universe.map((arr, rowIndex) => {
    return arr.map((cell, columnIndex) => {
      const y0 = rowIndex === 0 ? size - 1 : rowIndex - 1;
      const y1 = rowIndex;
      const y2 = rowIndex === size - 1 ? 0 : rowIndex + 1;
      const x0 = columnIndex === 0 ? size - 1 : columnIndex - 1;
      const x1 = columnIndex;
      const x2 = columnIndex === size - 1 ? 0 : columnIndex + 1;

      const neighborCount =
        universe[y0][x0] +
        universe[y0][x1] +
        universe[y0][x2] +
        universe[y1][x0] +
        universe[y1][x2] +
        universe[y2][x0] +
        universe[y2][x1] +
        universe[y2][x2];

      switch (neighborCount) {
        case 2:
          return cell;
        case 3:
          return 1;
        default:
          return 0;
      }
    });
  });
  console.table(newUniverse);
}

step();
