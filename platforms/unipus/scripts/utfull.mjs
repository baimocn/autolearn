// utfull.mjs <unit> — 单元测试：进考场→猜答→交卷→读正确答案→再次作答→重交
import { CDP, sleep } from "./cdp.mjs";
import { connect } from "./utlib.mjs";
import { READER, COURSE } from "./reader.mjs";
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
const log = (...a) => console.log(`[ut${U}]`, ...a);
process.on("uncaughtException", (e) => log("uncaught:", String(e).slice(0, 110)));

const getVer = async () => (await fetch("http://127.0.0.1:9222/json/version")).json();
const getTabs = async () => (await fetch("http://127.0.0.1:9222/json/list")).json();

// 新标签进单元
const b0 = await CDP.connect((await getVer()).webSocketDebuggerUrl);
for (const t of (await getTabs()).filter(t => /ucontent\.unipus\.cn/.test(t.url))) await b0.send("Target.closeTarget", { targetId: t.id }).catch(() => {});
await sleep(800);
const r = await b0.send("Target.createTarget", { url: `${READER}#/${COURSE}/courseware/u${U}/${T.first}` });
b0.close();
await sleep(8000);
const L = await connect(r.targetId);
const { ev, frames, cdp, sessionId } = L;

// iframe 指到 UT 锚点（作者法：chapter#ut）
let tbOff = null;
for (let i = 0; i < 30; i++) {
  tbOff = await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));if(!f)return null;const rr=f.getBoundingClientRect();return{ox:Math.round(rr.left),oy:Math.round(rr.top)};})()`).catch(() => null);
  if (tbOff) break;
  await sleep(1000);
}
if (!tbOff) { log("no ipub iframe"); process.exit(1); }
await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));if(!f)return 0;f.src=${JSON.stringify(`https://ipub.unipus.cn/learner/textbook/book/${BOOK}/chapter/${T.ch}?bookVersionNumber=${BV}#${T.ut}`)};return 1;})()`);
await sleep(9000);
let tb = null;
for (let i = 0; i < 20; i++) { tb = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx); if (tb) break; await sleep(800); }
if (!tb) { log("no tb"); process.exit(1); }

const findAny = async (qgen) => {
  for (const f of await frames()) {
    const oy = /textbook/.test(f.url) ? tbOff.oy : 0;
    const rr = await ev(qgen(oy), f.ctx).catch(() => null);
    if (rr) return rr;
  }
  return null;
};
const ackQ = (oy) => `(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='我知道了'&&e.getBoundingClientRect().width>20);if(!v.length)return null;const e=v[v.length-1];const b=e.getBoundingClientRect();return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2+${oy})};})()`;
const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId).catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
};
for (let i = 0; i < 6; i++) {
  const a = await findAny(ackQ);
  if (a) { await mouse(a.x, a.y); await sleep(1200); } else await sleep(600);
}
// 点 UT 卡片
let started = null;
for (let t = 0; t < 4 && !started; t++) {
  const card = await ev(`(()=>{const cs=[...document.querySelectorAll('[data-lexical-node-type="quiz-paper-link"]')];const c=cs.find(e=>{const b=e.getBoundingClientRect();return b.top>50&&b.bottom<720&&b.height>80;});if(!c)return null;const b=c.getBoundingClientRect();return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+70+${tbOff.oy})};})()`, tb.ctx).catch(() => null);
  if (!card) { log("no card"); break; }
  await mouse(card.x, card.y);
  for (let i = 0; i < 10; i++) {
    await sleep(900);
    const a = await findAny(ackQ);
    if (a) { await mouse(a.x, a.y); await sleep(1100); continue; }
    const s2 = await findAny((oy) => `(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>/^(开始答题|再次作答)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>20);if(!v.length)return null;const e=v[v.length-1];const b=e.getBoundingClientRect();return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2+${oy}),t:n(e.innerText)};})()`);
    if (s2) { started = s2; break; }
  }
}
if (!started) { log("no start btn"); process.exit(1); }
log("enter exam:", JSON.stringify(started));
await mouse(started.x, started.y);
let exam = null;
for (let i = 0; i < 25; i++) {
  await sleep(1000);
  exam = (await frames()).find(f => /testing\/(diagnosis|challenge)\/book/.test(f.url) && f.ctx && f.url.includes(T.paper));
  if (exam) break;
}
if (!exam) { log("no exam frame"); process.exit(1); }
let n = 0;
for (let i = 0; i < 20; i++) {
  n = await ev(`document.querySelectorAll('[class*=answer-question-box_questionItem]').length`, exam.ctx).catch(() => 0);
  if ((n || 0) >= 10) break;
  await sleep(1000);
}
log("questions:", n);

const guessAll = () => ev(`(()=>{
  const norm=s=>(s||'').replace(/\\s+/g,' ').trim();
  const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];
  items.forEach(q=>{
    const rows=[...q.querySelectorAll('[class*=chioceView_strongListView]')];
    if(rows.length){rows[0].click();return;}
    const el=q.querySelector('input,textarea');
    if(el){const proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto,'value').set.call(el,'x');
      el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}
  });
  return items.length;})()`, exam.ctx);
