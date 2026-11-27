const fs = require("fs");
let s = fs.readFileSync("cha_run.mjs", "utf8");
const before = s;
s = s.replace(/\.split\("\?"\)\[0\]\)/g, ")");
s = s.replace(/\.split\("\?"\)\[0\]/g, "");
if (s === before) { console.log("no change"); } else { console.log("patched"); }
fs.writeFileSync("cha_run.mjs", s);
