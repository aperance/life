const categories = {
  Guns: ["lwss", "mwss", "hwss"]
};

/**
 * @typedef {Object} PatternData
 * @property {string} name
 * @property {string} author
 * @property {string[]} description
 * @property {number[][]} array
 */

export const patternLibrary = {
  /**
   * @type {Map<string,PatternData>}
   */
  patternMap: new Map(),

  /**
   *
   * @returns {Promise}
   */
  init() {
    return Promise.all(
      Object.values(categories)
        .flat()
        .map(id => this.loadFromFile(id))
    ).catch(err => {
      console.error(err);
    });
  },

  /**
   *
   * @param {string} id
   */
  async loadFromFile(id) {
    const file = await import(`../patterns/${id}.rle`);
    const data = file.default.split(/x.*S23/);
    const rle = data[1].replace(/(\r\n|\n|\r)/gm, "");

    this.patternMap.set(id, {
      name: data[0].match(/(?<=#N ).*/)[0],
      author: data[0].match(/(?<=#O ).*/)[0],
      description: data[0].match(/(?<=#C ).*/g),
      array: rleToArray(rle)
    });
  },

  /**
   *
   * @param {string} id
   * @returns {PatternData}
   */
  getPatternData(id) {
    const patternData = this.patternMap.get(id);
    if (!patternData) throw new Error(`No pattern found for id '${id}'`);
    return patternData;
  },

  /**
   *
   * @returns {string}
   */
  generateListHTML() {
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
                      ${this.patternMap.get(id)?.name}
                    </a>`
                )
                .join("")}
            </div>`
        )
        .join("")}
    </div>`;
  }
};

/**
 *
 * @param {string} rle
 * @returns {number[][]}
 */
const rleToArray = rle =>
  rle
    .split("!")[0]
    .split("$")
    .map(substring => {
      /** @type {number[]} */
      let arr = [];
      let temp = "";
      substring.split("").forEach(char => {
        if (char !== "b" && char !== "o") temp += char;
        else {
          const count = parseInt(temp, 10) || 1;
          for (let i = 0; i < count; i++) {
            if (char === "b") arr.push(0);
            if (char === "o") arr.push(1);
          }
          temp = "";
        }
      });
      return arr;
    });

// const patternMap = new Map();

// export const loadPatternFiles = () => {
//   return Promise.all(
//     Object.values(categories)
//       .flat()
//       .map(id => readFile(id))
//   );
// };

// const readFile = async id => {
//   const file = await import(`../patterns/${id}.rle`);
//   const data = file.default.split(/x.*S23/);

//   patternMap.set(id, {
//     name: data[0].match(/(?<=#N ).*/)[0],
//     author: data[0].match(/(?<=#O ).*/)[0],
//     description: data[0].match(/(?<=#C ).*/g),
//     rle: data[1].replace(/(\r\n|\n|\r)/gm, "")
//   });
// };

// /**
//  *
//  * @param {string} id
//  * @returns {{array: Array<Array<number>>}}
//  */
// export const getPatternData = id => {
//   const patternData = patternMap.get(id);

//   const array = patternData.rle
//     .split("!")[0]
//     .split("$")
//     .map(substring => {
//       let arr = [];
//       let temp = "";
//       substring.split("").forEach(char => {
//         if (char !== "b" && char !== "o") temp += char;
//         else {
//           const count = parseInt(temp, 10) || 1;
//           for (let i = 0; i < count; i++) {
//             if (char === "b") arr.push(0);
//             if (char === "o") arr.push(1);
//           }
//           temp = "";
//         }
//       });
//       return arr;
//     });

//   return { array, ...patternData };
// };

// /**
//  * @returns {string}
//  */
// export const generatePatternList = () => `
//   <div class="list-group">
//     ${Object.entries(categories)
//       .map(
//         ([category, contents], index) =>
//           `<a class="list-group-item list-group-item-action collapse-link"
//             data-toggle="collapse"
//             href="#category${index}">
//             ${category}
//           </a>
//           <div id="category${index}" class="collapse">
//             ${contents
//               .map(
//                 id =>
//                   `<a href="#"
//                     class="pattern-name list-group-item list-group-item-action"
//                     data-dismiss="modal"
//                     data-pattern="${id}"
//                   >
//                     ${patternMap.get(id).name}
//                   </a>`
//               )
//               .join("")}
//           </div>
//             `
//       )
//       .join("")}
//   </div>
// `;
