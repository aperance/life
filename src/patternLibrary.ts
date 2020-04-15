interface PatternData {
  name: string;
  author: string;
  description: string[];
  array: number[][];
}

import {BehaviorSubject} from "rxjs";

const map = new Map();

//@ts-ignore
export const selected: BehaviorSubject<number[][] | null> = new BehaviorSubject(
  null
);
export const selection$ = selected.asObservable();

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
 *
 * @param {string?} id
 */
export function setSelected(id: string | null) {
  selected.next(id ? getData(id).array : null);
}

/**
 *
 */
export function rotateSelected() {
  if (!selected.value) return;

  const width = selected.value.length;
  const height = selected.value[0].length;

  let newArray = new Array(height);
  for (let row = 0; row < height; row++) {
    newArray[row] = new Array(width);
    for (let col = 0; col < width; col++) {
      newArray[row][col] = selected.value[width - col - 1][row];
    }
  }

  selected.next(newArray);
}

/**
 *
 */
export function flipSelected() {
  if (!selected.value) return;
  let newArr = selected.value;

  for (let i = 0; i < newArr.length; i++) {
    newArr[i].reverse();
  }
  selected.next(newArr);
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
      const patternData = await readPatternFile(id);
      map.set(id, patternData);
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
  const file = await import(`../patterns/${id}.rle`);
  const data = file.default.split(/x.*[sS]23/) as string[];
  const rle = data[1].replace(/(\r\n|\n|\r)/gm, "");

  return {
    name: data[0].match(/#N .*/g)?.[0].replace(/#N /, "") ?? "",
    author: data[0].match(/#O .*/g)?.[0].replace(/#O /, "") ?? "",
    description:
      data[0].match(/#C .*/g)?.map(str => str.replace(/#C /, "")) ?? [],
    array: rleParser(rle)
  };
}

/**
 *
 * @param {string} rle
 * @returns {number[][]}
 * @throws {Error}
 */
function rleParser(rle: string): number[][] {
  let outerArray: number[][] = [];
  let innerArray: number[] = [];
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
 * @returns {string}
 */
export function generateListHTML(): string {
  return `
      <ul class="collapsible">
        ${Object.entries(categories)
          .map(([category, contents]) => {
            return `
              <li>
                <div class="collapsible-header">${category}</div>
                <div class="collapsible-body collection">
                  ${contents
                    .map(id => {
                      return `
                        <a href="#"
                          class="collection-item"
                          data-pattern="${id}"
                          data-role="listItem"
                        >
                          &nbsp;&nbsp;${getData(id).name}
                        </a>
                      `;
                    })
                    .join("")}
                </div>
              <li>
            `;
          })
          .join("")}
      </ul>
    `;
}

/**
 *
 * @returns {string}
 */
export function generateDetailHTML(id: string): string {
  const {name, author, description} = getData(id);

  return `
        <div>
          <h4>${name}</h4>
          <p>Discovered by ${author}</p>
          ${description
            .map(string => {
              const link = string.match(/conwaylife.com.*/)?.[0];
              if (link)
                return `<a target=”_blank” href="http://www.${link}">LifeWiki</a>`;
              else return `<p>${string}</p>`;
            })
            .join("")}
          <br></br>
          <button type="button"
            class="btn modal-close"
            data-pattern="${id}"
            data-role="selectBtn"
          >
            Select Pattern
          </button>
        </div>
      `;
}
