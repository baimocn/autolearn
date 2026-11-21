// _u4g560_wait.mjs — 只读等待：轮询直到 healthy（非空题块>0 且 chapterId 匹配）或超时
import { connect } from "./utlib.mjs";
import { CH } from "./reader.mjs";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log("[wait]", ...a);
process.on("uncaughtException", (e) => log("uncaught:", String(e).slice(0, 160)));
const ID = "oMrcWJawhYiLWVMS";
const U = 4;
const tabs = (await (await fetch("http://127.0.0.1:9222/json/list")).json()).filter(t => t.type === "page" && /ucontent\.unipus\.cn/.test(t.url));
let target = null;
for (const t of tabs) {
  const L0 = await connect(t.id);
  const fl = await L0.frames();
  const tb0 = fl.find(f => /textbook\/book/.test(f.url) && f.ctx);
  const ch = tb0 ? (tb0.url.match(/chapter\/([0-9a-f-]+)/) || [])[1] : "";
  L0.cdp.close();
  if (ch === CH[U]) { target = t.id; break; }
}
if (!target) { log("NO TAB"); process.exit(2); }
const L = await connect(target);
const { ev, frames, cdp } = L;
for (let k = 0; k < 40; k++) {
  const tb = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx && f.url.includes(CH[U].slice(0, 12)));
  if (!tb) { log(`#${k} 无 tb 帧`); await sleep(2500); continue; }
  const st = await ev(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
    const b=document.getElementById(${JSON.stringify(ID)});
    return {blocks:bs.length,nonempty:bs.filter(x=>(x.innerText||'').replace(/\\s+/g,'').length>5).length,
      targetLen:b?(b.innerText||'').length:0,status:b?b.getAttribute('data-lexical-node-status'):null};})()`, tb.ctx).catch(() => ({}));
  log(`#${k}:`, JSON.stringify(st));
  if (tb.url.includes(CH[U]) && (st.nonempty || 0) > 0) { log("HEALTHY ✓ 可继续"); cdp.close(); process.exit(0); }
  await sleep(3000);
}
log("超时仍未 healthy");
cdp.close();
process.exit(1);
