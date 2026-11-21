// _u4g813_ut.mjs — Unit test 4 完整流程：healthy(卡片) → 点卡片 → 开始答题 → 答满 → 提交 → 确认 → 查看测试结果 → 截图 + DOM 证据
import { connect } from "./utlib.mjs";
import { CH } from "./reader.mjs";
import fs from "node:fs";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log("[u4g813]", ...a);
process.on("uncaughtException", (e) => log("uncaught:", String(e).slice(0, 120)));
const CARD = "TYL6NCP0OCeQBcPc"; // UT.png 卡片 = Unit test 4 (u4g813)
const PAPER = "kijiH3hfSGpWXCZt"; // u4g813 externalNodeId = paper id
const SHOT = "shots/U4-u4g813.png";
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
  if (/paper|submit|score|progress|answer|instance|result/i.test(u)) net.push({ url: u.slice(-120), post: (p.request.postData || "").slice(0, 400) });
});
// —— ① healthy 探针：chapter 匹配 + UT 卡片存在（u4 题块可能空壳，卡片是静态 decorator）——
let healthy = false, probeLast = {};
for (let k = 0; k < 15 && !healthy; k++) {
  probeLast = await raw(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
    const c=document.getElementById(${JSON.stringify(CARD)});
    return {blocks:bs.length,nonempty:bs.filter(b=>(b.innerText||'').replace(/\\s+/g,'').length>5).length,
      cardExists:!!c,cardStatus:c?c.getAttribute('data-lexical-node-status'):null};})()`).catch(() => ({}));
  const chapterOK = tb.url.includes(CH[U]);
  log(`probe#${k}: ${JSON.stringify(probeLast)} chapterOK=${chapterOK}`);
  if (chapterOK && probeLast.cardExists) { healthy = true; log("HEALTHY ✓"); break; }
  await sleep(2000);
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
// —— ② 点 UT 卡片 coverContainer（先 scrollIntoView 再取坐标）——
const cardClick = async () => {
  const p = await raw(`(()=>{const c=document.getElementById(${JSON.stringify(CARD)});
    if(!c)return {err:'no card'};
    c.scrollIntoView({block:'center'});
    const cc=c.querySelector('[class*=coverContainer]')||c;
    const b=cc.getBoundingClientRect();
    return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),
      status:c.getAttribute('data-lexical-node-status')};})()`).catch(e => ({ err: String(e).slice(0, 120) }));
  log("UT 卡片:", JSON.stringify(p));
  if (p && p.x) { await sleep(800); await mouse(p.x, p.y); log("点击卡片 @", p.x, p.y); }
  return p;
};
await cardClick();
await sleep(4000);
await dismiss();
// —— ③ 等「考前须知」→ 点「开始答题」（跨 frame）——
let started = false;
for (let k = 0; k < 10 && !started; k++) {
  for (const f of await frames()) {
    const r = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');
      const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(开始答题|再次作答)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>20);
      if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();
      return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),t:n(e.innerText),
        frame:/textbook/.test(f.url)?'tb':'pc'};})()`, f.ctx).catch(() => null);
    if (r) {
      const oy = r.frame === 'tb' ? 0 : 0;
      log("按钮:", JSON.stringify(r));
      await mouse(r.x, r.y);
      started = true;
      await sleep(5000);
      break;
    }
  }
  if (!started) { await sleep(2000); await dismiss(); }
}
log("started =", started);
// —— ④ 等 exam 帧 ——
let exam = null;
for (let k = 0; k < 25 && !exam; k++) {
  exam = (await frames()).find(f => /testing\/(diagnosis|challenge)\/book/.test(f.url) && f.ctx && f.url.includes(PAPER));
  if (!exam) await sleep(1200);
}
log("exam 帧:", exam ? exam.url.slice(-95) : "无");
if (!exam) { log("无 exam 帧，终止"); cdp.close(); process.exit(4); }
const exEv = (e) => ev(e, exam.ctx);
// 等题目加载
let nq = 0;
for (let k = 0; k < 20; k++) {
  nq = await exEv(`document.querySelectorAll('[class*=answer-question-box_questionItem]').length`).catch(() => 0);
  if (nq >= 10) break;
  await sleep(1200);
}
log("questions:", nq);
// 偏移链
const offA = await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));if(!f)return{ox:0,oy:0};const r=f.getBoundingClientRect();return{ox:Math.round(r.left),oy:Math.round(r.top)};})()`).catch(() => ({ ox: 0, oy: 0 }));
const offB = await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/testing|exam/.test(e.src||''));if(!f)return{ox:0,oy:0};const r=f.getBoundingClientRect();return{ox:Math.round(r.left),oy:Math.round(r.top)};})()`, tb.ctx).catch(() => ({ ox: 0, oy: 0 }));
const OX = (offA.ox || 0) + (offB.ox || 0), OY = (offA.oy || 0) + (offB.oy || 0);
log("偏移 OX,OY =", OX, OY);
// 点掉顶层「我知道了」
const ack = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n(e.innerText)==='我知道了'&&e.getBoundingClientRect().width>15);if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`).catch(() => null);
if (ack) { await mouse(ack.x, ack.y); log("点掉我知道了"); await sleep(1500); }
// —— ⑤ 答满 ——
const answered = await exEv(`(()=>{
  const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];
  let picked=0, filled=0;
  items.forEach(q=>{
    const rows=[...q.querySelectorAll('[class*=chioceView_strongListView]')];
    if(rows.length){ rows[0].click(); picked++; return; }
    const tfs=[...q.querySelectorAll('[class*=answer_optionTF]')];
    if(tfs.length){ tfs[0].click(); picked++; return; }
    const els=[...q.querySelectorAll('input[type=text],textarea')];
    els.forEach(el=>{
      const proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto,'value').set.call(el,'The answer is agriculture and sustainable development.');
      el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));
      filled++;
    });
  });
  return {total:items.length,picked,filled};})()`).catch(e => ({ err: String(e).slice(0, 120) }));
