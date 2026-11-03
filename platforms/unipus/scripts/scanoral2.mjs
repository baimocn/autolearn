// scanoral2.mjs <unit> — 扫描该单元所有口语/录音题块，导出题面与得分
import { connect, sleep } from "./utlib.mjs";
import { ensureReader, openUnit, mountBlock, log } from "./reader.mjs";
import fs from "node:fs";

const U = Number(process.argv[2] || 1);
const tid = process.env.TID || (await ensureReader(U));
const L = await connect(tid);
log("target:", tid);
const tb = await openUnit(L, U);
if (!tb) { log("!! 无教材帧"); process.exit(1); }
const { ev } = L;

const n = await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`, tb.ctx);
log("块总数:", n);
const out = [];
for (let i = 0; i < n; i++) {
  const meta = await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
    if(!b)return null;
    const g=b.querySelector('[data-ipublish-question-group-type]');
    const t=(b.innerText||'').replace(/\\s+/g,' ').trim();
    return {type:g?g.getAttribute('data-ipublish-question-group-type'):'',len:t.length};})()`, tb.ctx).catch(() => null);
  if (!meta) continue;
  if (!/oral/.test(meta.type || "")) continue;
  let text = "";
  for (let k = 0; k < 3; k++) {
    text = await mountBlock(L, tb, i, 800);
    if (text && text.length > 20) break;
  }
  const sc = (String(text).match(/得分[:：]\s*(\d+(?:\.\d+)?)/) || [])[1];
  out.push({ i, type: meta.type, score: sc ? Number(sc) : null, text: String(text).slice(0, 900) });
  log(`#${i} score=${sc ?? "-"} :: ${String(text).slice(0, 110)}`);
}
fs.writeFileSync(`oral-U${U}.json`, JSON.stringify(out, null, 2));
log("写入 oral-U" + U + ".json", out.length, "条");
L.cdp.close();
