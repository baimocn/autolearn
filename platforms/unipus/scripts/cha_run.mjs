// cha_run.mjs <unit> [probe|do:C,B,D,C,B] — 挑战：探题或作答提交
import { CDP, sleep } from "./cdp.mjs";
import { connect } from "./utlib.mjs";
import { READER, COURSE, CH } from "./reader.mjs";
const U = Number(process.argv[2]);
const FIRST = {1:"u1g1",2:"u2g236",3:"u3g349",4:"u4g499",5:"u5g602",6:"u6g707",7:"u7g881",8:"u8g983"}[U] || ("u"+U+"g2");
const MODE = process.argv[3] || "probe";
const log = (...a) => console.log(`[cr${U}]`, ...a);
process.on("uncaughtException", (e) => log("uncaught:", String(e).slice(0, 110)));
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
let rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
if (!rd) {
  const ver = await (await fetch("http://127.0.0.1:9222/json/version")).json();
  const boot = await CDP.connect(ver.webSocketDebuggerUrl);
  const r = await boot.send("Target.createTarget", { url: `${READER}#/${COURSE}/courseware/u${U}/${FIRST}` });
  boot.close();
  await sleep(16000);
  rd = { id: r.targetId };
}
const L = await connect(rd.id);
const { ev, frames, cdp, sessionId } = L;
let tb = null;
for (let k = 0; k < 60 && !tb; k++) {
  tb = (await frames()).find(f => f.url.includes("textbook/book") && f.ctx);
  if (tb) { const n = await ev(`document.querySelectorAll('[data-lexical-node-type="quiz-paper-link"]').length`, tb.ctx).catch(() => 0); if (n > 0) break; }
  await sleep(1000);
}
if (!tb) { log("NO TB/cards"); process.exit(1); }
const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId).catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
};
// JS 点挑战卡
const clickCard = () => ev(`(()=>{
  const cs=[...document.querySelectorAll('[data-lexical-node-type="quiz-paper-link"]')];
  for(const c of cs){
    const img=c.querySelector('img');let dec='';try{dec=decodeURIComponent(img?img.src:'');}catch(e){dec=img?img.src:'';}
    if(!dec.includes('挑战'))continue;
    (img||c).click();return 1;
  }
  return 0;})()`, tb.ctx);
