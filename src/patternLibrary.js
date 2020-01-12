const patternCategories = {
  Spaceships: ["copperhead", "glider", "loafer", "lwss", "mwss", "hwss"],
  Guns: ["bigun", "gosperglidergun", "p41660p5h2v0gun", "simkinglidergun"],
  Oscillators: [
    "beacon",
    "blinker",
    "blocker",
    "figureeight",
    "pentadecathlon",
    "pulsar",
    "queenbeeshuttle",
    "tannersp46",
    "toad",
    "twinbeesshuttle"
  ],
  "Gardens of Eden": ["gardenofeden1", "gardenofeden4", "gardenofeden5"]
};

/**
 * @typedef {Object} PatternData
 * @property {string} name
 * @property {string} author
 * @property {string[]} description
 * @property {number[][]} array
 */

/**
 * @typedef {Object} PatternLibrary
 * @property {Map<string,PatternData>} _map
 * @property {Object} categories
 * @property {number[][]?} selected
 * @property {function(): Promise<void>} loadDataFromFiles
 * @property {function(string): PatternData} getData
 * @property {function(string?): void} setSelected
 * @property {function(): void} rotateSelected
 * @property {function(): void} flipSelected
 */

/**
 *
 * @param {function} observer
 */
export const createPatternLibrary = observer => {
  /** @type {PatternLibrary} */
  const patternLibrary = {
    _map: new Map(),
    categories: patternCategories,
    selected: null,

    /**
     * @async
     * @returns {Promise<void>}
     */
    async loadDataFromFiles() {
      const patternList = Object.values(this.categories).flat();

      await Promise.all(
        patternList.map(async id => {
          const patternData = await readPatternFile(id);
          this._map.set(id, patternData);
        })
      );
    },

    /**
     *
     * @param {string} id
     * @returns {PatternData}
     * @throws
     */
    getData(id) {
      const data = this._map.get(id);
      if (data) return data;
      else throw new Error(`No pattern data found for '${id}'`);
    },

    /**
     *
     * @param {string?} id
     */
    setSelected(id) {
      if (!id) this.selected = null;
      else this.selected = this.getData(id).array;

      observer(this.selected ? true : false);
    },

    /**
     *
     */
    rotateSelected() {
      if (!this.selected) return;

      const width = this.selected.length;
      const height = this.selected[0].length;

      let newArray = new Array(height);
      for (let row = 0; row < height; row++) {
        newArray[row] = new Array(width);
        for (let col = 0; col < width; col++) {
          newArray[row][col] = this.selected[width - col - 1][row];
        }
      }

      this.selected = newArray;

      observer(this.selected ? true : false);
    },

    /**
     *
     */
    flipSelected() {
      if (!this.selected) return;

      for (let i = 0; i < this.selected.length; i++) {
        this.selected[i].reverse();
      }

      observer(this.selected ? true : false);
    }
  };

  return patternLibrary;
};

/**
 *
 * @async
 * @param {string} id
 * @returns {Promise<PatternData>}
 */
async function readPatternFile(id) {
  const file = await import(`../patterns/${id}.rle`);
  const data = file.default.split(/x.*[sS]23/);
  const rle = data[1].replace(/(\r\n|\n|\r)/gm, "");

  return {
    name: data[0].match(/(?<=#N ).*/)[0],
    author: data[0].match(/(?<=#O ).*/)[0],
    description: data[0].match(/(?<=#C ).*/g),
    array: rleParser(rle)
  };
}

/**
 *
 * @param {string} rle
 * @returns {number[][]}
 * @throws
 */
function rleParser(rle) {
  /** @type {number[][]} */
  let outerArray = [];
  /** @type {number[]} */
  let innerArray = [];
  let countString = "";

  Array.from(rle).forEach(char => {
    if (char >= "0" && char <= "9") countString += char;
    else if (char === "b" || char === "o" || char === "$" || char === "!") {
      const count = parseInt(countString, 10) || 1;
      for (let i = 0; i < count; i++) {
        if (char === "b") innerArray.push(0);
        if (char === "o") innerArray.push(1);
        if (char === "$" || char === "!") {
          outerArray.push(innerArray);
          innerArray = [];
        }
      }
      countString = "";
    } else throw new Error("Invalid character in pattern file");
  });

  return outerArray;
}
