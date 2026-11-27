// _u1g104_submit.mjs — Unit test 1 完整作答：healthy → 答满26题 → 提交 → 确认 → 读成绩 → 截图 + DOM证据
import { connect } from "./utlib.mjs";
import { CH } from "./reader.mjs";
import fs from "node:fs";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log("[u1g104-sub]", ...a);
process.on("uncaughtException", (e) => log("uncaught:", String(e).slice(0, 120)));

const SHOT = "shots/U1-u1g104.png";
const tabs = (await (await fetch("http://127.0.0.1:9222/json/list")).json()).filter(t => t.type === "page" && /ucontent\.unipus\.cn/.test(t.url));
let target = null;
for (const t of tabs) {
  const L0 = await connect(t.id);
  const fl = await L0.frames();
  if (fl.some(f => /testing\/diagnosis/.test(f.url) && f.ctx)) { target = t.id; L0.cdp.close(); break; }
  L0.cdp.close();
}
if (!target) { log("无 exam 标签，需先点开始答题"); process.exit(2); }
const L = await connect(target);
const { ev, frames, cdp, sessionId } = L;
const fl0 = await frames();
const exam0 = fl0.find(f => /testing\/diagnosis/.test(f.url) && f.ctx);
const tb0 = fl0.find(f => /textbook\/book/.test(f.url) && f.ctx);
const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId).catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
};
const exEv = (e) => ev(e, exam0.ctx);

// 网络监听（提交/成绩/course_progress）
const net = [];
await cdp.send("Network.enable", {}, sessionId).catch(() => {});
cdp.on("Network.requestWillBeSent", (p) => {
  const u = (p.request && p.request.url) || "";
  if (/paper|submit|score|progress|answer|instance|result/i.test(u)) net.push({ url: u.slice(-120), post: (p.request.postData || "").slice(0, 400) });
});

// 偏移链
const offA = await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));if(!f)return{ox:0,oy:0};const r=f.getBoundingClientRect();return{ox:Math.round(r.left),oy:Math.round(r.top)};})()`).catch(() => ({ ox: 0, oy: 0 }));
const offB = await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/testing|exam/.test(e.src||''));if(!f)return{ox:0,oy:0};const r=f.getBoundingClientRect();return{ox:Math.round(r.left),oy:Math.round(r.top)};})()`, tb0.ctx).catch(() => ({ ox: 0, oy: 0 }));
const OX = (offA.ox || 0) + (offB.ox || 0), OY = (offA.oy || 0) + (offB.oy || 0);
log("偏移 OX,OY =", OX, OY);

// —— ① healthy 探针（题目块非空 + chapter 匹配）——
let healthy = false, probeLast = {};
for (let k = 0; k < 15 && !healthy; k++) {
  const n = await exEv(`document.querySelectorAll('[class*=answer-question-box_questionItem]').length`).catch(() => 0);
  const chapterOK = !!tb0 && tb0.url.includes(CH[1]);
  probeLast = { questions: n, chapterOK };
  log(`probe#${k}: ${JSON.stringify(probeLast)}`);
  if (n > 0 && chapterOK) { healthy = true; log("HEALTHY ✓"); break; }
  await sleep(1500);
}
if (!healthy) { log("NOT HEALTHY，终止"); cdp.close(); process.exit(3); }

