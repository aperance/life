const categories = {
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
 *
 * @async
 * @returns {Promise}
 */
async function createPatternLibrary() {
  try {
    /** @type {Map<string,PatternData>} */
    const library = new Map();
    const patternList = Object.values(categories).flat();

    await Promise.all(patternList.map(id => loadFromFile(id, library)));
    return library;
  } catch (err) {
    console.error(err);
  }
}

/**
 *
 * @async
 * @param {string} id
 * @param {Map<string,PatternData>} library
 */
async function loadFromFile(id, library) {
  const file = await import(`../patterns/${id}.rle`);
  const data = file.default.split(/x.*[sS]23/);
  const rle = data[1].replace(/(\r\n|\n|\r)/gm, "");

  library.set(id, {
    name: data[0].match(/(?<=#N ).*/)[0],
    author: data[0].match(/(?<=#O ).*/)[0],
    description: data[0].match(/(?<=#C ).*/g),
    array: rleToArray(rle)
  });
}

/**
 *
 * @param {string} rle
 * @returns {number[][]}
 * @throws
 */
function rleToArray(rle) {
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

/**
 *
 * @param {Map<string,PatternData>} library
 * @returns {string}
 */
function generateListHTML(library) {
  return `<div class="list-group">
      ${Object.entries(categories)
        .map(
          ([category, contents], index) =>
            `<a class="list-group-item list-group-item-action collapse-link"
              data-toggle="collapse"
              href="#category${index}">
              ${category}
            </a>
            <div id="category${index}" class="collapse">
              ${contents
                .map(
                  id =>
                    `<a href="#"
                      class="pattern-name list-group-item list-group-item-action"
                      data-dismiss="modal"
                      data-pattern="${id}"
                    >
                      ${library.get(id)?.name}
                    </a>`
                )
                .join("")}
            </div>`
        )
        .join("")}
    </div>`;
}

export { createPatternLibrary, generateListHTML };
