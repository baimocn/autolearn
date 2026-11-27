// _u4g588_exec.mjs — 单节点执行(u4): healthy → 展开 u4g588 折叠块 → 慢滚 → finishNode 监听 → 截图 + DOM 证据
import { connect } from "./utlib.mjs";
import { READER, COURSE, CH } from "./reader.mjs";
import fs from "node:fs";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log("[u4g588]", ...a);
process.on("uncaughtException", (e) => log("uncaught:", String(e).slice(0, 120)));
const ID = "a1aqrW9zHe9iLhYd"; // u4g588 externalNodeId
const SHOT = "shots/U4-u4g588.png";
const U = 4;
const E = JSON.stringify(ID); // 浏览器侧用 const id=E; 取元素
const getTabs = async () => (await fetch("http://127.0.0.1:9222/json/list")).json();
let target = null;
for (const t of (await getTabs()).filter(t => t.type === "page" && /ucontent\.unipus\.cn/.test(t.url))) {
  const L0 = await connect(t.id);
  const fl = await L0.frames();
  const tb0 = fl.find(f => /textbook\/book/.test(f.url) && f.ctx);
  const ch = tb0 ? (tb0.url.match(/chapter\/([0-9a-f-]+)/) || [])[1] : "";
  L0.cdp.close();
  if (ch === CH[U]) { target = t.id; break; }
}
if (!target) { log("NO U4 READER"); process.exit(2); }
log("reader:", target);
const L = await connect(target);
const { ev, frames, cdp, sessionId } = L;
const fl0 = await frames();
const tb = fl0.find(f => /textbook\/book/.test(f.url) && f.ctx && f.url.includes(CH[U].slice(0, 12)));
if (!tb) { log("NO TB"); cdp.close(); process.exit(2); }
const raw = (e) => ev(e, tb.ctx);
const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId).catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
};
const net = [];
await cdp.send("Network.enable", {}, sessionId).catch(() => {});
cdp.on("Network.requestWillBeSent", (p) => {
  const u = (p.request && p.request.url) || "";
  if (/finishNode|course_progress|studyRecord/i.test(u)) net.push({ url: u.slice(-110), post: (p.request.postData || "").slice(0, 400) });
});
const Q = (body) => `(()=>{const id=${E};${body}})()`;
// —— ① healthy 探针：chapter 匹配 + (非空题块>0 或 目标折叠块静态内容存在) ——
let healthy = false, probeLast = {};
for (let k = 0; k < 20 && !healthy; k++) {
  probeLast = await raw(Q(`const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
    const e=document.getElementById(id);
    return {blocks:bs.length,nonempty:bs.filter(b=>(b.innerText||'').replace(/\\s+/g,'').length>5).length,
      targetLen:e?(e.textContent||'').length:0,hasFormGroups:e?/Form groups of four or five/.test(e.textContent||''):false};`)).catch(() => ({}));
  const chapterOK = tb.url.includes(CH[U]);
  log(`probe#${k}: ${JSON.stringify(probeLast)} chapterOK=${chapterOK}`);
  if (chapterOK && ((probeLast.nonempty || 0) > 0 || (probeLast.targetLen || 0) > 50)) { healthy = true; log("HEALTHY ✓"); break; }
  await sleep(2500);
}
if (!healthy) { log("NOT HEALTHY，终止"); cdp.close(); process.exit(3); }
// 点掉弹窗
const dismiss = async () => {
  for (const f of await frames()) {
    if (!/pc\.html|textbook/.test(f.url)) continue;
    const q = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(我知道了|知道了)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, f.ctx).catch(() => null);
    if (q) { await mouse(q.x, q.y); log("点掉规则弹窗"); await sleep(1200); }
  }
};
await dismiss();
// —— ② 目录点击 "Step-by-step guide"（u4g587）——
const vp = await raw(`(()=>{
  const es=[...document.querySelectorAll('[class*=i-tree-menu_title-flex]')];
  // innerText 里字母 s 被字体吞掉（Step-by- tep guide），用模糊匹配；取第 1 个 = Unit4
  const norm=s=>(s||'').replace(/\\s+/g,' ').trim();
  const e=es.filter(x=>/^Step-by-/.test(norm(x.innerText))&&/guide/i.test(norm(x.innerText)))[0];
  if(!e)return null;e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();
  return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),matched:norm(e.innerText).slice(0,40)};})()`).catch(() => null);
