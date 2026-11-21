// ut-score-submit.mjs <unit> — 打开成绩弹窗→点“成绩提交”→核验
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
const log = (...a) => console.log(`[uts${U}]`, ...a);
const b0 = await CDP.connect((await (await fetch("http://127.0.0.1:9222/json/version")).json()).webSocketDebuggerUrl);
for (const t of (await (await fetch("http://127.0.0.1:9222/json/list")).json()).filter(t => /ucontent\.unipus\.cn/.test(t.url))) await b0.send("Target.closeTarget", { targetId: t.id }).catch(() => {});
await sleep(800);
const r = await b0.send("Target.createTarget", { url: `${READER}#/${COURSE}/courseware/u${U}/${T.first}` });
b0.close();
await sleep(11000);
const L = await connect(r.targetId);
const { ev, frames, cdp, sessionId } = L;
let tbOff = null;
for (let i = 0; i < 30; i++) { tbOff = await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));if(!f)return null;const rr=f.getBoundingClientRect();return{oy:Math.round(rr.top)};})()`).catch(() => null); if (tbOff) break; await sleep(1000); }
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
// 进 UT 卡片
for (let t = 0; t < 4; t++) {
  const card = await ev(`(()=>{const cs=[...document.querySelectorAll('[data-lexical-node-type="quiz-paper-link"]')];const c=cs.find(e=>{const b=e.getBoundingClientRect();return b.top>50&&b.bottom<720&&b.height>80;});if(!c)return null;const b=c.getBoundingClientRect();return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+70+${tbOff.oy})};})()`, tb.ctx).catch(() => null);
  if (!card) break;
  await mouse(card.x, card.y);
  let started = false;
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
for (let i = 0; i < 25; i++) { await sleep(1000); exam = (await frames()).find(f => /testing\/(diagnosis|challenge)\/book/.test(f.url) && f.ctx); if (exam) break; }
if (!exam) { log("no exam"); process.exit(1); }
await sleep(4000);
const exEv = (e) => ev(e, exam.ctx);
// 结果态才有“查看测试结果”
let opened = await exEv(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const el=[...document.querySelectorAll('[class*=i-button_default-container]')].find(e=>n(e.innerText)==='查看测试结果');if(!el)return 0;el.click();return 1;})()`);
log("查看测试结果 clicked:", opened);
if (!opened) {
  // 尝试文字匹配任意元素
  opened = await exEv(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const el=[...document.querySelectorAll('div,span,button')].find(e=>n(e.innerText)==='查看测试结果');if(!el)return 0;el.click();return 1;})()`);
  log("retry click:", opened);
}
await sleep(3500);
// 弹窗内所有按钮
const dlgBtns = await exEv(`(()=>{
  const d=[...document.querySelectorAll('[class*=dialog],[class*=modal],[class*=result]')].find(e=>e.getBoundingClientRect().height>120);
  if(!d)return {none:1};
  return {text:(d.innerText||'').replace(/\\s+/g,' ').slice(0,900),
    btns:[...d.querySelectorAll('button,[class*=i-button]')].map(b=>({t:(b.innerText||'').replace(/\\s+/g,'').slice(0,16),w:Math.round(b.getBoundingClientRect().width),x:Math.round(b.getBoundingClientRect().left+b.getBoundingClientRect().width/2),y:Math.round(b.getBoundingClientRect().top+b.getBoundingClientRect().height/2)})).filter(x=>x.t&&x.w>10)};
})()`);
log("DLG:", JSON.stringify(dlgBtns).slice(0, 1500));
// 点“成绩提交”（若有）
if (dlgBtns && dlgBtns.btns) {
  const sb = dlgBtns.btns.find(b => /成绩提交/.test(b.t));
  if (sb) {
    const offA = await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));if(!f)return{ox:0,oy:0};const rr=f.getBoundingClientRect();return{ox:Math.round(rr.left),oy:Math.round(rr.top)};})()`);
    const offB = await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/testing|exam/.test(e.src||''));if(!f)return null;const b=f.getBoundingClientRect();return{ox:Math.round(b.left),oy:Math.round(b.top)};})()`, tb.ctx).catch(() => null);
    await mouse(sb.x + (offA.ox || 0) + (offB && offB.ox || 0), sb.y + (offA.oy || 0) + (offB && offB.oy || 0));
    log("clicked 成绩提交");
    await sleep(3500);
    const fin = await exEv(`(()=>{const d=[...document.querySelectorAll('[class*=dialog],[class*=modal]')].find(e=>e.getBoundingClientRect().height>80);return d?d.innerText.replace(/\\s+/g,' ').slice(0,300):'closed';})()`);
    log("after:", fin);
  } else log("弹窗内无 成绩提交 按钮");
}
fs.writeFileSync(`utscore-u${U}.json`, JSON.stringify(dlgBtns, null, 1));
cdp.close();
