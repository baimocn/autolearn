// _u4g598_wait.mjs — healthy 等待探针：不导航，不点答题；滚动预热让题块挂载；顺便抓 course_progress 响应核验 pass
import { connect } from "./utlib.mjs";
import { CH } from "./reader.mjs";
import fs from "node:fs";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log("[u4g598-wait]", ...a);
process.on("uncaughtException", e => log("uncaught:", String(e).slice(0, 120)));
const ID = "mUDW2AIDlwgTvp2K";
const CH4 = CH[4];

const tabs = (await (await fetch("http://127.0.0.1:9222/json/list")).json())
  .filter(t => t.type === "page" && /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(tabs[0].id);
const { ev, frames, cdp, sessionId } = L;
await cdp.send("Network.enable", {}, sessionId).catch(() => {});
const reqs = new Map();
const progResponses = [];
cdp.on("Network.requestWillBeSent", p => { if (p.request?.url) reqs.set(p.requestId, p.request.url); });
cdp.on("Network.responseReceived", p => {
  const u = reqs.get(p.requestId) || "";
  if (/course_progress/.test(u)) progResponses.push({ id: p.requestId, url: u });
});
// 主动触发一次页面自身请求（滚动会带出 course_progress），不 fetch
const fl = await frames();
const tb = fl.find(f => /textbook\/book/.test(f.url) && f.ctx && f.url.includes(CH4.slice(0, 12)));
if (!tb) { log("NO TB CH4"); cdp.close(); process.exit(2); }
const raw = e => ev(e, tb.ctx);

let best = {};
for (let k = 0; k < 12; k++) {
  // 滚动预热（每轮轻微滚动，触发懒挂载）
  await raw(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollBy(0,${k % 2 ? -1 : 1}*300);return 1;})()`).catch(() => 0);
  await sleep(2500);
  const p = await raw(`(()=>{
    const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
    const nonempty=bs.filter(b=>(b.innerText||'').replace(/\\s+/g,'').length>5).length;
    const e=document.getElementById(${JSON.stringify(ID)});
    const b=e?e.querySelector('[class*=collapsible-content]'):null;
    return {chapterOK:${JSON.stringify(tb.url.includes(CH4))},blocks:bs.length,nonempty,
      bodyLen:(document.body.innerText||'').length,targetExists:!!e,
      hidden:b?b.hasAttribute('hidden'):null,contentLen:b?(b.innerText||'').length:0};})()`).catch(e => ({ err: String(e).slice(0, 120) }));
  best = p;
  log(`probe#${k}:`, JSON.stringify(p));
  if (p.chapterOK && (p.nonempty || 0) > 0) { log("HEALTHY ✓"); break; }
}
log("progResponses captured:", progResponses.length);
// 读取抓到的 course_progress 响应体里的 u4g598.pass
let pass = null, progURL = null;
for (const h of progResponses) {
  const m = h.url.match(/course_progress\/[^/]+\/([^/]+)\//);
  if (m && m[1] !== "u4") continue;
  try {
    const b = await cdp.send("Network.getResponseBody", { requestId: h.id }, sessionId);
    const j = JSON.parse(b.body);
    const leaf = j.rt?.leafs?.[ID] || j.rt?.leafs?.["u4g598"];
    if (leaf) { pass = leaf.state?.pass; progURL = h.url.slice(-90); }
    // 也保存 u4 进度文件供核验
    if (m && m[1] === "u4") fs.writeFileSync("prog-u4-live.json", b.body);
  } catch (e) { log("body err", String(e).slice(0, 80)); }
}
log("u4g598 state.pass (live):", pass, "from", progURL);
fs.writeFileSync("_u4g598-wait.json", JSON.stringify({ best, healthy: best.chapterOK && (best.nonempty || 0) > 0, progResponses: progResponses.map(x => x.url.slice(-90)), pass }, null, 1));
cdp.close();
