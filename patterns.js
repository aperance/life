export const rleToArray = rle =>
  rle
    .split("!")[0]
    .split("$")
    .map(substring => {
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

export const patterns = {
  glider: "bob$2bo$3o!",
  acorn: "bo5b$3bo3b$2o2b3o!",
  lightweightSpaceship: "bo2bo$o4b$o3bo$4o!",
  gosperGliderGun:
    "24bo11b$22bobo11b$12b2o6b2o12b2o$11bo3bo4b2o12b2o$2o8bo5bo3b2o14b$2o8bo3bob2o4bobo11b$10bo5bo7bo11b$11bo3bo20b$12b2o!",
  timeBomb: "bo11b2o$obo4bo6bo$7bo4bo2b$2bo2bo3bo2bo2b$2b2o6bo4b$3bo!",
  max:
    "18bo8b$17b3o7b$12b3o4b2o6b$11bo2b3o2bob2o4b$10bo3bobo2bobo5b$10bo4bobobobob2o2b$12bo4bobo3b2o2b$4o5bobo4bo3bob3o2b$o3b2obob3ob2o9b2ob$o5b2o5bo13b$bo2b2obo2bo2bob2o10b$7bobobobobobo5b4o$bo2b2obo2bo2bo2b2obob2o3bo$o5b2o3bobobo3b2o5bo$o3b2obob2o2bo2bo2bob2o2bob$4o5bobobobobobo7b$10b2obo2bo2bob2o2bob$13bo5b2o5bo$b2o9b2ob3obob2o3bo$2b3obo3bo4bobo5b4o$2b2o3bobo4bo12b$2b2obobobobo4bo10b$5bobo2bobo3bo10b$4b2obo2b3o2bo11b$6b2o4b3o12b$7b3o17b$8bo!"
};