if (vp) { await mouse(vp.x, vp.y); log("目录点击 Step-by-step guide @", JSON.stringify(vp)); await sleep(4000); await dismiss(); }
// —— ③ 深路由完整链 u4/u4g586/u4g587/u4g588 ——
await cdp.send("Page.enable", {}, sessionId).catch(() => {});
await cdp.send("Page.navigate", { url: `${READER}#/${COURSE}/courseware/u4/u4g586/u4g587/u4g588` }, sessionId).catch(() => {});
log("深路由: u4/u4g586/u4g587/u4g588");
await sleep(8000);
await dismiss();
let tb2 = null;
for (let k = 0; k < 20 && !tb2; k++) {
  tb2 = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx && f.url.includes(CH[U].slice(0, 12)));
  if (!tb2) await sleep(1000);
}
const raw2 = tb2 ? (e) => ev(e, tb2.ctx) : raw;
// —— ④ 展开 u4g588 折叠块（如有 hidden）并定位 ——
const ensureOpen = async (tag) => {
  const p = await raw2(Q(`const e=document.getElementById(id);
    if(!e)return {err:'no element'};
    e.scrollIntoView({block:'center'});
    const head=e.querySelector('[class*=collapsible-head]');
    const body=e.querySelector('[class*=collapsible-content]');
    const r=(head||e).getBoundingClientRect();
    return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),
      hidden:body?body.hasAttribute('hidden'):null,textLen:body?(body.textContent||'').length:0};`)).catch(() => ({}));
  if (p.hidden) {
    await sleep(800);
    await mouse(p.x, p.y);
    log(`${tag}: 点击 summary 展开 @`, p.x, p.y);
    await sleep(2000);
  }
  const st = await raw2(Q(`const e=document.getElementById(id);const b=e?e.querySelector('[class*=collapsible-content]'):null;
    return {hidden:b?b.hasAttribute('hidden'):null,innerLen:b?(b.innerText||'').length:0,
      hasStep1:b?/Step 1 Select a village/.test(b.innerText||''):false};`)).catch(() => ({}));
  log(`${tag} 状态:`, JSON.stringify(st));
  return st;
};
await ensureOpen("展开①");
const loc = await raw2(Q(`const e=document.getElementById(id);
  if(!e)return {err:'no elem'};
  const cols=[...document.querySelectorAll('[data-lexical-node-type=collapsible-block]')].filter(c=>c.contains(e));
  e.scrollIntoView({block:'center'});
  const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;
  return {tag:e.tagName,textLen:(e.textContent||'').length,head:(e.textContent||'').replace(/\\s+/g,' ').slice(0,140),
    collapsedHidden:cols.map(c=>{const bd=c.querySelector('[class*=collapsible-content]');return bd?bd.hasAttribute('hidden'):null;}),
    scTop:Math.round(sc.scrollTop),scH:Math.round(sc.scrollHeight),
    bodyHasText:/Form groups of four or five/.test(document.body.innerText)};`)).catch(e => ({ err: String(e).slice(0, 120) }));
log("目标折叠块:", JSON.stringify(loc));
await sleep(1500);
// —— ⑤ 慢滚（以目标块为中心往返）——
const SCREENS = Number(process.env.SCREENS || 14);
const STEP_MS = Number(process.env.STEP_MS || 2600);
for (let s = 0; s < SCREENS; s++) {
  const dir = s % 2 === 0 ? 1 : -1;
  await raw2(Q(`const e=document.getElementById(id);if(e)e.scrollIntoView({block:'center'});
    const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollBy(0,${dir}*Math.round(innerHeight*0.45));return 1;`)).catch(() => 0);
  await sleep(STEP_MS);
  if (s % 4 === 3) {
    await raw2(Q(`const e=document.getElementById(id);if(e)e.scrollIntoView({block:'center'});return 1;`)).catch(() => 0);
    await sleep(900);
    await ensureOpen("慢滚中保持展开");
    log(`  滚 ${s + 1}/${SCREENS} 屏, 相关上报=${net.length}`);
  }
}
log("慢滚完成，相关上报:", net.length, JSON.stringify(net).slice(0, 1400));
// —— ⑥ DOM 证据 ——
await raw2(Q(`const e=document.getElementById(id);if(e)e.scrollIntoView({block:'center'});return 1;`)).catch(() => 0);
await sleep(1000);
await ensureOpen("截图前确认展开");
const dom = await raw2(Q(`const e=document.getElementById(id);const body=document.body.innerText||'';
  const t=e?(e.textContent||''):'';
  return {nodeId:${E},exists:!!e,tag:e?e.tagName:null,
    textLen:t.length,text:t.replace(/\\s+/g,' ').slice(0,260),
    hasFormGroups:/Form groups of four or five/.test(t),
    head:(e?(e.textContent||''):'').replace(/\\s+/g,' ').slice(0,80),
    bodyHasStep:/Step-by-step guide/.test(body),bodyTail:body.replace(/\\s+/g,' ').slice(-180)};`)).catch(e => ({ err: String(e).slice(0, 150) }));
log("DOM 证据:", JSON.stringify(dom, null, 1).slice(0, 1200));
// —— ⑦ 截图 ——
fs.mkdirSync("shots", { recursive: true });
const shot = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId).catch(() => ({ data: null }));
if (shot.data) { fs.writeFileSync(SHOT, Buffer.from(shot.data, "base64")); log("截图已存:", SHOT, fs.statSync(SHOT).size, "bytes"); }
else log("截图失败");
fs.writeFileSync("_u4g588-exec.json", JSON.stringify({ healthy, probeLast, vp, loc, net, dom, shot: SHOT }, null, 1));
cdp.close();
