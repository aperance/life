import { gameEngine } from "./gameEngine";

let game = null;
const wasm = true;

onmessage = async function(e) {
  const { action, payload } = e.data;
  switch (action) {
    case "start":
      if (wasm)
        try {
          const { GameEngine } = await import("life-wasm");
          game = new GameEngine(payload.size, payload.initialAlive);
        } catch (e) {
          console.error("Error importing wasm:", e);
        }
      else game = gameEngine(payload.size, payload.initialAlive);
      postMessage("started");
      break;
    case "requestResults":
      if (game) postMessage(batchResults(payload.count));
      break;
    default:
      break;
  }
};

function batchResults(count) {
  let arr = [];
  for (let i = 0; i < count; i++) {
    if (wasm) {
      let res = game.next();
      arr[i] = { born: [...res.born], died: [...res.died] };
    } else arr[i] = game.next().value;
  }
  return arr;
}
