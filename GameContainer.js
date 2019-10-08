import React, { useState, useEffect } from "react";
import { Grid } from "./Grid";
import { gameEngine } from "./gameEngine";

const size = 100;

const GameContainer = () => {
  const [universe, setUniverse] = useState(new Uint8Array(size * size));
  const [isRunning, setRunning] = useState(false);

  useEffect(() => {
    if (isRunning) {
      const game = gameEngine(size, universe);
      setUniverse(game.next().value);
      setInterval(() => {
        setUniverse(game.next().value);
      }, 10);
      return () => clearInterval(interval);
    }
  }, [isRunning]);

  const toggleCell = i => {
    if (!isRunning) {
      const newUniverse = new Uint8Array(universe);
      newUniverse[i] = newUniverse[i] ? 0 : 1;
      setUniverse(newUniverse);
    }
  };

  return (
    <div>
      <div>
        <button onClick={() => setRunning(true)}>Start</button>
      </div>
      <Grid universe={universe} size={size} toggleCell={toggleCell} />
    </div>
  );
};

export { GameContainer };
