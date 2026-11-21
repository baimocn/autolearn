// batch2.mjs — 单标签导航版：一个 reader 标签走完全部待完成节点
import { CDP, sleep } from "./cdp.mjs";
import { connect } from "./utlib.mjs";
import { READER, COURSE } from "./reader.mjs";
import fs from "node:fs";
const log = (...a) => console.log("[b2]", ...a);
process.on("uncaughtException", (e) => log("uncaught:", String(e).slice(0, 100)));

const pending = JSON.parse(fs.readFileSync("_pending-retry.json", "utf8"));
const chains = JSON.parse(fs.readFileSync("leafchains.json", "utf8"));
const routeOf = (u, id) => {
  const ch = chains.find(c => c[0] === "u" + u && c.some(x => String(x).startsWith(id)));
  return ch ? ch.join("/") : `u${u}/${id}`;
};
log("待访问:", pending.length);

const getVer = async () => (await fetch("http://127.0.0.1:9222/json/version")).json();
const getTabs = async () => (await fetch("http://127.0.0.1:9222/json/list")).json();

// 开一个标签
const b0 = await CDP.connect((await getVer()).webSocketDebuggerUrl);
for (const t of (await getTabs()).filter(t => /ucontent\.unipus\.cn/.test(t.url))) await b0.send("Target.closeTarget", { targetId: t.id }).catch(() => {});
await sleep(700);
const first = pending[0];
const r = await b0.send("Target.createTarget", { url: `${READER}#/${COURSE}/courseware/${routeOf(first.u, first.id)}` });
b0.close();
await sleep(16000);

let L = null, cdp = null, sessionId = null, ev = null, frames = null;
const attach = async () => {
  const tabs = await getTabs();
  const info = tabs.find(t => t.id === r.targetId) || tabs.find(t => /ucontent/.test(t.url));
  if (!info) return false;
  try { if (L) L.cdp.close(); } catch {}
  L = await connect(info.id);
  cdp = L.cdp; sessionId = L.sessionId;
  ev = async (e, ctx) => {
    const rr = await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true, contextId: ctx }, sessionId).catch(() => null);
    return rr && rr.result ? rr.result.value : null;
  };
  frames = () => L.frames();
  return true;
};
await attach();

const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId).catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
};
const dismissPopups = async () => {
  await mouse(629, 477); await sleep(900);
  await mouse(629, 512); await sleep(700);
  await mouse(1243, 101); await sleep(600);
};
const findTb = async (tries = 25) => {
  for (let k = 0; k < tries; k++) {
    const tb = (await frames()).find(f => f.url.includes("textbook/book") && f.ctx);
    if (tb) {
      const n = await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`, tb.ctx).catch(() => 0);
      if (n > 0) return tb;
    }
    await sleep(1000);
  }
  return null;
};
const gotoNode = async (route) => {
  await cdp.send("Page.enable", {}, sessionId).catch(() => {});
  await cdp.send("Page.navigate", { url: `${READER}#/${COURSE}/courseware/${route}` }, sessionId).catch(() => {});
  await sleep(16000);
  await dismissPopups();
  return await findTb(20);
};

let results = [];
let idx = 0;
for (const p of pending) {
  idx++;
  try {
    const route = routeOf(p.u, p.id);
    // 首节点已在当前页，其余导航
    if (idx > 1) {
      const tb = await gotoNode(route);
      if (!tb) { log(`[${idx}] ${p.u}/${p.id} 导航失败`); results.push({ node: p.u + "/" + p.id, r: "nonav" }); continue; }
    }
    const tb = (await frames()).find(f => f.url.includes("textbook/book") && f.ctx);
    if (!tb) { log(`[${idx}] no tb`); results.push({ node: p.u + "/" + p.id, r: "notb" }); continue; }
    const fin = [];
    await cdp.send("Network.enable", {}, sessionId).catch(() => {});
    cdp.on("Network.requestWillBeSent", (p2) => { if (/finishNode/.test(p2.request && p2.request.url || "")) fin.push(1); });
    await sleep(2500);
    for (let s = 0; s < 14; s++) {
      await ev(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollBy(0,Math.round(window.innerHeight*0.92));return 1;})()`, tb.ctx).catch(() => {});
      await sleep(2200);
    }
    results.push({ node: p.u + "/" + p.id, fin: fin.length });
    log(`[${idx}/${pending.length}] ${p.u}/${p.id} fin=${fin.length}`);
    if (idx % 10 === 0) fs.writeFileSync("b2-state.json", JSON.stringify(results, null, 1));
  } catch (e) {
    log(`[${idx}] 异常`, String(e).slice(0, 80));
    results.push({ node: p.u + "/" + p.id, err: String(e).slice(0, 60) });
    await attach().catch(() => {});
  }
  await sleep(3000);
}
fs.writeFileSync("b2-done.json", JSON.stringify(results, null, 1));
log("完成:", results.filter(r => (r.fin || 0) > 0).length, "/", results.length);
