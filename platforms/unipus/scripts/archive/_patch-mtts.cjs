const fs = require("fs");
let s = fs.readFileSync("mtts.mjs", "utf8");
s = s.replace(
  'const PROXY = process.env.HTTPS_PROXY || process.env.https_proxy || "http://127.0.0.1:62435";',
  'const PROXY = process.env.TTS_PROXY !== undefined ? process.env.TTS_PROXY : (process.env.HTTPS_PROXY || process.env.https_proxy || "http://127.0.0.1:62435");\nconst PX = PROXY ? (" --proxy " + PROXY + " ") : " ";'
);
s = s.replace("edge-tts --proxy ${PROXY} --voice", "edge-tts ${PX}--voice");
s = s.replace('curl -s -x ${PROXY} --max-time', 'curl -s ${PROXY ? ("-x " + PROXY) : ""} --max-time');
fs.writeFileSync("mtts.mjs", s);
console.log("patched ok");
