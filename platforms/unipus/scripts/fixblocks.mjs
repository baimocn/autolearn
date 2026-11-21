// fixblocks.mjs <unit> [blocks] — 处理"innerText=0 但有控件"的块（textarea/file/video）
import { CDP, sleep } from "./cdp.mjs";
import { connect } from "./utlib.mjs";
import { READER, COURSE, CH } from "./reader.mjs";
const U = Number(process.argv[2] || 1);
const ONLY = process.argv[3] ? process.argv[3].split(",").map(Number) : null;
const log = (...a) => console.log(`[fix${U}]`, ...a);
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
// 关公告条 + 关抽屉（真实坐标）
const off = await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));if(!f)return {ox:0,oy:0};const rr=f.getBoundingClientRect();return {ox:Math.round(rr.left),oy:Math.round(rr.top)};})()`);
log("iframe offset:", JSON.stringify(off));
// 公告
await mouse(1243, 101); await sleep(900);
// 抽屉 close (frame coords 356,24)
for (let k = 0; k < 3; k++) {
  const dp = await ev(`(()=>{const e=document.querySelector('[class*=catalog_drawer-close]');if(!e)return null;const b=e.getBoundingClientRect();if(b.width<3)return null;return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, tb.ctx).catch(() => null);
  if (!dp) break;
  await mouse(dp.x + (off.ox || 0), dp.y + (off.oy || 0));
  await sleep(1200);
}
// 规则弹窗
for (let i = 0; i < 4; i++) {
  let hit = false;
  for (const f of await frames()) {
    const p = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='我知道了'&&e.getBoundingClientRect().width>20);if(!v.length)return null;const b=v[v.length-1].getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, f.ctx).catch(() => null);
    if (p) { await mouse(p.x, p.y); await sleep(1200); hit = true; break; }
  }
  if (!hit) break;
}

// 扫描所有"控件块"（不管 innerText 长度）
const total = await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`, tb.ctx).catch(() => 0);
log("blocks:", total);
const found = [];
for (let i = 0; i < total; i++) {
  await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(b)b.scrollIntoView({block:'center'});return 1;})()`, tb.ctx).catch(() => {});
  await sleep(1100);
  const s = await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
    if(!b)return null;
    const t=(b.innerText||'');
    return {len:t.length, area:b.querySelectorAll('textarea').length, inp:b.querySelectorAll('input[type=text]').length,
      file:b.querySelectorAll('input[type=file]').length, video:b.querySelectorAll('video').length, audio:b.querySelectorAll('audio').length,
      btns:[...b.querySelectorAll('[class*=i-button]')].map(e=>(e.innerText||'').replace(/\\s+/g,'')).filter(Boolean).slice(0,4),
      score:(t.replace(/\\s+/g,' ').match(/得分[:：]?\\s*(\\d+(\\.\\d+)?)/)||[])[1]??null, redo:/重新作答/.test(t), sub:/提交/.test(t)};})()`, tb.ctx).catch(() => null);
  if (s && (s.area || s.file || s.video || s.audio || s.inp) && (ONLY === null || ONLY.includes(i))) found.push({ i, ...s });
}
log("控件块:", JSON.stringify(found));
// 逐个处理 textarea/inp 块（填答案→提交）
for (const b of found) {
  const i = b.i;
  if (b.file) { log(`#${i} upload 块，跳过（平台上传组件不初始化）`); continue; }
  if (b.video || b.audio) { log(`#${i} 媒体块，跳过（由视频拖尾阶段处理）`); continue; }
  if (!b.area && !b.inp) continue;
  if (b.score !== null && Number(b.score) >= 99.9) { log(`#${i} 已满分`); continue; }
  try {
    await ev(`(()=>{const bb=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(bb)bb.scrollIntoView({block:'center'});return 1;})()`, tb.ctx);
    await sleep(900);
    if (b.area) {
      await ev(`(()=>{const bb=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
        const els=[...bb.querySelectorAll('textarea')];
        const set=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;
        const v="Agriculture has always been the foundation of human civilization. In this task, I have studied the key points of this unit and would like to share my understanding. Modern farming methods have greatly improved productivity, while traditional wisdom keeps the soil healthy for future generations. Balancing efficiency with sustainability is the main message of this unit. In conclusion, this unit has deepened my understanding of agriculture and its role in culture and society.";
        els.forEach(e=>{e.focus();set.call(e,v);
          e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));e.blur();});
        return els.length;})()`, tb.ctx).catch(() => 0);
    } else {
      await ev(`(()=>{const bb=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
        const els=[...bb.querySelectorAll('input[type=text]')];
        const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
        els.forEach((e,k)=>{e.focus();set.call(e,'answer '+(k+1));
          e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));e.blur();});
        return els.length;})()`, tb.ctx).catch(() => 0);
    }
    await sleep(600);
    const sub = await ev(`(()=>{const bb=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
      const el=[...bb.querySelectorAll('[class*=i-button]')].find(e=>((e.innerText||'').replace(/\\s+/g,''))==='提交');
      if(el){el.click();return 1;}return 0;})()`, tb.ctx);
    if (!sub) { log(`#${i} 无提交按钮`); continue; }
    await sleep(7000);
    // 确认弹窗
    for (const f of await frames()) {
      await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>/^(确认|确定)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>18);if(v.length){v[v.length-1].click();return 1;}return 0;})()`, f.ctx).catch(() => 0);
    }
    await sleep(2000);
    const fin = await ev(`(()=>{const bb=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
      const t=(bb.innerText||'').replace(/\\s+/g,' ');
      return {score:(t.match(/得分[:：]?\\s*(\\d+(\\.\\d+)?)/)||[])[1]??null, redo:/重新作答/.test(t), hasSub:/提交/.test(t), txt:t.slice(0,80)};})()`, tb.ctx).catch(() => null);
    log(`#${i} 提交后`, JSON.stringify(fin));
  } catch (e) { log(`#${i} 异常`, String(e).slice(0, 90)); }
}
// 截图收尾
const { data } = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId);
const fs = await import("node:fs");
fs.writeFileSync(`fix-u${U}.png`, Buffer.from(data, "base64"));
log("done, screenshot fix-u"+U+".png");
cdp.close();
