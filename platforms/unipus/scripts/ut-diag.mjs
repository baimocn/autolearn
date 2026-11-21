// ut-diag.mjs <unit> — UT 逐步诊断：答满→找提交→交→dump成绩弹窗
import { CDP, sleep } from "./cdp.mjs";
import { connect } from "./utlib.mjs";
import { READER, COURSE } from "./reader.mjs";
import fs from "node:fs";
const U = Number(process.argv[2] || 1);
const T = {
  1: { ch: "7840f299-1cce-403e-9320-d6ddf613cebf", ut: "r9Bp9I6D7fWBbMQx", first: "u1g1", paper: "ARpEPuQb6dbje2Rt" },
  2: { ch: "2c3ad11f-a37e-4a64-ba6a-6cfa256cc6be", ut: "VDGbYePMurjtP9Wo", first: "u2g236", paper: "Ggbn6UUsCB1BDWK7" },
  3: { ch: "5f975081-b8b7-4799-9d9c-b83a53423e4f", ut: "zqugdZPKdVciPw67", first: "u3g349", paper: "Vf9zIqKzKbEy0tS8" },
  4: { ch: "6c59c2ec-f8bd-46f8-8506-6a8b25ff9e7b", ut: "PSuZxNgPxD72RgQY", first: "u4g499", paper: "kijiH3hfSGpWXCZt" },
  5: { ch: "bfb4fa0c-fbd4-436f-8b37-3b307810cf63", ut: "pvYNh0qfHSkMxawf", first: "u5g602", paper: "a0wU6J1hxyyYDum4" },
  6: { ch: "1ed78c87-3e9c-4426-a2fb-4a155955a7bb", ut: "s7e2TKOfuRaCXvYi", first: "u6g707", paper: "glJoJMm7teuPe6FM" },
  7: { ch: "bc8967a2-13b9-4a3f-a127-e368e228e9e5", ut: "Xah5ohJ4eaoiG7ra", first: "u7g881", paper: "DLoRxFxhsWXHTiVh" },
  8: { ch: "f8dc1090-7968-4eb7-b231-63da59732244", ut: "iN2uUP7NJsOY0p8a", first: "u8g983", paper: "d2tv8TtKg3BmGZad" },
}[U];
const BOOK = (await import("./config.mjs")).BOOK, BV = "VTqvEEI";
const log = (...a) => console.log(`[diag${U}]`, ...a);
process.on("uncaughtException", (e) => log("uncaught:", String(e).slice(0, 110)));
const shot = async (L, name) => {
  try { const { data } = await L.cdp.send("Page.captureScreenshot", { format: "png" }, L.sessionId); fs.writeFileSync(name, Buffer.from(data, "base64")); } catch {}
};

const b0 = await CDP.connect((await (await fetch("http://127.0.0.1:9222/json/version")).json()).webSocketDebuggerUrl);
for (const t of (await (await fetch("http://127.0.0.1:9222/json/list")).json()).filter(t => /ucontent\.unipus\.cn/.test(t.url))) await b0.send("Target.closeTarget", { targetId: t.id }).catch(() => {});
await sleep(800);
const r = await b0.send("Target.createTarget", { url: `${READER}#/${COURSE}/courseware/u${U}/${T.first}` });
b0.close();
await sleep(9000);

// auto-relogin if redirected to SSO
try {
  let tu = (await (await fetch("http://127.0.0.1:9222/json/list")).json()).find(t => t.id === r.targetId);
  if (tu && /sso\.unipus\.cn\/sso\/login/.test(tu.url)) {
    log("检测到SSO，自动重登");
    const { execSync } = await import("node:child_process");
    try { execSync("node relogin2.mjs", { cwd: process.cwd(), env: { ...process.env, UNIPUS_USER: process.env.UNIPUS_USER || "USER_A_PHONE", UNIPUS_PASS: process.env.UNIPUS_PASS || "REDACTED_PW" }, stdio: "pipe", timeout: 120000 }); } catch {}
    await sleep(3000);
  }
} catch {}

