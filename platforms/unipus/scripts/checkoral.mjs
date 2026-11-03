// checkoral.mjs <unit> <i,i,i> — 复用阅读器标签，读取指定口语题块的得分
import { connect, sleep } from "./utlib.mjs";
import { ensureReader, openUnit, mountBlock, log } from "./reader.mjs";

const U = Number(process.argv[2]);
const idxs = (process.argv[3] || "").split(",").filter(Boolean).map(Number);
const tid = process.env.TID || (await ensureReader(U));
const L = await connect(tid);
const tb = await openUnit(L, U);
if (!tb) { log("!! 无教材帧"); process.exit(1); }
for (const i of idxs) {
  let t = "";
  for (let k = 0; k < 4; k++) { t = await mountBlock(L, tb, i, 1000); if (/得分|提交/.test(t)) break; }
  const sc = (String(t).match(/得分[:：]\s*(\d+(?:\.\d+)?)/) || [])[1];
  const cm = (String(t).match(/评语[:：]\s*([^]{0,80})/) || [])[1];
  log(`#${i} score=${sc ?? "-"}${cm ? " | 评语:" + cm : ""}`);
}
L.cdp.close();