// 点掉顶层「我知道了」弹窗（若有）
const ack = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n(e.innerText)==='我知道了'&&e.getBoundingClientRect().width>15);if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`).catch(() => null);
if (ack) { await mouse(ack.x, ack.y); log("点掉我知道了", JSON.stringify(ack)); await sleep(1500); }

// —— ② 答满 26 题（exam ctx 内 JS 操作，选择题点首项、填空/文本填入） ——
const answered = await exEv(`(()=>{
  const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];
  let picked=0, filled=0;
  items.forEach(q=>{
    const rows=[...q.querySelectorAll('[class*=chioceView_strongListView]')];
    if(rows.length){ rows[0].click(); picked++; return; }
    // 判断题/TF 选项
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

// —— ③ 提交（scrollIntoView 后取 exam 帧内坐标 + 偏移，CDP 真鼠标） ——
let submitted = false;
for (let k = 0; k < 5 && !submitted; k++) {
  const sb = await exEv(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');
    const v=[...document.querySelectorAll('button,[class*=i-button],div,span')].filter(e=>n(e.innerText)==='提交'&&e.getBoundingClientRect().width>25&&e.getBoundingClientRect().height>10);
    if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();
    return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`).catch(() => null);
  if (!sb) { await exEv(`(()=>{const se=document.scrollingElement;se.scrollBy(0,400);return 1;})()`).catch(() => {}); await sleep(800); continue; }
  log("提交按钮(exam帧内):", JSON.stringify(sb), "=> 页面:", sb.x + OX, sb.y + OY);
  await mouse(sb.x + OX, sb.y + OY);
  submitted = true;
  await sleep(2500);
}
log("submitted =", submitted);

// —— ④ 确认弹窗（确定/确认，跨 frame） ——
for (let k = 0; k < 6; k++) {
  let hit = false;
  for (const f of await frames()) {
    if (!f.ctx) continue;
    const oy = /testing/.test(f.url) ? OY : (/textbook/.test(f.url) ? (offA.oy || 0) : 0);
    const r = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');
      const root=[...document.querySelectorAll('[class*=modal],[role=dialog],[class*=dialog]')].find(e=>e.getBoundingClientRect().height>60&&/提交|交卷|未作答|确定|确认/.test(e.innerText||''));
      const v=(root?[...root.querySelectorAll('button,[class*=i-button],div,span')]:[...document.querySelectorAll('button,[class*=i-button],div,span')]).filter(e=>/^(确定|确认|继续提交)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>18);
      if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();
      return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2+${oy}),t:n(e.innerText),dlg:(root?root.innerText:'').replace(/\\s+/g,' ').slice(0,100)};})()`, f.ctx).catch(() => null);
    if (r) { log("确认:", JSON.stringify(r)); await mouse(r.x, r.y); hit = true; await sleep(1800); break; }
  }
  if (!hit) break;
}
await sleep(7000);

// —— ⑤ 读成绩文本（成绩弹窗/结果页） ——
let score = null, resultText = "";
for (const f of await frames()) {
  if (!f.ctx) continue;
  const t = String(await ev(`document.body.innerText`, f.ctx).catch(() => "") || "");
  if (/最终得分|正确率|测试满分/.test(t)) {
    resultText = t.replace(/\s+/g, " ");
    const m = resultText.match(/最终得分是\s*([\d.]+)\s*分/);
    if (m) score = m[1];
    log("成绩文本(前 260):", resultText.slice(0, 260));
    break;
  }
}
log("解析得分:", score);

// —— ⑥ 相关网络请求（找提交试卷接口） ——
log("相关请求:", net.length, JSON.stringify(net.slice(0, 12)).slice(0, 2000));

// —— ⑦ DOM 证据 ——
const dom = await exEv(`(()=>{const t=(document.body.innerText||'').replace(/\\s+/g,' ');
  return {examUrl:location.href.slice(-100), textLen:t.length, head:t.slice(0,300),
    hasScore:/最终得分|正确率|测试满分/.test(t), scoreSnippet:(t.match(/测试满分[^。]{0,100}/)||[''])[0],
    questions:document.querySelectorAll('[class*=answer-question-box_questionItem]').length};})()`).catch(e => ({ err: String(e).slice(0, 120) }));
log("DOM 证据:", JSON.stringify(dom, null, 1).slice(0, 1000));

// —— ⑧ 截图 ——
fs.mkdirSync("shots", { recursive: true });
const shot = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId).catch(() => ({ data: null }));
if (shot.data) { fs.writeFileSync(SHOT, Buffer.from(shot.data, "base64")); log("截图已存:", SHOT, fs.statSync(SHOT).size, "bytes"); }
else log("截图失败");

fs.writeFileSync("_u1g104-submit.json", JSON.stringify({ healthy, probeLast, answered, submitted, score, resultText: resultText.slice(0, 600), net, dom, shot: SHOT }, null, 1));
cdp.close();
