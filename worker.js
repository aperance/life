import { gameEngine } from "./gameEngine";
import { GameEngine } from "life-wasm";

let game = null;
const wasm = true;

onmessage = function(e) {
  const { action, payload } = e.data;
  switch (action) {
    case "start":
      if (wasm) game = new GameEngine(payload.universe);
      else game = gameEngine(payload.universe);
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
  if (wasm) {
    const results = game.run_batch(count);
    return JSON.parse(results);
  } else {
    let arr = [];
    for (let i = 0; i < count; i++) {
      arr[i] = game.next().value;
    }
    return arr;
  }
}
