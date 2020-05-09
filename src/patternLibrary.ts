import {patternSubject} from "./observables";

interface PatternData {
  name: string;
  author: string;
  description: string[];
  array: number[][];
}

const map = new Map();

const categories = {
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
  Spaceships: ["copperhead", "glider", "loafer", "lwss", "mwss", "hwss"],
  Puffers: [
    "birthdaypuffer",
    "blinkerpuffer1",
    "blinkerpuffer2",
    "blocklayingswitchengine",
    "frothingpuffer",
    "gliderproducingswitchengine",
    "glidertrain",
    "hivenudger2",
    "noahsark",
    "ponyexpress",
    "puffer1",
    "puffer2",
    "pufferfish",
    "slowpuffer1",
    "slowpuffer2"
  ],
  Rakes: [
    "3enginecordershiprake",
    "backrake1",
    "backrake2",
    "backrake3",
    "c5diagonalrake",
    "spacerake",
    "weekenderdistaff"
  ],
  Guns: [
    "bigun",
    "gosperglidergun",
    "p41660p5h2v0gun",
    "p448dartgun",
    "p69060p5h2v0gun",
    "p94s",
    "simkinglidergun"
  ],
  Methuselahs: [
    "acorn",
    "bheptomino",
    "bunnies",
    "herschel",
    "lidka",
    "piheptomino",
    "rpentomino",
    "switchengine"
  ]
};

/**
 *
 * @param {string?} id
 */
export function setSelected(id: string | null) {
  patternSubject.next(id ? getData(id).array : null);
}

/**
 *
 */
export function rotateSelected() {
  if (!patternSubject.value) return;

  const width = patternSubject.value.length;
  const height = patternSubject.value[0].length;

  let newArray = new Array(height);
  for (let row = 0; row < height; row++) {
    newArray[row] = new Array(width);
    for (let col = 0; col < width; col++) {
      newArray[row][col] = patternSubject.value[width - col - 1][row];
    }
  }

  patternSubject.next(newArray);
}

/**
 *
 */
export function flipSelected() {
  if (!patternSubject.value) return;
  let newArr = patternSubject.value;

  for (let i = 0; i < newArr.length; i++) {
    newArr[i].reverse();
  }
  patternSubject.next(newArr);
}

/**
 *
 * @param {string} id
 * @returns {PatternData}
 * @throws {Error}
 */
function getData(id: string): PatternData {
  const data = map.get(id);
  if (data) return data;
  else throw new Error(`No pattern data found for '${id}'`);
}

/**
 * @async
 * @returns {Promise<void>}
 */
export async function loadDataFromFiles() {
  const patternList = Object.values(categories).flat();

  await Promise.all(
    patternList.map(async id => {
      try {
        const patternData = await readPatternFile(id);
        map.set(id, patternData);
      } catch (err) {
        console.error(`Error parsingzzs ${id}.rle`);
        throw err;
      }
    })
  );
}

/**
 *
 * @async
 * @param {string} id
 * @returns {Promise<PatternData>}
 */
async function readPatternFile(id: string): Promise<PatternData> {
  const data = (await import(`../patterns/${id}.rle`)).default as string;
  const rle = data.match(/^[^#xX]*!/m)?.[0].replace(/(\r\n|\n|\r)/gm, "") ?? "";
  const width = parseInt(
    data.match(/[xX] = [^,]*/)?.[0].replace(/[xX] = /, "") ?? ""
  );
  const height = parseInt(
    data.match(/[yY] = [^,]*/)?.[0].replace(/[yY] = /, "") ?? ""
  );

  return {
    name: data.match(/#N .*/g)?.[0].replace(/#N /, "") ?? "",
    author: data.match(/#O .*/g)?.[0].replace(/#O /, "") ?? "",
    description: data.match(/#C .*/g)?.map(str => str.replace(/#C /, "")) ?? [],
    array: rleParser(rle, width, height)
  };
}

/**
 *
 * @param {string} rle
 * @returns {number[][]}
 * @throws {Error}
 */
function rleParser(rle: string, width: number, height: number): number[][] {
  let array: number[][] = [...Array(height)].map(() => Array(width).fill(0));

  let rowIndex = 0;
  let colIndex = 0;
  let countString = "";

  Array.from(rle).forEach(char => {
    if (char >= "0" && char <= "9") countString += char;
    else {
      for (let i = 0; i < (parseInt(countString, 10) || 1); i++) {
        switch (char) {
          case "b":
            array[rowIndex][colIndex] = 0;
            colIndex++;
            break;
          case "o":
            array[rowIndex][colIndex] = 1;
            colIndex++;
            break;
          case "$":
            rowIndex++;
            colIndex = 0;
            break;
          case "!":
            break;
          default:
            throw new Error("Invalid character in pattern file");
        }
      }
      countString = "";
    }
  });

  return array;
}

/**
 *
 */
export function generateDropdownHTML(targetId: string): void {
  const target = document.getElementById(targetId) as HTMLDivElement;

  target.innerHTML = `<ul>
    ${Object.entries(categories)
      .map(([category, contents]) => {
        return `<li>
          <a class="btn-flat">${category}
            <svg><use xlink:href="icons.svg#chevron-right"></use></svg>
          </a>
          <ul class="pattern-list">
          ${contents
            .map(id => {
              return `<li>
                <a
                  class="btn-flat"
                  data-pattern="${id}"
                  data-tooltip-content="${getData(id).description[0]}"
                  data-tooltip-direction="right"
                >
                  ${getData(id).name}
                </a>
              </li>`;
            })
            .join("")}
          </ul>
        <li>`;
      })
      .join("")}
  </ul>`;
}
