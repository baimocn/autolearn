// do-unit.mjs <unit> — 打开该单元 Unit test，进到 exam 并导出题目
import { connect, sleep } from "./utlib.mjs";
import { CDP } from "./cdp.mjs";
import fs from "node:fs";

const U = Number(process.argv[2]);
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
const PREFIX = "#/course-v3:819008cfa01e0f2+xnkdxyy+20250801090513/courseware/";
const READER = "https://ucontent.unipus.cn/_ipublishpc_default/pc.html?cid=1837944375799767040&theme=3264FA&aitutorialId=34657&cloudCurriculaId=356008&strategyId=4793137&schoolId=9341&source=cloud&sourceCallBackUrl=https://uai.unipus.cn/app/cmgt/resource-detail/?backId=1793504265186&courseResourceId=20001221469";
const log = (...a) => console.log(...a);

const ver = await (await fetch("http://127.0.0.1:9222/json/version")).json();
const boot = await CDP.connect(ver.webSocketDebuggerUrl);
let targetId = process.env.REUSE;
if (!targetId) {
  const r = await boot.send("Target.createTarget", { url: READER + PREFIX + "u" + (process.env.BOOT || U) + "/" + (process.env.BOOTNODE || T.first) });
  targetId = r.targetId;
}
boot.close();
const L = await connect(targetId);
const { ev, frames, mouse } = L;

