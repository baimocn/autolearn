// 探针：进 UT1 考场，dump 按钮与答题卡结构
import { CDP, sleep } from "./cdp.mjs";
import { connect } from "./utlib.mjs";
import { READER, COURSE } from "./reader.mjs";
import fs from "node:fs";
const T = { 1: { ch: "7840f299-1cce-403e-9320-d6ddf613cebf", ut: "r9Bp9I6D7fWBbMQx", first: "u1g1", paper: "ARpEPuQb6dbje2Rt" } }[1];
const BOOK = (await import("./config.mjs")).BOOK, BV = "VTqvEEI";
const log = (...a) => console.log("[probe]", ...a);
const ver = await (await fetch("http://127.0.0.1:9222/json/version")).json();
const boot = await CDP.connect(ver.webSocketDebuggerUrl);
const tabs0 = await (await fetch("http://127.0.0.1:9222/json/list")).json();
for (const t of tabs0.filter(t => /ucontent\.unipus\.cn/.test(t.url))) await boot.send("Target.closeTarget", { targetId: t.id }).catch(() => {});
await sleep(800);
const r = await boot.send("Target.createTarget", { url: `${READER}#/${COURSE}/courseware/u1/${T.first}` });
boot.close();
await sleep(8000);
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
const findAny = async (qgen) => {
  for (const f of await frames()) {
    const oy = /textbook/.test(f.url) ? tbOff.oy : 0;
    const rr = await ev(qgen(oy), f.ctx).catch(() => null);
    if (rr) return rr;
  }
  return null;
};
const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId).catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
};
for (let i = 0; i < 6; i++) {
  const a = await findAny((oy) => `(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='我知道了'&&e.getBoundingClientRect().width>20);if(!v.length)return null;const e=v[v.length-1];const b=e.getBoundingClientRect();return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2+${oy})};})()`);
  if (a) { await mouse(a.x, a.y); await sleep(1200); } else await sleep(600);
}
for (let t = 0; t < 4; t++) {
  const card = await ev(`(()=>{const cs=[...document.querySelectorAll('[data-lexical-node-type="quiz-paper-link"]')];const c=cs.find(e=>{const b=e.getBoundingClientRect();return b.top>50&&b.bottom<720&&b.height>80;});if(!c)return null;const b=c.getBoundingClientRect();return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+70+${tbOff.oy})};})()`, tb.ctx).catch(() => null);
  if (!card) break;
  await mouse(card.x, card.y);
  let started = null;
  for (let i = 0; i < 10; i++) {
    await sleep(900);
    const a2 = await findAny((oy) => `(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='我知道了'&&e.getBoundingClientRect().width>20);if(!v.length)return null;const e=v[v.length-1];const b=e.getBoundingClientRect();return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2+${oy})};})()`);
    if (a2) { await mouse(a2.x, a2.y); await sleep(1100); continue; }
    const s2 = await findAny((oy) => `(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>/^(开始答题|再次作答)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>20);if(!v.length)return null;const e=v[v.length-1];const b=e.getBoundingClientRect();return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2+${oy})};})()`);
    if (s2) { started = s2; break; }
  }
  if (started) { await mouse(started.x, started.y); break; }
}
let exam = null;
for (let i = 0; i < 25; i++) {
  await sleep(1000);
  exam = (await frames()).find(f => /testing\/(diagnosis|challenge)\/book/.test(f.url) && f.ctx && f.url.includes(T.paper));
  if (exam) break;
}
if (!exam) { log("no exam"); process.exit(1); }
await sleep(4000);
// dump all button-like elements in exam frame
const btns = await ev(`(()=>{
  const out=[];
  [...document.querySelectorAll('button,[class*=i-button],[class*=btn],[class*=submit],[class*=hand],[class*=card],[class*=next],[class*=nav]')].forEach(e=>{
    const b=e.getBoundingClientRect();
    if(b.width<=0)return;
    out.push({t:(e.innerText||'').replace(/\\s+/g,' ').slice(0,20),tag:e.tagName,cls:(e.className||'').toString().slice(0,56),x:Math.round(b.left),y:Math.round(b.top),w:Math.round(b.width),h:Math.round(b.height)});
  });
  return out.slice(0,40);})()`, exam.ctx).catch(() => null);
console.log("EXAM BTNS:", JSON.stringify(btns, null, 1).slice(0, 3500));
// icon-only: svgs inside clickable
const icons = await ev(`(()=>{
  const out=[];
  [...document.querySelectorAll('svg')].forEach(s=>{
    const p=s.closest('button,div,span');
    if(!p)return;
    const b=p.getBoundingClientRect();
    if(b.width<=0||b.width>120)return;
    const rk=Object.keys(p).find(k=>k.startsWith('__reactProps'));
    out.push({cls:(p.className||'').toString().slice(0,50),w:Math.round(b.width),h:Math.round(b.height),x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),click:rk?!!p[rk].onClick:null});
  });
  return out.slice(0,20);})()`, exam.ctx).catch(() => null);
console.log("ICONS:", JSON.stringify(icons, null, 1).slice(0, 2000));
cdp.close();
