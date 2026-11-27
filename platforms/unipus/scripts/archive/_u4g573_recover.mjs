// _u4g573_recover.mjs — 第2轮步骤A：刷新恢复 healthy（不切单元，无需7min冷却）+ 滚动到目标块 + 截图 + DOM 坐标清单
import { connect, sleep } from "./utlib.mjs";
import { CH } from "./reader.mjs";
import fs from "node:fs";
const log = (...a) => console.log("[g573-rec]", ...a);
process.on("uncaughtException", e => log("uncaught:", String(e).slice(0, 160)));
const ANCHOR = "VhDiwq6t7LToLXyo";
const PRE = "shots/U4-u4g573-pre.png";
fs.mkdirSync("shots", { recursive: true });

const tabs = (await (await fetch("http://127.0.0.1:9222/json/list")).json()).filter(t => t.type === "page" && /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(tabs[0].id);
const { ev, frames, cdp, sessionId } = L;
const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId).catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
};
// 关规则弹窗（真实坐标，视觉已确认过按钮样式）
const clean = async () => {
  for (const f of await frames()) {
    if (!/pc\.html/.test(f.url)) continue;
    const p = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(我知道了|知道了|继续学习|开始学习)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, f.ctx).catch(() => null);
    if (p) { await mouse(p.x, p.y); log("点掉弹窗:", JSON.stringify(p)); await sleep(1200); }
  }
};
const probe = async () => {
  const tb = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx);
  if (!tb) return { tb: false, blocks: 0, nonempty: 0, chap: "" };
  const chap = (tb.url.match(/chapter\/([0-9a-f-]+)/) || [])[1] || "";
  const r = await ev(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
    const b=bs.find(x=>(x.getAttribute('data-lexical-node-anchor')||'').startsWith(${JSON.stringify(ANCHOR)}));
    return {blocks:bs.length,nonempty:bs.filter(x=>(x.innerText||'').replace(/\\s+/g,'').length>5).length,
      statuses:[...new Set(bs.map(x=>x.getAttribute('data-lexical-node-status')))],
      targetIdx:bs.indexOf(b),targetStatus:b?b.getAttribute('data-lexical-node-status'):null,
      targetLen:b?(b.innerText||'').length:0,targetFileInputs:b?b.querySelectorAll('input[type=file]').length:0,
      bodyLen:(document.body.innerText||'').length};})()`, tb.ctx).catch(e => ({ err: String(e).slice(0, 120) }));
  return { tb: true, chap, ...r };
};

// ① 刷新恢复（沿用 _u4g569_round2 已验证方案）
let fin = {}, healthy = false;
for (let k = 0; k < 5 && !healthy; k++) {
  log(`reload #${k + 1} ...`);
  await cdp.send("Page.reload", { ignoreCache: true }, sessionId).catch(() => {});
  await sleep(20000);
  await clean();
  for (let j = 0; j < 4; j++) {
    await clean();
    await sleep(3000);
    fin = await probe();
    log(`  probe#${j}:`, JSON.stringify(fin));
    if (fin.nonempty > 0 && fin.chap === CH[4]) { healthy = true; break; }
    // JS 兜底直点"我知道了"
    for (const f of await frames()) await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const b=[...document.querySelectorAll('button,div,span,a')].find(e=>/^(我知道了|知道了)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>10);if(b){b.click();return 1;}return 0;})()`, f.ctx).catch(() => 0);
  }
}
log("HEALTHY:", healthy, "chap:", fin.chap, "nonempty:", fin.nonempty);
if (!healthy) {
  const shot = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId).catch(() => ({ data: null }));
  if (shot.data) { fs.writeFileSync(PRE, Buffer.from(shot.data, "base64")); log("未恢复截图:", PRE); }
  fs.writeFileSync("_u4g573-recover.json", JSON.stringify({ healthy, fin, shot: PRE }, null, 1));
  cdp.close(); process.exit(3);
}

// ② 滚动到 u4g573 块（scrollIntoView 纪律），读取上传控件/提交按钮真实坐标
const tb = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx && f.url.includes(CH[4].slice(0, 12)));
const raw = e => ev(e, tb.ctx);
const layout = await raw(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
  const b=bs.find(x=>(x.getAttribute('data-lexical-node-anchor')||'').startsWith(${JSON.stringify(ANCHOR)}));
  if(!b)return{err:'no block'};b.scrollIntoView({block:'center'});
  const t=(b.innerText||'').replace(/\\s+/g,' ');
  const ups=[...b.querySelectorAll('.ant-upload-btn,[class*=upload-drag],[class*=uploadBtn],input[type=file]')].map(e=>{e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{cls:(e.className||'').toString().slice(0,60),tag:e.tagName,x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),w:Math.round(r.width),h:Math.round(r.height)};});
  const subs=[...b.querySelectorAll('div,button,[class*=i-button],span')].filter(e=>(e.innerText||'').replace(/\\s+/g,'')==='提交'&&e.getBoundingClientRect().width>25).map(e=>{const r=e.getBoundingClientRect();return{tag:e.tagName,cls:(e.className||'').toString().slice(0,50),x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),w:Math.round(r.width)};});
  const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));
  const off=f?{ox:Math.round(f.getBoundingClientRect().left),oy:Math.round(f.getBoundingClientRect().top)}:{ox:0,oy:0};
  return{idx:bs.indexOf(b),anchor:b.getAttribute('data-lexical-node-anchor'),status:b.getAttribute('data-lexical-node-status'),
    len:t.length,text:t.slice(0,260),fileInputs:b.querySelectorAll('input[type=file]').length,
    hasUploadText:/Upload your work here|点击或将文件拖拽|上传|Upload/.test(t),hasRedo:/重新作答|重新提交/.test(t),
    hasAnswer:/答案|Reference/.test(t),hasScore:/得分/.test(t),ups,subs,off,
    bodyHasLimit:/限流|稍后再试|非单元学习周期|加载失败/.test(document.body.innerText||'')};})()`).catch(e => ({ err: String(e).slice(0, 160) }));
await sleep(1500);
log("LAYOUT:", JSON.stringify(layout, null, 1).slice(0, 2000));

// ③ 截图（关键点击前，供 Read 视觉确认）
const shot = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId).catch(() => ({ data: null }));
if (shot.data) { fs.writeFileSync(PRE, Buffer.from(shot.data, "base64")); log("点击前截图:", PRE, fs.statSync(PRE).size, "bytes"); }
fs.writeFileSync("_u4g573-recover.json", JSON.stringify({ healthy, fin, layout, shot: PRE }, null, 1));
cdp.close();