const findIframeQ = `(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));if(!f)return null;const r=f.getBoundingClientRect();return{ox:Math.round(r.left),oy:Math.round(r.top)};})()`;
let tbOff = null;
for (let i = 0; i < 40; i++) {
  tbOff = await ev(findIframeQ).catch(() => null);
  if (tbOff) break;
  await sleep(1000);
}
if (!tbOff) {
  const { data } = await L.cdp.send("Page.captureScreenshot", { format: "png" }, L.sessionId);
  fs.writeFileSync(`fail-U${U}-noiframe.png`, Buffer.from(data, "base64"));
  log("!! 阅读器里始终没有 ipub iframe（页面未加载完）");
  L.cdp.close(); process.exit(1);
}
log("tbOff:", JSON.stringify(tbOff));
await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));if(!f)return 0;f.src=${JSON.stringify(`https://ipub.unipus.cn/learner/textbook/book/${BOOK}/chapter/${T.ch}?bookVersionNumber=${BV}#${T.ut}`)};return 1;})()`);
await sleep(9000);

let tb = null;
for (let i = 0; i < 20; i++) {
  tb = (await frames()).find((f) => /textbook\/book/.test(f.url) && f.ctx);
  if (tb) break;
  await sleep(800);
}
if (!tb) { log("!! 无教材帧"); process.exit(1); }
log("tb:", tb.url.slice(55, 105));

const cardClk = `(()=>{const cs=[...document.querySelectorAll('[data-lexical-node-type="quiz-paper-link"]')];const c=cs.find(e=>{const b=e.getBoundingClientRect();return b.top>50&&b.bottom<720&&b.height>80;});if(!c)return null;const b=c.getBoundingClientRect();return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+70+${tbOff.oy}),r:[Math.round(b.left),Math.round(b.top),Math.round(b.width),Math.round(b.height)]};})()`;
const ackQ = (oy) => `(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='我知道了'&&e.getBoundingClientRect().width>20);if(!v.length)return null;const e=v[v.length-1];const b=e.getBoundingClientRect();return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2+${oy})};})()`;
const startQ = (oy) => `(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='开始答题'&&e.getBoundingClientRect().width>20);if(!v.length)return null;const e=v[v.length-1];const b=e.getBoundingClientRect();return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2+${oy})};})()`;

async function findAny(q) {
  for (const f of await frames()) {
    const oy = /textbook/.test(f.url) ? tbOff.oy : 0;
    const r = await ev(q(oy), f.ctx).catch(() => null);
    if (r) return { ...r, inFrame: f.url.slice(45, 70) };
  }
  return null;
}

// 1) 先处理可能出现的规则弹窗
for (let i = 0; i < 6; i++) {
  const a = await findAny(ackQ);
  if (a) { log("  我知道了 @", a.x, a.y, a.inFrame); await mouse(a.x, a.y); await sleep(1500); }
  else await sleep(700);
}

// 2) 点卡片，等“开始答题”或“再次作答”
let started = null;
for (let t = 0; t < 4 && !started; t++) {
  const card = await ev(cardClk, tb.ctx).catch(() => null);
  if (!card) { log("  无卡片"); break; }
  log("  click card", JSON.stringify(card));
  await mouse(card.x, card.y);
  for (let i = 0; i < 10; i++) {
    await sleep(900);
    const a = await findAny(ackQ);
    if (a) { await mouse(a.x, a.y); log("   mid 我知道了"); await sleep(1200); continue; }
    const s2 = await findAny(startQ);
    if (s2) { started = s2; break; }
    const r2 = await findAny((oy) => `(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='再次作答'&&e.getBoundingClientRect().width>20);if(!v.length)return null;const e=v[v.length-1];const b=e.getBoundingClientRect();return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2+${oy})};})()`);
    if (r2) { log("  已在成绩页，点再次作答"); await mouse(r2.x, r2.y); await sleep(2000); started = { x: -1 }; break; }
  }
}
if (!started) {
  const { data } = await L.cdp.send("Page.captureScreenshot", { format: "png" }, L.sessionId);
  fs.writeFileSync(`fail-U${U}.png`, Buffer.from(data, "base64"));
  log("!! 未出现开始答题/再次作答"); L.cdp.close(); process.exit(1);
}
if (started.x > 0) { log("开始答题 @", started.x, started.y, started.inFrame); await mouse(started.x, started.y); }

let exam = null;
for (let i = 0; i < 25; i++) {
  await sleep(1000);
  exam = (await frames()).find((f) => /testing\/(diagnosis|challenge)\/book/.test(f.url) && f.ctx && f.url.includes(T.paper));
  if (exam) break;
}
if (!exam) { log("!! exam 未出现"); L.cdp.close(); process.exit(1); }
let n = 0;
for (let i = 0; i < 20; i++) {
  n = await ev(`document.querySelectorAll('[class*=answer-question-box_questionItem]').length`, exam.ctx);
  if ((n || 0) >= 20) break;
  await sleep(1000);
}
log("questions:", n);

const qs = await ev(`(()=>{
  const norm=s=>(s||'').replace(/\\s+/g,' ').trim();
  return [...document.querySelectorAll('[class*=answer-question-box_questionItem]')].map((q,i)=>{
    const numEl=q.querySelector('[class*=i-question-number_i-question-number]');
    const stemEl=q.querySelector('[class*=q-question-stem_quesTextView]')||q.querySelector('[class*=answerView_quesTextView]');
    const rows=[...q.querySelectorAll('[class*=chioceView_strongListView]')].map(r=>norm(r.innerText));
    return {i, num:numEl?norm(numEl.innerText):String(i+1), stem:stemEl?norm(stemEl.innerText).slice(0,420):'', opts:rows, blank:!!q.querySelector('input,textarea')};
  });
})()`, exam.ctx);
fs.writeFileSync(`exam-U${U}.json`, JSON.stringify(qs, null, 1));
const m = JSON.parse(await ev(`JSON.stringify({v:${JSON.stringify("x")}} )`, exam.ctx).catch(() => "{}")) && null;
// 阅读文章
const paras = await ev(`(()=>{const ps=[...document.querySelectorAll('p')].map(e=>(e.innerText||'').trim()).filter(s=>s.length>150);return [...new Set(ps)];})()`, exam.ctx);
fs.writeFileSync(`passage-U${U}.txt`, (paras || []).join("\n\n"));
const body = String(await ev(`document.body.innerText`, exam.ctx) || "");
fs.writeFileSync(`u${U}-body.txt`, body);
fs.writeFileSync("ut-current.json", JSON.stringify({ U, targetId, examUrl: exam.url }));
log("saved exam-U" + U + ".json / passage-U" + U + ".txt");
log("targetId:", targetId);
L.cdp.close();
