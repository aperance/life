/**
 * Pattern Library is a collection of well known patterns provided to the user.
 * These patterns are imported from ".rle" data files created by the game of
 * life community. These files are located in the "patterns" folder of this
 * repository. An associated dropdown menu is generated listing all available
 * patterns for the user to select from.
 * @packageDocumentation
 */

import {patternSubject} from "./observables";

/**
 * Object containing the data extracted from a pattern data file.
 */
interface PatternData {
  /** Properly formatted name of pattern */
  name: string;
  /** Name of person who discovered pattern */
  author: string;
  /** Description of pattern */
  description: string[];
  /** Pattern shape represented as a 2D array or bits */
  array: number[][];
}

/**
 * Hash map storing imported pattern data objects.
 */
const patternMap = new Map<string, PatternData>();

/**
 * List of all available pattern organized by category. Used to generate
 * HTML for dropdown and determine which data file to import.
 */
const patternList = {
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
 * Retrieves patternData for provided id and emits the 2D array representing
 * the pattern shape (using RxJS subject). Subject is cleared if id is null.
 */
export function setSelected(id: string | null): void {
  if (!id) patternSubject.next(null);
  else {
    const patternShape = patternMap.get(id)?.array;
    if (!patternShape) throw new Error(`No pattern data found for '${id}'`);
    patternSubject.next(patternShape);
  }
}

/**
 * Rotates the 2D array representing the pattern shape for the currently selected pattern.
 */
export function rotateSelected(): void {
  if (!patternSubject.value) return;

  const width = patternSubject.value.length;
  const height = patternSubject.value[0].length;

  const newShape = new Array(height);
  for (let row = 0; row < height; row++) {
    newShape[row] = new Array(width);
    for (let col = 0; col < width; col++) {
      newShape[row][col] = patternSubject.value[width - col - 1][row];
    }
  }

  patternSubject.next(newShape);
}

/**
 * Flips the 2D array representing the pattern shape for the currently selected pattern.
 */
export function flipSelected(): void {
  if (!patternSubject.value) return;
  const newShape = patternSubject.value;

  for (let i = 0; i < newShape.length; i++) {
    newShape[i].reverse();
  }
  patternSubject.next(newShape);
}

/**
 * For each pattern in patternList, parses associated data file and saves object in hash map.
 * @async
 */
export async function loadDataFromFiles(): Promise<void> {
  const patterns = Object.values(patternList).flat();

  await Promise.all(
    patterns.map(async id => {
      try {
        const data: string = (await import(`../patterns/${id}.rle`)).default;

        const name = data.match(/#N .*/g)?.[0].replace(/#N /, "") ?? "";
        const author = data.match(/#O .*/g)?.[0].replace(/#O /, "") ?? "";
        const description =
          data.match(/#C .*/g)?.map(str => str.replace(/#C /, "")) ?? [];
        const rle =
          data.match(/^[^#xX]*!/m)?.[0].replace(/(\r\n|\n|\r)/gm, "") ?? "";
        const width = parseInt(
          data.match(/[xX] = [^,]*/)?.[0].replace(/[xX] = /, "") ?? ""
        );
        const height = parseInt(
          data.match(/[yY] = [^,]*/)?.[0].replace(/[yY] = /, "") ?? ""
        );
        const array = rleParser(rle, width, height);

        patternMap.set(id, {name, author, description, array});
      } catch (err) {
        console.error(`Error parsing ${id}.rle`);
        throw err;
      }
    })
  );
}

/**
 * Converts pattern shape from an RLE string to a 2D array.
 * @param rle Pattern shape encoded as an RLE string
 * @param width Width of pattern
 * @param height Height of pattern
 */
function rleParser(rle: string, width: number, height: number): number[][] {
  const array: number[][] = [...Array(height)].map(() => Array(width).fill(0));

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
 * Dynamically generate HTML for the patter dropdown menu.
 * @param targetId Node where generated HTML should be attached
 */
export function generateDropdownHTML(targetId: string): void {
  const target = document.getElementById(targetId) as HTMLDivElement;

  target.innerHTML = `<ul>
    ${Object.entries(patternList)
      .map(([category, contents]) => {
        return `<li>
          <a class="btn-flat">${category}
            <svg><use xlink:href="icons.svg#chevron-right"></use></svg>
          </a>
          <ul class="pattern-list">
          ${contents
            .map(id => {
              const patternData = patternMap.get(id);
              if (!patternData)
                throw new Error(`No pattern data found for '${id}'`);

              return `<li>
                <a
                  class="btn-flat"
                  data-pattern="${id}"
                  data-tooltip-content="${patternData.description[0]}"
                  data-tooltip-direction="right"
                >
                  ${patternData.name}
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
