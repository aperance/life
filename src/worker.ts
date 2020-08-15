import {GameEngine} from "life-wasm";

interface Result {
  born: number[];
  died: number[];
}

let generator: GameEngine | Generator<Result>;

/**
 *
 */
onmessage = async (e: MessageEvent) => {
  const {action, payload} = e.data;
  switch (action) {
    case "start":
      if (payload.wasm)
        try {
          const {GameEngine} = await import("life-wasm");
          generator = new GameEngine(payload.size, payload.initialAlive);
        } catch (e) {
          console.error("Error importing wasm:", e);
        }
      else generator = createGenerator(payload.size, payload.initialAlive);
      postMessage("started");
      break;
    case "requestResults":
      if (generator) postMessage(batchResults(payload.count));
      break;
    default:
      break;
  }
};

/**
 *
 */
function batchResults(count: number): {results: Result[]; duration: number} {
  performance.mark("Batch Start");

  const arr: Result[] = [];

  for (let i = 0; i < count; i++) {
    const {born, died}: Result = generator.next().value;
    arr[i] = {born: [...born], died: [...died]};
  }

  performance.mark("Batch End");
  performance.measure("Batch Duration", "Batch Start", "Batch End");

  const duration = performance
    .getEntriesByName("Batch Duration")
    .map(x => x.duration)[0];

  performance.clearMeasures();

  return {results: arr, duration};
}

/**
 *
 */
function* createGenerator(size: number, initial: number[]): Generator<Result> {
  const alive = new Set(initial);
  let checkNextTime = new Set<number>();
  let cellsToCheck: IterableIterator<number>;
  let born, died;

  for (const cellIndex of alive) {
    const neighbors = getNeighbors(cellIndex, size);
    checkNextTime.add(cellIndex);
    for (const n of neighbors) checkNextTime.add(n);
  }

  while (true) {
    cellsToCheck = checkNextTime.values();
    checkNextTime = new Set();

    born = [];
    died = [];

    for (const cellIndex of cellsToCheck) {
      let isAlive, isChanged;
      const wasAlive = alive.has(cellIndex);
      let aliveNeighborCount = 0;
      const neighbors = getNeighbors(cellIndex, size);

      for (const neighborIndex of neighbors)
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
        for (const n of neighbors) checkNextTime.add(n);
      }
    }

    for (const cellIndex of born) alive.add(cellIndex);
    for (const cellIndex of died) alive.delete(cellIndex);

    yield {born, died};
  }
}

/**
 *
 */
function getNeighbors(index: number, size: number): number[] {
  const wrap = true;
  const row = Math.floor(index / size);
  const col = index % size;
  const max = size - 1;

  const rowBack = row === 0 ? size * max : -size;
  const rowFwd = row === max ? -size * max : size;
  const colBack = col === 0 ? max : -1;
  const colFwd = col === max ? -max : 1;

  const arr = [];

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

export {createGenerator};