const L = await connect(r.targetId);
const { ev, frames, cdp, sessionId } = L;
let tbOff = null;
for (let i = 0; i < 30; i++) {
  tbOff = await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));if(!f)return null;const rr=f.getBoundingClientRect();return{oy:Math.round(rr.top)};})()`).catch(() => null);
  if (tbOff) break;
  await sleep(1000);
}
await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));if(!f)return 0;f.src=${JSON.stringify(`https://ipub.unipus.cn/learner/textbook/book/${BOOK}/chapter/${T.ch}?bookVersionNumber=${BV}#${T.ut}`)};return 1;})()`);
await sleep(9000);
let tb = null;
for (let i = 0; i < 20; i++) { tb = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx); if (tb) break; await sleep(800); }
const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId).catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
};
const findAny = async (qgen) => {
  for (const f of await frames()) {
    const oy = /textbook/.test(f.url) ? (tbOff ? tbOff.oy : 0) : 0;
    const rr = await ev(qgen(oy), f.ctx).catch(() => null);
    if (rr) return rr;
  }
  return null;
};
for (let i = 0; i < 5; i++) { const a = await findAny((oy) => `(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='我知道了'&&e.getBoundingClientRect().width>20);if(!v.length)return null;const e=v[v.length-1];const b=e.getBoundingClientRect();return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2+${oy})};})()`); if (a) { await mouse(a.x, a.y); await sleep(1100); } else break; }
for (let t = 0; t < 4; t++) {
  const card = await ev(`(()=>{const cs=[...document.querySelectorAll('[data-lexical-node-type="quiz-paper-link"]')];const c=cs.find(e=>{const b=e.getBoundingClientRect();return b.top>50&&b.bottom<720&&b.height>80;});if(!c)return null;const b=c.getBoundingClientRect();return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+70+${tbOff.oy})};})()`, tb.ctx).catch(() => null);
  if (!card) break;
  await mouse(card.x, card.y);
  let started = null;
  for (let i = 0; i < 10; i++) {
    await sleep(900);
    const a = await findAny((oy) => `(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='我知道了'&&e.getBoundingClientRect().width>20);if(!v.length)return null;const e=v[v.length-1];const b=e.getBoundingClientRect();return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2+${oy})};})()`);
    if (a) { await mouse(a.x, a.y); await sleep(1000); continue; }
    const s2 = await findAny((oy) => `(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>/^(开始答题|再次作答)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>20);if(!v.length)return null;const e=v[v.length-1];const b=e.getBoundingClientRect();return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2+${oy})};})()`);
    if (s2) { await mouse(s2.x, s2.y); started = true; break; }
  }
  if (started) break;
}
let exam = null;
for (let i = 0; i < 25; i++) { await sleep(1000); exam = (await frames()).find(f => /testing\/(diagnosis|challenge)\/book/.test(f.url) && f.ctx && f.url.includes(T.paper)); if (exam) break; }
if (!exam) { log("no exam"); process.exit(1); }
await sleep(4000);
const exEv = (e) => ev(e, exam.ctx);
// offsets
const offA = await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));if(!f)return{ox:0,oy:0};const rr=f.getBoundingClientRect();return{ox:Math.round(rr.left),oy:Math.round(rr.top)};})()`);
const offB = await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/testing|exam/.test(e.src||''));if(!f)return null;const b=f.getBoundingClientRect();return{ox:Math.round(b.left),oy:Math.round(b.top)};})()`, tb.ctx).catch(() => null);
const OX = (offA && offA.ox || 0) + (offB && offB.ox || 0), OY = (offA && offA.oy || 0) + (offB && offB.oy || 0);
log("offset", OX, OY);

// —— 逐题答（带选中验证）——
for (let round = 0; round < 14; round++) {
  const todo = await exEv(`(()=>{
    return [...document.querySelectorAll('[class*=answer-question-box_questionItem]')].map((q,i)=>{
      const rows=[...q.querySelectorAll('[class*=chioceView_strongListView]')];
      const sel=rows.findIndex(r=>/selected/.test(r.className.toString()));
      const inp=q.querySelector('input,textarea');
      const b=q.getBoundingClientRect();
      return {i,sel,idx:sel, nsel:sel>=0, filled:inp&&(inp.value||'').length>0, hasInp:!!inp,
        vis:b.top>60&&b.top<window.innerHeight-60,
        ay:rows.length?Math.round(rows[Math.max(0,sel>=0?sel:0)].getBoundingClientRect().top+12):0,
        ry:rows.map(r=>Math.round(r.getBoundingClientRect().top+12)),
        iy:inp?Math.round(inp.getBoundingClientRect().top+12):0};
    }).filter(x=>!x.nsel&&!x.filled&&x.vis);
  })()`).catch(() => null);
  const prog = await exEv(`(()=>{const c=document.querySelector('[class*=answer-card_container]');const t=c?c.innerText:'';const m=t.match(/(\\d+)\\s*\\/\\s*(\\d+)/);return m?(m[1]+'/'+m[2]):'?';})()`);
  log(`round${round}: 待答${todo ? todo.length : "?"} card=${prog}`);
  if (!todo || !todo.length) {
    const atEnd = await exEv(`(()=>{const se=document.scrollingElement;const bf=se.scrollTop;se.scrollTop=se.scrollHeight;return bf>=se.scrollHeight-2;})()`).catch(() => true);
    if (atEnd) break;
    await exEv(`(()=>{const se=document.scrollingElement;se.scrollBy(0,Math.round(window.innerHeight*0.7));return 1;})()`).catch(() => {});
    await sleep(1000);
    continue;
  }
  for (const t of todo) {
    if (t.ry.length) {
      const pick = t.ry[Math.min(t.idx >= 0 ? t.idx : 0, t.ry.length - 1)];
      await mouse(300, pick + OY);
      await sleep(300);
      // 验证选中
      const chk = await exEv(`(()=>{const q=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')][${t.i}];
        if(!q)return -2;
        const rows=[...q.querySelectorAll('[class*=chioceView_strongListView]')];
        return rows.findIndex(r=>/selected/.test(r.className.toString()));})()`).catch(() => -9);
      if (chk < 0) {
        // JS 兜底
        await exEv(`(()=>{const q=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')][${t.i}];
          const rows=[...q.querySelectorAll('[class*=chioceView_strongListView]')];
          if(rows[0]){const rk=Object.keys(rows[0]).find(k=>k.startsWith('__reactProps'));
            try{if(rk&&rows[0][rk].onClick)rows[0][rk].onClick({stopPropagation(){},preventDefault(){},target:rows[0],currentTarget:rows[0],nativeEvent:{}});else rows[0].click();}catch(e){rows[0].click();}}return 1;})()`).catch(() => {});
        await sleep(250);
      }
    } else if (t.hasInp) {
      await mouse(300, t.iy + OY); await sleep(220);
      await cdp.send("Input.insertText", { text: "In my view, the passage emphasizes the importance of the topic and provides clear examples to support the main idea." }, sessionId).catch(() => {});
      await sleep(200);
    }
  }
}

