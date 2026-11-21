// _u1g104_result.mjs — 点「查看测试结果」→ dump 成绩弹窗文本/按钮 → 截图 → DOM 证据
import { connect } from "./utlib.mjs";
import fs from "node:fs";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const tabs = (await (await fetch("http://127.0.0.1:9222/json/list")).json()).filter(t => t.type === "page" && /ucontent\.unipus\.cn/.test(t.url));
let target = null;
for (const t of tabs) {
  const L0 = await connect(t.id);
  const fl = await L0.frames();
  if (fl.some(f => /testing\/diagnosis/.test(f.url))) { target = t.id; L0.cdp.close(); break; }
  L0.cdp.close();
}
const L = await connect(target);
const { ev, frames, cdp, sessionId } = L;
const fl = await frames();
const exam = fl.find(f => /testing\/diagnosis/.test(f.url) && f.ctx);
const tb = fl.find(f => /textbook\/book/.test(f.url) && f.ctx);
const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId).catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
};
const offA = await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));if(!f)return{ox:0,oy:0};const r=f.getBoundingClientRect();return{ox:Math.round(r.left),oy:Math.round(r.top)};})()`).catch(() => ({ ox: 0, oy: 0 }));
const offB = await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/testing|exam/.test(e.src||''));if(!f)return{ox:0,oy:0};const r=f.getBoundingClientRect();return{ox:Math.round(r.left),oy:Math.round(r.top)};})()`, tb.ctx).catch(() => ({ ox: 0, oy: 0 }));
const OX = (offA.ox || 0) + (offB.ox || 0), OY = (offA.oy || 0) + (offB.oy || 0);
console.log("OX,OY =", OX, OY);
// 点「查看测试结果」（exam 帧内）
const btn = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');
  const v=[...document.querySelectorAll('button,[class*=i-button],div,span')].filter(e=>n(e.innerText)==='查看测试结果'&&e.getBoundingClientRect().width>20);
  if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();
  return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),w:Math.round(b.width)};})()`, exam.ctx).catch(() => null);
console.log("查看测试结果按钮:", JSON.stringify(btn));
if (btn) { await sleep(700); await mouse(btn.x + OX, btn.y + OY); console.log("点击 @", btn.x + OX, btn.y + OY); }
await sleep(5000);
// 读成绩弹窗（可能在 exam 帧或 textbook 帧）
let dlgText = "";
for (const f of await frames()) {
  if (!f.ctx) continue;
  const r = await ev(`(()=>{const ds=[...document.querySelectorAll('[class*=modal],[role=dialog],[class*=dialog],[class*=result]')].filter(e=>/测试满分|最终得分|正确率/.test(e.innerText||'')&&e.getBoundingClientRect().height>60);
    if(!ds.length)return null;const d=ds[ds.length-1];
    const btns=[...d.querySelectorAll('button,[class*=i-button]')].map(b=>({t:(b.innerText||'').replace(/\\s+/g,'').slice(0,16),w:Math.round(b.getBoundingClientRect().width)})).filter(x=>x.t&&x.w>10);
    return {txt:(d.innerText||'').replace(/\\s+/g,' ').slice(0,900),btns:btns.slice(0,8)};})()`, f.ctx).catch(() => null);
  if (r) { dlgText = r.txt; console.log("成绩弹窗 @", f.url.slice(0, 75)); console.log(JSON.stringify(r, null, 1).slice(0, 1600)); break; }
}
if (!dlgText) {
  for (const f of await frames()) {
    if (!f.ctx) continue;
    const t = String(await ev(`document.body.innerText`, f.ctx).catch(() => "") || "").replace(/\s+/g, " ");
    const m = t.match(/测试满分[^。]{0,120}/);
    if (m) { dlgText = m[0]; console.log("成绩文本(正文匹配) @", f.url.slice(0, 75), ":", m[0]); break; }
  }
}
const score = dlgText.match(/最终得分是\s*([\d.]+)\s*分/);
console.log("真实得分:", score ? score[1] : "未匹配");
// DOM 证据
const dom = await ev(`(()=>{const t=(document.body.innerText||'').replace(/\\s+/g,' ');
  return {examUrl:location.href.slice(-100), hasResult:/最终得分|正确率|测试满分/.test(t),
    resultSnippet:(t.match(/测试满分[^。]{0,140}/)||[''])[0], tail:t.slice(-200)};})()`, exam.ctx).catch(() => ({}));
console.log("DOM 证据:", JSON.stringify(dom, null, 1).slice(0, 900));
// 截图
fs.mkdirSync("shots", { recursive: true });
const shot = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId).catch(() => ({ data: null }));
if (shot.data) { fs.writeFileSync("shots/U1-u1g104.png", Buffer.from(shot.data, "base64")); console.log("截图已存:", fs.statSync("shots/U1-u1g104.png").size, "bytes"); }
fs.writeFileSync("_u1g104-result.json", JSON.stringify({ score: score ? score[1] : null, dlgText: dlgText.slice(0, 900), dom }, null, 1));
L.cdp.close();
