// batch-nodes.mjs [typeFilter] — 按完整路由链逐个访问待完成节点，触发 finishNode
import { CDP, sleep } from "./cdp.mjs";
import { connect } from "./utlib.mjs";
import { READER, COURSE } from "./reader.mjs";
import fs from "node:fs";
const FILTER = process.argv[2] || "text"; // text | task | all
const SCREENS = Number(process.env.SCREENS || 14);
const STEP_MS = Number(process.env.STEP_MS || 2200);
const log = (...a) => console.log("[bn]", ...a);
process.on("uncaughtException", (e) => log("uncaught:", String(e).slice(0, 100)));

const pending = JSON.parse(fs.readFileSync("_pending.json", "utf8")).filter(x => FILTER === "all" || x.tab === FILTER);
const chains = JSON.parse(fs.readFileSync("leafchains.json", "utf8"));
const routeOf = (u, id) => {
  const ch = chains.find(c => c[0] === "u" + u && c.some(x => String(x).startsWith(id)));
  return ch ? ch.join("/") : `u${U}/${id}`;
};
log("待访问节点:", pending.length);

const getVer = async () => (await fetch("http://127.0.0.1:9222/json/version")).json();
const getTabs = async () => (await fetch("http://127.0.0.1:9222/json/list")).json();
let results = [];
let idx = 0;
const START = Number(process.env.START_IDX || 0);
for (const p of pending) {
  idx++;
  if (idx <= START) continue;
  try {
    const route = routeOf(p.u, p.id);
    const boot = await CDP.connect((await getVer()).webSocketDebuggerUrl);
    for (const t of (await getTabs()).filter(t => /ucontent\.unipus\.cn/.test(t.url))) await boot.send("Target.closeTarget", { targetId: t.id }).catch(() => {});
    await sleep(600);
    const r = await boot.send("Target.createTarget", { url: `${READER}#/${COURSE}/courseware/${route}` });
    boot.close();
    await sleep(14000);
    const L = await connect(r.targetId);
    const { ev, frames, cdp, sessionId } = L;
    let tb = null;
    for (let k = 0; k < 25 && !tb; k++) {
      tb = (await frames()).find(f => f.url.includes("textbook/book") && f.ctx);
      if (tb) { const n = await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`, tb.ctx).catch(() => 0); if (n > 0) break; }
      await sleep(1000);
    }
    const fin = [];
    await cdp.send("Network.enable", {}, sessionId).catch(() => {});
    cdp.on("Network.requestWillBeSent", (p2) => { if (/finishNode/.test(p2.request && p2.request.url || "")) fin.push(1); });
    await sleep(2000);
    for (let s = 0; s < SCREENS; s++) {
      await ev(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollBy(0,Math.round(window.innerHeight*0.92));return 1;})()`, tb ? tb.ctx : undefined).catch(() => {});
      await sleep(STEP_MS);
    }
    results.push({ node: p.u + "/" + p.id, fin: fin.length });
    log(`[${idx}/${pending.length}] ${p.u}/${p.id} fin=${fin.length}`);
    try { L.cdp.close(); } catch {}
    const b2 = await CDP.connect((await getVer()).webSocketDebuggerUrl);
    await b2.send("Target.closeTarget", { targetId: r.targetId }).catch(() => {});
    b2.close();
    await sleep(1200);
  } catch (e) {
    log(`[${idx}] ${p.u}/${p.id} 异常`, String(e).slice(0, 80));
    results.push({ node: p.u + "/" + p.id, err: String(e).slice(0, 60) });
  }
  if (idx % 10 === 0) fs.writeFileSync("batch-nodes-state.json", JSON.stringify(results, null, 1));
}
fs.writeFileSync("batch-nodes-done.json", JSON.stringify(results, null, 1));
log("全部完成:", results.filter(r => (r.fin || 0) > 0).length, "个节点有上报");