// 全卷状态 + 答题卡 dump
const cardHtml = await exEv(`(()=>{const c=document.querySelector('[class*=answer-card_container]');return c?c.outerHTML.slice(0,2500):'NO CARD';})()`);
fs.writeFileSync(`utcard-u${U}.html`, String(cardHtml || ""));
const btnDump = await exEv(`[...document.querySelectorAll('button,[class*=i-button],[class*=submit],[class*=hand]')].map(b=>({t:(b.innerText||'').replace(/\\s+/g,'').slice(0,16),cls:b.className.toString().slice(0,60),w:Math.round(b.getBoundingClientRect().width),dis:b.disabled||false})).filter(x=>x.w>0).slice(0,25)`);
log("按钮:", JSON.stringify(btnDump));
await shot(L, `utdiag-u${U}-pre.png`);

// 提交（宽匹配所有提交类按钮）
let sub = null;
for (let k = 0; k < 6 && !sub; k++) {
  sub = await exEv(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>/提交|交卷/.test(n(e.innerText))&&e.getBoundingClientRect().width>16&&e.getBoundingClientRect().height>12);if(!v.length)return null;const e=v[v.length-1];const b=e.getBoundingClientRect();return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),t:n(e.innerText)};})()`);
  if (!sub) { await exEv(`(()=>{const se=document.scrollingElement;se.scrollBy(0,400);return 1;})()`).catch(() => {}); await sleep(800); }
}
log("SUBMIT:", JSON.stringify(sub));
if (sub) {
  await mouse(sub.x + OX, sub.y + OY);
  await sleep(2500);
  // 确认
  for (let i = 0; i < 8; i++) {
    let hit = false;
    for (const f of frames() ? await frames() : []) {
      const c = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');
        const root=[...document.querySelectorAll('.ant-modal-root,[class*=modal],[role=dialog]')].find(e=>/提交|交卷|未作答|确定/.test(e.innerText||'')&&e.getBoundingClientRect().height>60);
        if(!root)return null;
        const b=[...root.querySelectorAll('button')].find(x=>/^(确定|确认)$/.test(n(x.innerText))&&x.getBoundingClientRect().width>0);
        if(!b)return null;const rr=b.getBoundingClientRect();
        let ox=0,oy=0;try{const cur=window.frameElement;if(cur){const r2=cur.getBoundingClientRect();ox=r2.left;oy=r2.top;}}catch(e){}
        return {x:Math.round(rr.left+rr.width/2+ox),y:Math.round(rr.top+rr.height/2+oy),txt:(root.innerText||'').replace(/\\s+/g,' ').slice(0,80)};})()`, f.ctx).catch(() => null);
      if (c) { log("CONFIRM:", JSON.stringify(c)); await mouse(c.x + (f.url.includes("textbook") ? 0 : OX), c.y + (f.url.includes("textbook") ? 0 : OY)); hit = true; break; }
    }
    if (!hit) break;
    await sleep(1500);
  }
  await sleep(6000);
}
await shot(L, `utdiag-u${U}-post.png`);
const bodyTxt = await exEv(`document.body.innerText.replace(/\\s+/g,' ').slice(0,600)`).catch(() => "");
log("AFTER:", String(bodyTxt).slice(0, 300));
fs.writeFileSync(`utdiag-u${U}.txt`, String(bodyTxt));
cdp.close();
