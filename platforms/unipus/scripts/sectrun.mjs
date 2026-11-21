// sectrun.mjs <unit> [rounds] — 抽屉百分比驱动：点开 <100% 小节→宽松判据处理块→复读
import { CDP, sleep } from "./cdp.mjs";
import { connect } from "./utlib.mjs";
import { READER, COURSE, CH } from "./reader.mjs";
import fs from "node:fs";
const U = Number(process.argv[2] || 1);
const ROUNDS = Number(process.argv[3] || 4);
const log = (...a) => console.log(`[sect${U}]`, ...a);
process.on("uncaughtException", (e) => log("uncaught:", String(e).slice(0, 110)));
const getVer = async () => (await fetch("http://127.0.0.1:9222/json/version")).json();
const getTabs = async () => (await fetch("http://127.0.0.1:9222/json/list")).json();
const b0 = await CDP.connect((await getVer()).webSocketDebuggerUrl);
for (const t of (await getTabs()).filter(t => /ucontent\.unipus\.cn/.test(t.url))) await b0.send("Target.closeTarget", { targetId: t.id }).catch(() => {});
await sleep(800);
const r = await b0.send("Target.createTarget", { url: `${READER}#/${COURSE}/courseware/u${U}/u${U}g2` });
b0.close();
await sleep(18000);
try {
  const { execSync } = await import("node:child_process");
  const tu = (await getTabs()).find(t => t.id === r.targetId);
  if (tu && /sso\.unipus\.cn\/sso\/login/.test(tu.url)) {
    log("SSO, relogin");
    try { execSync("node relogin2.mjs", { cwd: process.cwd(), env: { ...process.env, UNIPUS_USER: "USER_A_PHONE", UNIPUS_PASS: "REDACTED_PW" }, stdio: "pipe", timeout: 120000 }); } catch {}
    await sleep(3000);
  }
} catch {}
const L = await connect(r.targetId);
const { ev, frames, cdp, sessionId } = L;
let tb = null;
for (let k = 0; k < 110 && !tb; k++) {
  tb = (await frames()).find(f => f.url.includes("textbook/book") && f.ctx && f.url.includes((CH[U] || "??").slice(0, 12)));
  if (tb) { const n = await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`, tb.ctx).catch(() => 0); if (n > 0) break; }
  await sleep(1000);
}
if (!tb) { log("NO TB"); process.exit(1); }
const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId).catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
};
const dismissRules = async () => {
  for (let i = 0; i < 4; i++) {
    let hit = false;
    for (const f of await frames()) {
      const p = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='我知道了'&&e.getBoundingClientRect().width>20);if(!v.length)return null;const b=v[v.length-1].getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, f.ctx).catch(() => null);
      if (p) { await mouse(p.x, p.y); await sleep(1100); hit = true; break; }
    }
    if (!hit) break;
  }
};
await dismissRules();

// 读抽屉（含百分比、坐标）
const readDrawer = () => ev(`(()=>{
  const out=[];
  [...document.querySelectorAll('[class*=i-tree-menu_title-flex]')].forEach(e=>{
    const b=e.getBoundingClientRect();
    const raw=(e.innerText||'').replace(/\\s+/g,' ').trim();
    if(!raw||raw.length>60)return;
    const m=raw.match(/(\\d+(?:\\.\\d+)?)\\s*%\\s*$/);
    const name=raw.replace(/\\s*\\d+(?:\\.\\d+)?\\s*%\\s*$/,'').trim();
    out.push({name, pct:m?Number(m[1]):null,
      x:Math.round(b.left+b.width/2), y:Math.round(b.top+b.height/2), vis:b.width>10&&b.top>=0});
  });
  const seen=new Set(); const uniq=[];
  for(const o of out){ if(seen.has(o.name))continue; seen.add(o.name); uniq.push(o); }
  return uniq;})()`, tb.ctx);

// 宽松判据块扫描
const scanBlocks = () => ev(`[...document.querySelectorAll('div.editor-question-block.questionBlockNode')].map((b,i)=>{
  const t=(b.innerText||'');
  return {i, len:t.length,
    area:b.querySelectorAll('textarea').length, inp:b.querySelectorAll('input[type=text]').length,
    file:b.querySelectorAll('input[type=file]').length, video:b.querySelectorAll('video').length, audio:b.querySelectorAll('audio').length,
    dig:b.querySelectorAll('[class*=digEmptyView_blankView]').length, dd:b.querySelectorAll('[class*=digEmptySelectView_selectTrigger]').length,
    tf:b.querySelectorAll('[class*=answer_optionTF]').length, items:b.querySelectorAll('[class*=questionItem]').length,
    sub:[...b.querySelectorAll('[class*=i-button]')].some(e=>((e.innerText||'').replace(/\\s+/g,''))==='提交'),
    redo:/重新作答/.test(t),
    score:(t.replace(/\\s+/g,' ').match(/得分[:：]?\\s*(\\d+(\\.\\d+)?)/)||[])[1]??null};
})`, tb.ctx);

const clickBlockFill = async (i) => {
  // 填答案 + 提交；返回结果
  const s = await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
    if(!b)return null;
    return {area:b.querySelectorAll('textarea').length, inp:b.querySelectorAll('input[type=text]').length};})()`, tb.ctx);
  if (!s) return { err: "no block" };
  await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(b)b.scrollIntoView({block:'center'});return 1;})()`, tb.ctx);
  await sleep(1200);
  if (s.area) {
    await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
      const els=[...b.querySelectorAll('textarea')];
      const set=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;
      const v="Agriculture has always been the foundation of human civilization. In this task, I have studied the key points of this unit and would like to share my understanding. Modern farming methods have greatly improved productivity, while traditional wisdom keeps the soil healthy for future generations. In conclusion, this unit has deepened my understanding of agriculture.";
      els.forEach(e=>{e.focus();set.call(e,v);
        e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));e.blur();});
      return els.length;})()`, tb.ctx);
  } else if (s.inp) {
    await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
      const els=[...b.querySelectorAll('input[type=text]')];
      const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
      els.forEach((e,k)=>{e.focus();set.call(e,'answer '+(k+1));
        e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));e.blur();});
      return els.length;})()`, tb.ctx);
  }
  await sleep(500);
  const sub = await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
    const el=[...b.querySelectorAll('[class*=i-button]')].find(e=>((e.innerText||'').replace(/\\s+/g,''))==='提交');
    if(el){el.click();return 1;}return 0;})()`, tb.ctx);
  if (!sub) return { err: "no submit" };
  await sleep(7500);
  for (const f of await frames()) {
    await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>/^(确认|确定)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>18);if(v.length){v[v.length-1].click();return 1;}return 0;})()`, f.ctx).catch(() => 0);
  }
  await sleep(1500);
  const fin = await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
    const t=(b.innerText||'').replace(/\\s+/g,' ');
    return {score:(t.match(/得分[:：]?\\s*(\\d+(\\.\\d+)?)/)||[])[1]??null, redo:/重新作答/.test(t), ok:true};})()`, tb.ctx).catch(() => null);
  return fin || { ok: false };
};

