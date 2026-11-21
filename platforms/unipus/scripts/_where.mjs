import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const U = Number(process.argv[2] || 1);
const tid = await ensureReader(U);
const L = await connect(tid);
const fl = await L.frames();
const tbs = fl.filter((f) => f.url.includes("textbook/book"));
for (const f of tbs) {
  const n = await L.ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`, f.ctx).catch(() => "err");
  console.log("FRAME", f.url.slice(70, 150), "blocks=", n);
}
L.cdp.close();
