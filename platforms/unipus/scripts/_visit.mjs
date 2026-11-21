// _visit.mjs [start] [count] — 单标签逐个访问剩余节点完整路由链，慢滚触发 finishNode
import { CDP, sleep } from "./cdp.mjs";
import { connect } from "./utlib.mjs";
import { READER, COURSE } from "./reader.mjs";
import fs from "node:fs";
const START = Number(process.argv[2] || 0);
const COUNT = Number(process.argv[3] || 10);
const SCREENS = Number(process.env.SCREENS || 10);
const STEP_MS = Number(process.env.STEP_MS || 1300);
const log = (...a) => console.log("[visit]", ...a);
process.on("uncaughtException", (e) => log("uncaught:", String(e).slice(0, 100)));

const pend = JSON.parse(fs.readFileSync("_pending.json", "utf8"));
const chains = JSON.parse(fs.readFileSync("leafchains.json", "utf8"));
const routeOf = (u, id) => {
  const c = chains.find(x => x[0] === "u" + u && x.some(y => String(y).startsWith(id)));
  return c ? c.join("/") : `u${u}/${id}`;
};
const getTabs = async () => (await fetch("http://127.0.0.1:9222/json/list")).json();
const ver = await (await fetch("http://127.0.0.1:9222/json/version")).json();
let rd = (await getTabs()).find(t => /ucontent\.unipus\.cn/.test(t.url));
if (!rd) {
  const b = await CDP.connect(ver.webSocketDebuggerUrl);
  const r = await b.send("Target.createTarget", { url: `${READER}#/${COURSE}/courseware/${routeOf(pend[START].u, pend[START].id)}` });
  b.close();
  await sleep(14000);
  rd = { id: r.targetId };
}
const L = await connect(rd.id);
const { ev, frames, cdp, sessionId } = L;
const fin = [];
await cdp.send("Network.enable", {}, sessionId).catch(() => {});
cdp.on("Network.requestWillBeSent", (p) => {
  if (/finishNode/.test((p.request && p.request.url) || "")) fin.push(Date.now());
});
const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId).catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId).catch(() => {});
};
const clean = async () => {
  // 关抽屉 + 点掉晚到的"本单元学习规则"
  for (const f of await frames()) {
    await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const b=[...document.querySelectorAll('button,div,span,a')].find(e=>/^(我知道了|知道了)$/.test(n(e.innerText)));if(b){b.click();}const c=document.querySelector('[class*=catalog_drawer-close]');if(c&&c.getBoundingClientRect().width>3){c.click();}return 1;})()`, f.ctx).catch(() => {});
  }
};
const results = [];
const end = Math.min(pend.length, START + COUNT);
for (let i = START; i < end; i++) {
  const p = pend[i];
  const route = routeOf(p.u, p.id);
  try {
    const before = fin.length;
    await cdp.send("Page.enable", {}, sessionId).catch(() => {});
    await cdp.send("Page.navigate", { url: `${READER}#/${COURSE}/courseware/${route}` }, sessionId);
    await sleep(7000);
    await clean();
    // 等 tb 帧出现
    let tb = null;
    for (let k = 0; k < 20 && !tb; k++) {
      tb = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx);
      if (!tb) await sleep(1000);
    }
    if (!tb) { log(`[${i}] ${route} NO_TB`); results.push({ i, route, r: "NO_TB" }); continue; }
    await sleep(2000);
    await clean();
    for (let s = 0; s < SCREENS; s++) {
      await ev(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollBy(0,Math.round(innerHeight*0.85));return 1;})()`, tb.ctx).catch(() => {});
      await sleep(STEP_MS);
    }
    await clean();
    const got = fin.length - before;
    results.push({ i, route, fin: got });
    log(`[${i + 1}/${pend.length}] ${route} fin=${got} total=${fin.length}`);
  } catch (e) {
    log(`[${i}] ${route} ERR ${String(e).slice(0, 60)}`);
    results.push({ i, route, err: String(e).slice(0, 60) });
  }
  fs.writeFileSync("_visit-state.json", JSON.stringify(results, null, 1));
  await sleep(1200);
}
log(`批次完成 ${START}..${end - 1}: 有上报 ${results.filter(r => (r.fin || 0) > 0).length}/${results.length}，累计 ${fin.length}`);
fs.writeFileSync(`_visit-${START}.json`, JSON.stringify(results, null, 1));
cdp.close();