const examFrame = async () => {
  for (let k = 0; k < 20; k++) {
    const ex = (await frames()).find(f => /\/exam\/|testing\/(challenge|diagnosis)/.test(f.url) && f.ctx);
    if (ex) return ex;
    await sleep(1000);
  }
  return null;
};
// 清场：本单元学习规则等嵌套弹窗用坐标点掉（DOM 不可见）
for (let k = 0; k < 3; k++) { await mouse(629, 477); await sleep(1500); }
// 关公告条
await mouse(1243, 101); await sleep(800);
// 始终为新挑战开新试卷：先记录旧 exam URL
const oldExams = new Set((await frames()).filter(f => f.url.includes("/exam/")).map(f => f.url));
let ex = null;
{
  const c = await clickCard();
  log("card clicked:", c);
  await sleep(6000);
  // 挑战须知 → 开始挑战（JS，多次尝试）
  let started = false;
  for (let attempt = 0; attempt < 4 && !started; attempt++) {
    await mouse(629, 477); await sleep(1200); // 清规则弹窗
    for (const f of await frames()) {
      const r = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(开始挑战|开始答题)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return 0;v[v.length-1].click();return 1;})()`, f.ctx).catch(() => 0);
      if (r) { started = true; break; }
    }
    if (!started) {
      // 用真实坐标再点一次卡片
      const rect = await ev(`(()=>{const cs=[...document.querySelectorAll('[data-lexical-node-type="quiz-paper-link"]')];
        for(const c2 of cs){const img=c2.querySelector('img');let dec='';try{dec=decodeURIComponent(img?img.src:'');}catch(e){dec=img?img.src:'';}
          if(!dec.includes('挑战'))continue;
          c2.scrollIntoView({block:'center'});const b=c2.getBoundingClientRect();
          return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};}
        return null;})()`, tb.ctx).catch(() => null);
      if (rect) { await mouse(rect.x, rect.y); log("real-click card", rect.x, rect.y); }
      await sleep(4000);
    }
  }
  log("start:", started);
  await sleep(4000);
  // 取"新出现"的 exam 帧
  for (let k = 0; k < 20 && !ex; k++) {
    for (const f of await frames()) {
      if (f.url.includes("/exam/") && f.ctx && !oldExams.has(f.url)) { ex = f; break; }
    }
    if (!ex) await sleep(1000);
  }
  if (!ex) ex = (await frames()).find(f => f.url.includes("/exam/") && f.ctx);
}
if (!ex) { log("no exam frame"); process.exit(2); }
log("exam:", ex.url.slice(45, 85));

if (MODE === "probe") {
  const info = await ev(`(()=>{
    const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];
    return items.map((q,i)=>({
      i,
      stem:(q.innerText||'').replace(/\\s+/g,' ').slice(0,260)
    }));})()`, ex.ctx);
  console.log(JSON.stringify(info, null, 1).slice(0, 3500));
} else if (MODE.startsWith("do:")) {
  const letters = MODE.slice(3).split(",").map(s => s.trim().toUpperCase());
  const idx = letters.map(l => "ABCD".indexOf(l[0]));
  const picked = await ev(`(async()=>{
    const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];
    const idx=${JSON.stringify(idx)};
    const out=[];
    for(let i=0;i<items.length;i++){
      const rows=[...items[i].querySelectorAll('[class*=chioceView_strongListView]')];
      const k=idx[i]??0;
      if(rows[k]){rows[k].click();out.push(String(i)+":"+String(k));}
      await new Promise(r=>setTimeout(r,200));
    }
    return out;})()`, ex.ctx);
  log("picked:", JSON.stringify(picked));
  await sleep(1000);
  const sub = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n(e.innerText)==='提交'&&e.getBoundingClientRect().width>10);if(!v.length)return 0;v[v.length-1].click();return 1;})()`, ex.ctx);
  log("submit:", sub);
  await sleep(3500);
  // 确定弹窗：优先 JS 点 .ant-btn-primary（u6 验证），兜底坐标
  let conf = 0;
  for (let k = 0; k < 6 && !conf; k++) {
    conf = await ev(`(()=>{const b=document.querySelector('.ant-modal-confirm-btns .ant-btn-primary');if(!b)return 0;b.click();return 1;})()`, ex.ctx).catch(()=>0);
    if (!conf) { await sleep(1200); }
  }
  if (!conf) { await mouse(712, 525); log("confirm fallback @712,525"); }
  else log("confirm via ant-btn-primary");
  await sleep(4500);
  // 成绩提交
  let posted = false;
  for (let k = 0; k < 10; k++) {
    for (const f of await frames()) {
      const r = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n(e.innerText)==='成绩提交'&&e.getBoundingClientRect().width>12);if(!v.length)return 0;v[v.length-1].click();return 1;})()`, f.ctx).catch(() => 0);
      if (r) { posted = true; break; }
    }
    if (posted) break;
    await sleep(1500);
  }
  log("posted:", posted);
  await sleep(3000);
  const fs = await import("node:fs");
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId);
  fs.writeFileSync(`cha-${U}-run.png`, Buffer.from(data, "base64"));
  // 结果文本
  for (const f of await frames()) {
    const t = await ev(`(()=>{const t2=document.body?document.body.innerText:'';const m=t2.replace(/\\s+/g,' ').match(/(本轮成绩|最终得分|提交成功)[^。]{0,60}/);return m?m[0]:'';})()`, f.ctx).catch(() => "");
    if (t) log("RESULT:", t);
  }
}
cdp.close();
