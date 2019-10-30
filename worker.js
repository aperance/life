import { gameEngine } from "./gameEngine";
//import { GameEngine } from "life-wasm";

let game = null;

onmessage = function(e) {
  const { action, payload } = e.data;
  switch (action) {
    case "start":
      game = gameEngine(payload.universe);
      //game = new GameEngine(payload.universe);
      postMessage("started");
      break;
    case "requestResults":
      if (game) postMessage(batchResults());
      break;
    default:
      break;
  }
};

function batchResults() {
  let arr = [];
  for (let i = 0; i < 10; i++) {
    arr[i] = game.next().value;
  }
  return arr;
}

// function batchResults() {
//     let arr = [];
//     for (let i = 0; i < 10; i++) {
//       const { born, died, alive } = game.next();
//       arr[i] = { born, died, alive };
//     }
//     return arr;
//   }