log("作答:", JSON.stringify(answered));
await sleep(1500);
// —— ⑥ 提交（外层 i-button_default_container，exam 帧坐标 + 偏移）——
let submitted = false;
for (let k = 0; k < 5 && !submitted; k++) {
  const sb = await exEv(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');
    const v=[...document.querySelectorAll('[class*=i-button_default-container],button')].filter(e=>n(e.innerText)==='提交'&&e.getBoundingClientRect().width>40&&e.getBoundingClientRect().height>15);
    if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();
    return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),w:Math.round(b.width)};})()`).catch(() => null);
  if (!sb) { await exEv(`(()=>{const se=document.scrollingElement;se.scrollBy(0,400);return 1;})()`).catch(() => {}); await sleep(800); continue; }
  log("提交按钮:", JSON.stringify(sb), "=> 页面:", sb.x + OX, sb.y + OY);
  await mouse(sb.x + OX, sb.y + OY);
  submitted = true;
  await sleep(3000);
}
log("submitted =", submitted);
// —— ⑦ 确认弹窗（textbook 帧 ant-modal-confirm）——
for (let k = 0; k < 6; k++) {
  let hit = false;
  for (const f of await frames()) {
    if (!f.ctx) continue;
    const oy = /testing/.test(f.url) ? OY : (/textbook/.test(f.url) ? (offA.oy || 0) : 0);
    const r = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');
      const root=[...document.querySelectorAll('[class*=ant-modal-confirm],[class*=modal],[role=dialog]')].find(e=>e.getBoundingClientRect().height>60&&/提交|交卷|确定|确认/.test(e.innerText||''));
      const v=(root?[...root.querySelectorAll('button,[class*=i-button],span,div')]:[...document.querySelectorAll('button,[class*=i-button],span,div')]).filter(e=>/^(确定|确认|继续提交)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);
      if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();
      return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2+${oy}),t:n(e.innerText),dlg:(root?root.innerText:'').replace(/\\s+/g,' ').slice(0,90)};})()`, f.ctx).catch(() => null);
    if (r) { log("确认:", JSON.stringify(r)); await mouse(r.x, r.y); hit = true; await sleep(2000); break; }
  }
  if (!hit) break;
}
await sleep(8000);
// —— ⑧ 查看测试结果（exam 帧） ——
const viewBtn = await exEv(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');
  const v=[...document.querySelectorAll('button,[class*=i-button],div,span')].filter(e=>n(e.innerText)==='查看测试结果'&&e.getBoundingClientRect().width>20);
  if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();
  return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`).catch(() => null);
if (viewBtn) { log("查看测试结果:", JSON.stringify(viewBtn)); await mouse(viewBtn.x + OX, viewBtn.y + OY); await sleep(5000); }
// —— ⑨ 读成绩 ——
let score = null, resultText = "";
for (let k = 0; k < 8 && !resultText; k++) {
  for (const f of await frames()) {
    if (!f.ctx) continue;
    const t = String(await ev(`document.body.innerText`, f.ctx).catch(() => "") || "");
    if (/最终得分|正确率|测试满分/.test(t)) {
      resultText = t.replace(/\s+/g, " ");
      const m = resultText.match(/最终得分是\s*([\d.]+)\s*分/);
      if (m) score = m[1];
      break;
    }
  }
  if (!resultText) await sleep(2000);
}
log("成绩文本(前 300):", resultText.slice(0, 300) || "未出现");
log("解析得分:", score);
log("相关网络:", net.length, JSON.stringify(net.slice(0, 10)).slice(0, 1800));
// —— ⑩ DOM 证据 ——
let dom = {};
try {
  dom = await exEv(`(()=>{const t=(document.body.innerText||'').replace(/\\s+/g,' ');
    return {examUrl:location.href.slice(-95),textLen:t.length,head:t.slice(0,240),
      hasScore:/最终得分|正确率|测试满分/.test(t),
      scoreSnippet:(t.match(/测试满分[^。]{0,100}/)||[''])[0],
      questions:document.querySelectorAll('[class*=answer-question-box_questionItem]').length};})()`);
} catch (e) { dom = { err: String(e).slice(0, 120) }; }
log("DOM 证据:", JSON.stringify(dom, null, 1).slice(0, 1000));
// —— ⑪ 截图 ——
fs.mkdirSync("shots", { recursive: true });
const shot = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId).catch(() => ({ data: null }));
if (shot.data) { fs.writeFileSync(SHOT, Buffer.from(shot.data, "base64")); log("截图已存:", SHOT, fs.statSync(SHOT).size, "bytes"); }
else log("截图失败");
fs.writeFileSync("_u4g813-ut.json", JSON.stringify({ healthy, probeLast, answered, submitted, score, resultText: resultText.slice(0, 700), net, dom, shot: SHOT }, null, 1));
cdp.close();
