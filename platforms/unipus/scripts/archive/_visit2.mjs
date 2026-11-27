// _visit2.mjs <unit> [startIdx] [count] — 逐节点深路由 + 长等待 + 慢滚，触发 finishNode
import { CDP, sleep } from "./cdp.mjs";
import { connect } from "./utlib.mjs";
import { READER, COURSE, CH } from "./reader.mjs";
import fs from "node:fs";
const U = Number(process.argv[2] || 7);
const START = Number(process.argv[3] || 0);
const COUNT = Number(process.argv[4] || 99);
const log = (...a) => console.log("[v2 u" + U + "]", ...a);
process.on("uncaughtException", e => log("uncaught:", String(e).slice(0, 110)));
const pend = JSON.parse(fs.readFileSync("_pending.json", "utf8")).filter(p => p.u === U && p.base !== "vocabulary-learn-practice");
const chains = JSON.parse(fs.readFileSync("leafchains.json", "utf8"));
const routeOf = (id) => {
  const c = chains.find(x => x[0] === "u" + U && x.some(y => String(y).startsWith(id)));
  return c ? c.join("/") : `u${U}/${id}`;
};
const list = pend.slice(START, START + COUNT);
log("待访问", list.length);
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
if (!rd) { log("NO READER"); process.exit(1); }
const L = await connect(rd.id);
const { ev, frames, cdp, sessionId } = L;
await cdp.send("Network.enable", {}, sessionId).catch(() => {});
let fin = 0;
cdp.on("Network.requestWillBeSent", p => { if (/finishNode/.test((p.request && p.request.url) || "")) fin++; });
const results = [];
for (let i = 0; i < list.length; i++) {
  const p = list[i];
  const route = routeOf(p.id);
  const before = fin;
  try {
    await cdp.send("Page.navigate", { url: `${READER}#/${COURSE}/courseware/${route}` }, sessionId).catch(() => {});
    // 长等待页面加载（关键：之前 7s 太短）
    let tb = null, nonempty = 0;
    for (let k = 0; k < 20; k++) {
      await sleep(2000);
      tb = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx && f.url.includes(CH[U].slice(0, 12)));
      if (tb) {
        nonempty = await ev(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];return bs.filter(b=>(b.innerText||'').replace(/\s+/g,'').length>5).length;})()`, tb.ctx).catch(() => 0);
        if (nonempty > 0) break;
      }
    }
    if (!tb) { results.push({ id: p.id, r: "NO_TB" }); log(`[${i + 1}/${list.length}] ${p.id} NO_TB`); continue; }
    // 展开折叠区
    await ev(`(async()=>{const cols=[...document.querySelectorAll('[class*=collapsible-container]')];for(const c of cols){const body=c.querySelector('[class*=collapsible-content]');if(!body)continue;if(body.getBoundingClientRect().height<20){const h=c.querySelector('[class*=collapsible-head]');if(h){const rk=Object.keys(h).find(k=>k.startsWith('__reactProps'));try{if(rk&&h[rk].onClick)h[rk].onClick({stopPropagation(){},preventDefault(){},target:h,currentTarget:h,nativeEvent:{}});else h.click();}catch(e){h.click();}await new Promise(r=>setTimeout(r,250));}}}return 1;})()`, tb.ctx).catch(() => {});
    // 慢滚 14 屏
    for (let s = 0; s < 14; s++) {
      await ev(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollBy(0,Math.round(innerHeight*0.85));return 1;})()`, tb.ctx).catch(() => {});
      await sleep(1600);
    }
    const got = fin - before;
    results.push({ id: p.id, route, nonempty, fin: got });
    log(`[${i + 1}/${list.length}] ${p.id} nonempty=${nonempty} fin=${got}`);
  } catch (e) {
    results.push({ id: p.id, err: String(e).slice(0, 60) });
    log(`[${i + 1}] ${p.id} ERR ${String(e).slice(0, 60)}`);
  }
  fs.writeFileSync(`_v2-u${U}-state.json`, JSON.stringify(results, null, 1));
  await sleep(1500);
}
log("完成", results.filter(r => (r.fin || 0) > 0).length, "/", results.length, "有上报");
fs.writeFileSync(`_v2-u${U}.json`, JSON.stringify(results, null, 1));
cdp.close();