const submitExam = async () => {
  // 找“提交/交卷”按钮（真鼠标，可能跨 iframe）
  for (let k = 0; k < 3; k++) {
    for (const f of await frames()) {
      const rr = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');
        const v=[...document.querySelectorAll('button,div,span')].filter(e=>/^(提交试卷|交卷|提交)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>40);
        if(!v.length)return null;const e=v[v.length-1];const b=e.getBoundingClientRect();
        const fr=[...window.top.document.querySelectorAll('iframe')];
        let oy=0,ox=0;try{const cur=window.frameElement;if(cur){const r2=cur.getBoundingClientRect();ox=r2.left;oy=r2.top;}}catch(err){}
        return {x:Math.round(b.left+b.width/2+ox),y:Math.round(b.top+b.height/2+oy)};})()`, f.ctx).catch(() => null);
      if (rr) { await mouse(rr.x, rr.y); await sleep(2500); return true; }
    }
    await sleep(1500);
  }
  return false;
};
const confirmOk = async () => {
  for (const f of await frames()) {
    const rr = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');
      const v=[...document.querySelectorAll('button,div,span')].filter(e=>/^(确认|确定)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>20);
      if(!v.length)return null;const e=v[v.length-1];const b=e.getBoundingClientRect();
      let oy=0,ox=0;try{const cur=window.frameElement;if(cur){const r2=cur.getBoundingClientRect();ox=r2.left;oy=r2.top;}}catch(err){}
      return {x:Math.round(b.left+b.width/2+ox),y:Math.round(b.top+b.height/2+oy)};})()`, f.ctx).catch(() => null);
    if (rr) { await mouse(rr.x, rr.y); await sleep(1800); return true; }
  }
  return false;
};
// —— 第一轮：猜答 ——
await guessAll();
await sleep(800);
await submitExam();
await confirmOk();
await sleep(6000);
// —— 读正确答案（多策略 + 诊断 dump）——
let examNow = exam;
for (let k = 0; k < 10; k++) {
  examNow = (await frames()).find(f => /testing\/(diagnosis|challenge)\/book/.test(f.url) && f.ctx);
  if (examNow) break;
  await sleep(1500);
}
const bodyText = await ev(`document.body.innerText`, examNow ? examNow.ctx : exam.ctx).catch(() => "");
fs.writeFileSync(`utresult-u${U}.txt`, String(bodyText || "").slice(0, 12000));
const keys = await ev(`(()=>{
  const norm=s=>(s||'').replace(/\\s+/g,' ').trim();
  const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];
  return items.map(q=>{
    let key=null;
    // 策略1：正确答案行
    const lines=(q.innerText||'').split('\\n').map(s=>norm(s));
    for(let i=0;i<lines.length;i++){
      const m2=/正确答案[:：]?\\s*([A-Za-z0-9].*)$/.exec(lines[i]);
      if(m2){key=m2[1];break;}
    }
    // 策略2：正确/答对高亮选项（class 含 right/correct/success/ans-right）
    if(!key){
      const rows=[...q.querySelectorAll('[class*=chioceView_strongListView],[class*=optionItem],[class*=strongListView]')];
      const hit=rows.find(r=>/right|correct|success|true/i.test(r.className.toString()));
      if(hit){key=norm(hit.innerText).slice(0,40);}
    }
    // 策略3：答案： 行
    if(!key){
      for(let i=0;i<lines.length;i++){
        if(/^答案[:：]/.test(lines[i])){key=lines[i].replace(/^答案[:：]/,'').trim();break;}
      }
    }
    return key;
  });})()`, examNow ? examNow.ctx : exam.ctx).catch(() => null);
log("keys:", JSON.stringify(keys));
fs.writeFileSync(`utkeys-u${U}.json`, JSON.stringify(keys, null, 1));

// —— 再次作答 → 按答案填 → 提交 ——
if (Array.isArray(keys) && keys.filter(Boolean).length) {
  const again = await findAny((oy) => `(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='再次作答'&&e.getBoundingClientRect().width>20);if(!v.length)return null;const e=v[v.length-1];const b=e.getBoundingClientRect();return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2+${oy})};})()`);
  if (again) { await mouse(again.x, again.y); await sleep(4000); }
  let ex2 = (await frames()).find(f => /testing\/(diagnosis|challenge)\/book/.test(f.url) && f.ctx);
  if (ex2) {
    await ev(`(()=>{
      const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];
      const ks=${JSON.stringify(keys)};
      items.forEach((q,i)=>{
        const key=ks[i]; if(!key)return;
        const rows=[...q.querySelectorAll('[class*=chioceView_strongListView]')];
        if(rows.length){const row=/^[A-H]$/.test(key)?rows[key.charCodeAt(0)-65]:rows.find(r=>(r.innerText||'').replace(/\\s+/g,' ').trim()===key);
          if(row)row.click();return;}
        const el=q.querySelector('input,textarea');
        if(el){const proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
          Object.getOwnPropertyDescriptor(proto,'value').set.call(el,key);
          el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}
      });
      return items.length;})()`, ex2.ctx).catch(() => null);
    await sleep(1000);
    await submitExam();
    await confirmOk();
    await sleep(5000);
  }
}
// 最终分数
const score = await ev(`(()=>{const t=document.body.innerText.replace(/\\s+/g,' ');return (t.match(/(得分|成绩|分数)[:：]?\\s*(\\d+(\\.\\d+)?)/)||[])[2]??null;})()`, exam.ctx).catch(() => null);
log("UT done, score≈", score);
fs.writeFileSync(`utdone-u${U}.json`, JSON.stringify({ score, keys }, null, 1));
cdp.close();
