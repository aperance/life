/** @namespace worker */

/**
 * @memberof worker
 * @type {Object|Generator}
 */
let generator;

/**
 * @memberof worker
 * @function
 */
onmessage = messageHandler;

/**
 *
 * @async
 * @memberof worker
 * @param {MessageEvent} e
 */
async function messageHandler(e) {
  const {action, payload} = e.data;
  switch (action) {
    case "start":
      if (payload.wasm)
        try {
          // @ts-ignore
          const {GameEngine} = await import("life-wasm");
          generator = new GameEngine(payload.size, payload.initialAlive);
        } catch (e) {
          console.error("Error importing wasm:", e);
        }
      else generator = createGenerator(payload.size, payload.initialAlive);
      // @ts-ignore
      postMessage("started");
      break;
    case "requestResults":
      // @ts-ignore
      if (generator) postMessage(batchResults(payload.count));
      break;
    default:
      break;
  }
}

/**
 *
 * @memberof worker
 * @param {number} count
 * @returns {Array<Object>}
 */
function batchResults(count) {
  let arr = [];
  for (let i = 0; i < count; i++) {
    // @ts-ignore
    const {born, died} = generator.next().value;
    arr[i] = {born: [...born], died: [...died]};
  }
  return arr;
}

/**
 *
 * @memberof worker
 * @param {number} size
 * @param {Array<number>} initialAlive
 * @returns {Generator}
 */
function* createGenerator(size, initialAlive) {
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

    yield {born, died, generation};
  }
}

/**
 *
 * @memberof worker
 * @param {number} index
 * @param {number} size
 * @returns {Array<number>}
 */
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

export {createGenerator};
