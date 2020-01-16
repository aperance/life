/**
 * @typedef {Object} PatternData
 * @property {string} name
 * @property {string} author
 * @property {string[]} description
 * @property {number[][]} array
 */

/** @class */
export class PatternLibrary {
  _map = new Map();
  selected = null;
  observer;
  categories = {
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

  constructor(observer) {
    this.observer = observer;
  }

  /**
   * @async
   * @returns {Promise<void>}
   */
  async loadDataFromFiles() {
    const patternList = Object.values(this.categories).flat();

    await Promise.all(
      patternList.map(async id => {
        const patternData = await this.readPatternFile(id);
        this._map.set(id, patternData);
      })
    );
  }

  /**
   *
   * @param {string} id
   * @returns {PatternData}
   * @throws {Error}
   */
  getData(id) {
    const data = this._map.get(id);
    if (data) return data;
    else throw new Error(`No pattern data found for '${id}'`);
  }

  /**
   *
   * @param {string?} id
   */
  setSelected(id) {
    if (!id) this.selected = null;
    else this.selected = this.getData(id).array;

    this.observer(this.selected ? true : false);
  }

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

    this.observer(this.selected ? true : false);
  }

  /**
   *
   */
  flipSelected() {
    if (!this.selected) return;

    for (let i = 0; i < this.selected.length; i++) {
      this.selected[i].reverse();
    }

    this.observer(this.selected ? true : false);
  }

  /**
   *
   * @returns {string}
   */
  generateListHTML() {
    return `
        <div class="list-group">
          ${Object.entries(this.categories)
            .map(
              ([category, contents], index) =>
                `<a href="#category${index}"
                  class="list-group-item list-group-item-action collapse-link"
                  data-toggle="collapse"
                >
                  <strong>${category}</strong>
                </a>
                <div id="category${index}" class="collapse">
                  ${contents
                    .map(
                      id =>
                        `<a href="#"
                          class="list-group-item list-group-item-action"
                          data-pattern="${id}"
                          data-role="listItem"
                        >
                          &nbsp;&nbsp;${this.getData(id).name}
                        </a>`
                    )
                    .join("")}
                </div>`
            )
            .join("")}
        </div>
      `;
  }

  /**
   *
   * @returns {string}
   */
  generateDetailHTML(id) {
    const { name, author, description } = this.getData(id);

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
            class="btn btn-primary drop-shadow"
            data-dismiss="modal"
            data-pattern="${id}"
            data-role="selectBtn"
          >
            Select Pattern
          </button>
        </div>
      `;
  }

  /**
   *
   * @async
   * @param {string} id
   * @returns {Promise<PatternData>}
   */
  async readPatternFile(id) {
    const file = await import(`../patterns/${id}.rle`);
    const data = file.default.split(/x.*[sS]23/);
    const rle = data[1].replace(/(\r\n|\n|\r)/gm, "");

    return {
      name: data[0].match(/(?<=#N ).*/)[0],
      author: data[0].match(/(?<=#O ).*/)[0],
      description: data[0].match(/(?<=#C ).*/g),
      array: this.rleParser(rle)
    };
  }

  /**
   *
   * @param {string} rle
   * @returns {number[][]}
   * @throws {Error}
   */
  rleParser(rle) {
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
}
