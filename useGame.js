import { useState } from "react";

const useGame = size => {
  const [universe, setUniverse] = useState(new Uint8Array(size * size));
  const toggleCell = i => {
    const newUniverse = new Uint8Array(universe);
    newUniverse[i] = newUniverse[i] ? 0 : 1;
    setUniverse(newUniverse);
  };
  return [universe, toggleCell];
};

export { useGame };