// —— 主流程 ——
const handled = new Set();
let lastPct = {};
for (let round = 0; round < ROUNDS; round++) {
  const drawer = (await readDrawer()) || [];
  const targets = drawer.filter(x => x.pct !== null && x.pct < 100);
  log(`round${round}: 小节${drawer.length} 未完成${targets.length}: ${targets.map(t => t.name + ":" + t.pct + "%").join(" | ")}`);
  if (!targets.length) { log("全部小节 100%"); break; }
  for (const t of targets) {
    // 真实点击小节（坐标来自抽屉，textbook 帧 offset=0）
    await mouse(t.x, t.y);
    await sleep(6000);
    await dismissRules();
    if (!(await (async () => { const fl = await frames(); tb = fl.find(f => f.url.includes("textbook/book") && f.ctx && f.url.includes(CH[U].slice(0, 12))); return !!tb; })())) { log(`  ${t.name} 丢帧`); continue; }
    await sleep(4000);
    const blocks = (await scanBlocks()) || [];
    let didAny = false;
    for (const b of blocks) {
      const key = t.name + "#" + b.i;
      if (handled.has(key)) continue;
      // 宽松判据：有控件且(未满分)且未提交
      const hasCtrl = b.area + b.inp + b.dig + b.dd + b.tf + b.items > 0;
      const needWork = !(b.score !== null && Number(b.score) >= 99.9) && (b.sub || b.redo || b.score === null);
      if (!hasCtrl) continue;
      if (b.area || b.inp) {
        if (!b.sub) { handled.add(key); continue; }  // 无提交按钮的跳过（平台未挂载）
        try {
          const rr = await clickBlockFill(b.i);
          handled.add(key);
          if (rr && rr.ok) { didAny = true; log(`  ${t.name} #${b.i}`, JSON.stringify(rr).slice(0, 80)); }
          else log(`  ${t.name} #${b.i} ${JSON.stringify(rr).slice(0, 60)}`);
        } catch (e) { log(`  ${t.name} #${b.i} 异常`, String(e).slice(0, 60)); }
      } else {
        handled.add(key);
      }
    }
    // 复读该小节百分比
    const d2 = (await readDrawer()) || [];
    const now = d2.find(x => x.name === t.name);
    if (now && t.pct !== null && now.pct !== null && now.pct !== t.pct) {
      log(`  ${t.name}: ${t.pct}% -> ${now.pct}%`);
      didAny = true;
    }
    if (!didAny) log(`  ${t.name} 无处理对象`);
    await sleep(1000);
  }
}
const finalDrawer = (await readDrawer()) || [];
fs.writeFileSync(`sect-u${U}.json`, JSON.stringify(finalDrawer, null, 1));
log("最终抽屉:", JSON.stringify(finalDrawer.map(x => `${x.name}:${x.pct === null ? "-" : x.pct + "%"}`)));
const fs2 = await import("node:fs");
const { data } = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId);
fs2.writeFileSync(`sect-u${U}.png`, Buffer.from(data, "base64"));
cdp.close();
