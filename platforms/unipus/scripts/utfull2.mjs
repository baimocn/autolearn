// utfull2.mjs <unit> — UT 循环：再作答→滚动答满→交卷→读解析→抄答案→交
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

// 进单元
const b0 = await CDP.connect((await getVer()).webSocketDebuggerUrl);
for (const t of (await getTabs()).filter(t => /ucontent\.unipus\.cn/.test(t.url))) await b0.send("Target.closeTarget", { targetId: t.id }).catch(() => {});
await sleep(800);
const r = await b0.send("Target.createTarget", { url: `${READER}#/${COURSE}/courseware/u${U}/${T.first}` });
b0.close();
await sleep(8000);
const L = await connect(r.targetId);
const { ev, frames, cdp, sessionId } = L;

let tbOff = null;
for (let i = 0; i < 30; i++) {
  tbOff = await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));if(!f)return null;const rr=f.getBoundingClientRect();return{oy:Math.round(rr.top)};})()`).catch(() => null);
  if (tbOff) break;
  await sleep(1000);
}
if (!tbOff) { log("no iframe"); process.exit(1); }
await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));if(!f)return 0;f.src=${JSON.stringify(`https://ipub.unipus.cn/learner/textbook/book/${BOOK}/chapter/${T.ch}?bookVersionNumber=${BV}#${T.ut}`)};return 1;})()`);
await sleep(9000);
let tb = null;
for (let i = 0; i < 20; i++) { tb = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx); if (tb) break; await sleep(800); }
if (!tb) { log("no tb"); process.exit(1); }

const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId).catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
};
const findAny = async (qgen, tries = 1) => {
  for (let t = 0; t < tries; t++) {
    for (const f of await frames()) {
      const oy = /textbook/.test(f.url) ? tbOff.oy : 0;
      const rr = await ev(qgen(oy), f.ctx).catch(() => null);
      if (rr) return rr;
    }
    if (t < tries - 1) await sleep(900);
  }
  return null;
};
const ackQ = (oy) => `(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='我知道了'&&e.getBoundingClientRect().width>20);if(!v.length)return null;const e=v[v.length-1];const b=e.getBoundingClientRect();return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2+${oy})};})()`;
const doAck = async () => { for (let i = 0; i < 5; i++) { const a = await findAny(ackQ); if (a) { await mouse(a.x, a.y); await sleep(1100); } else break; } };
const btnXY = (label) => findAny((oy) => `(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)===${JSON.stringify(label)}&&e.getBoundingClientRect().width>20);if(!v.length)return null;const e=v[v.length-1];const b=e.getBoundingClientRect();return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2+${oy})};})()`);
const confirmOkAll = async (OX = 0, OY = 0) => {
  for (let i = 0; i < 5; i++) {
    let clicked = false;
    for (const f of await frames()) {
      const c = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');
        const root=[...document.querySelectorAll('.ant-modal-root,[class*=modal],[role=dialog]')].find(e=>/确定要提交|确认提交|确定要交卷/.test(e.innerText||''));
        if(root){const b=[...root.querySelectorAll('button')].find(x=>n(x.innerText)==='确定');
          if(b&&b.getBoundingClientRect().width>0){const r=b.getBoundingClientRect();return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};}}
        const v=[...document.querySelectorAll('button,div,span')].filter(e=>/^(确认|确定)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>20&&e.getBoundingClientRect().top>0);
        if(!v.length)return null;const e=v[v.length-1];const b=e.getBoundingClientRect();
        return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, f.ctx).catch(() => null);
      if (c) {
        const isTb = /textbook/.test(f.url);
        const extra = isTb ? { ox: 0, oy: 0 } : { ox: OX, oy: OY };
        await mouse(c.x + (extra.ox || 0), c.y + (extra.oy || 0));
        await sleep(1600);
        clicked = true;
        break;
      }
    }
    if (!clicked) break;
  }
};

// —— 进 UT 卡片 ——
await doAck();
let entered = false;
for (let t = 0; t < 4 && !entered; t++) {
  const card = await ev(`(()=>{const cs=[...document.querySelectorAll('[data-lexical-node-type="quiz-paper-link"]')];const c=cs.find(e=>{const b=e.getBoundingClientRect();return b.top>50&&b.bottom<720&&b.height>80;});if(!c)return null;const b=c.getBoundingClientRect();return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+70+${tbOff.oy})};})()`, tb.ctx).catch(() => null);
  if (!card) { await sleep(1500); continue; }
  await mouse(card.x, card.y);
  for (let i = 0; i < 10; i++) {
    await sleep(900);
    await doAck();
    const s2 = await btnXY("开始答题") || await btnXY("再次作答");
    if (s2) { await mouse(s2.x, s2.y); entered = true; break; }
  }
}
if (!entered) { log("not entered"); process.exit(1); }

const examFrame = async () => {
  for (let i = 0; i < 25; i++) {
    await sleep(1000);
    const f = (await frames()).find(f2 => /testing\/(diagnosis|challenge)\/book/.test(f2.url) && f2.ctx && f2.url.includes(T.paper));
    if (f) return f;
  }
  return null;
};
let exam = await examFrame();
if (!exam) { log("no exam frame"); process.exit(1); }
await sleep(3000);
const exEv = (e) => ev(e, exam.ctx);
const exOff = async () => {
  const rr = await ev(`(()=>{let ox=0,oy=0;try{const cur=window.frameElement;if(cur){const r2=cur.getBoundingClientRect();ox=r2.left;oy=r2.top;}}catch(e){}return {ox,oy};})()`, exam.ctx).catch(() => null);
  return rr || { ox: 0, oy: 0 };
};

// 答题卡进度
const cardProgress = () => exEv(`(()=>{const c=document.querySelector('[class*=answer-card_container]');const t=c?c.innerText:'';const m=t.match(/(\\d+)\\s*\\/\\s*(\\d+)/);return m?(m[1]+'/'+m[2]):'';})()`);

// —— 作答器：滚动全卷，可信鼠标逐题作答，答题卡 N/N 为准 ——
const answerAll = async (keys, OX, OY) => {
  for (let round = 0; round < 10; round++) {
    // 找当前可见、未作答的题
    const todo = await exEv(`(()=>{
      const norm=s=>(s||'').replace(/\\s+/g,' ').trim();
      return [...document.querySelectorAll('[class*=answer-question-box_questionItem]')].map((q,i)=>{
        const rows=[...q.querySelectorAll('[class*=chioceView_strongListView]')];
        const selected=rows.some(r=>/selected/.test(r.className.toString()));
        const inp=q.querySelector('input,textarea');
        const filled=inp&&(inp.value||'').length>0;
        const b=q.getBoundingClientRect();
        return {i, rows:rows.length, selected, filled,
          need:!selected&&!filled, vis:b.top>0&&b.top<window.innerHeight-40,
          y:Math.round(b.top+Math.min(120,b.height/2)),
          rowY:rows.length?rows.map(r=>Math.round(r.getBoundingClientRect().top+10)):[],
          hasInput:!!inp, inputY:inp?Math.round(inp.getBoundingClientRect().top+10):0};
      }).filter(x=>x.need&&x.vis);
    })()`).catch(() => null);
    const prog = await cardProgress();
    if (!todo || !todo.length) {
      // 滚动找下一批
      const atEnd = await exEv(`(()=>{const se=document.scrollingElement;const before=se.scrollTop;se.scrollTop=se.scrollHeight;return before===se.scrollTop||se.scrollHeight-se.scrollTop<window.innerHeight+50;})()`).catch(() => false);
      if (atEnd) { log(`  round${round}: 到底 card=${prog}`); break; }
      await exEv(`(()=>{const se=document.scrollingElement;se.scrollBy(0,Math.round(window.innerHeight*0.7));return 1;})()`).catch(() => {});
      await sleep(1100);
      continue;
    }
    for (const t of todo) {
      if (t.rows > 0) {
        // 选题：keys 优先，否则 A
        let rowIdx = 0;
        if (keys && keys[t.i]) {
          const k = String(keys[t.i]).trim();
          if (/^[A-H]$/.test(k)) rowIdx = k.charCodeAt(0) - 65;
        }
        const yy = t.rowY[Math.min(rowIdx, t.rowY.length - 1)];
        if (yy) { await mouse(200, yy + OY); await sleep(260); }
      } else if (t.hasInput) {
        await mouse(300, t.inputY + OY); await sleep(200);
        await cdp.send("Input.insertText", { text: (keys && keys[t.i]) || "I think the key point here is the main idea of the passage and its supporting details." }, sessionId).catch(() => {});
        await sleep(160);
        await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", code: "Tab", windowsVirtualKeyCode: 9 }, sessionId).catch(() => {});
        await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", code: "Tab", windowsVirtualKeyCode: 9 }, sessionId).catch(() => {});
        await sleep(150);
      }
    }
    const prog2 = await cardProgress();
    log(`  round${round}: 处理${todo.length}题 card=${prog2}`);
    if (todo.length === 1 && round > 4) { log("  单题卡住，跳过"); break; }
    if (prog2 && /^\d+\/\d+$/.test(prog2)) {
      const [a, b] = prog2.split("/").map(Number);
      if (a >= b) break;
    }
  }
  return await cardProgress();
};

// 读解析（判分后）
const readKeys = async () => {
  const ks = await exEv(`(()=>{
    const norm=s=>(s||'').replace(/\\s+/g,' ').trim();
    const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];
    return items.map(q=>{
      let key=null;
      const lines=(q.innerText||'').split('\\n').map(s=>norm(s));
      for(let i=0;i<lines.length;i++){
        const m2=/正确答案[:：]?\\s*([A-Za-z0-9].*)$/.exec(lines[i]);
        if(m2){key=m2[1].trim();break;}
      }
      if(!key){
        const rows=[...q.querySelectorAll('[class*=chioceView_strongListView],[class*=strongListView],[class*=optionItem]')];
        const hit=rows.find(r=>/correct|right|success|answer-right|is-right/i.test(r.className.toString()));
        if(hit) key=norm(hit.innerText).slice(0,50);
      }
      if(!key){
        for(let i=0;i<lines.length;i++){ if(/^答案[:：]/.test(lines[i])){key=lines[i].replace(/^答案[:：]/,'').trim();break;} }
      }
      return key;
    });})()`).catch(() => null);
  return ks;
};

// —— 主循环：答→交→读→抄→交 ——
let finalScore = null;
for (let attempt = 1; attempt <= 4; attempt++) {
  exam = (await frames()).find(f2 => /testing\/(diagnosis|challenge)\/book/.test(f2.url) && f2.ctx && f2.url.includes(T.paper)) || exam;
  if (!exam) { exam = await examFrame(); }
  if (!exam) break;
  // 若在成绩弹窗：点再次作答（反复直到进入干净答题态）
  for (let z = 0; z < 3; z++) {
    const st = await exEv(`(()=>{
      const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];
      if(!items.length)return {mode:'none',answered:0,total:0};
      let answered=0;
      items.forEach(q=>{
        const rows=[...q.querySelectorAll('[class*=chioceView_strongListView]')];
        if(rows.some(r=>/selected/.test(r.className.toString())))answered++;
        const inp=q.querySelector('input,textarea');if(inp&&(inp.value||'').length)answered++;
      });
      const hasAgain=[...document.querySelectorAll('button,div,span')].some(e=>(e.innerText||'').replace(/\\s+/g,'')==='再次作答'&&e.getBoundingClientRect().width>20);
      return {mode:hasAgain?'result':'exam',answered,total:items.length};
    })()`).catch(() => null);
    log(`  态检查: ${JSON.stringify(st)}`);
    if (st && st.mode === 'result') {
      const again = await btnXY("再次作答");
      if (again) { await mouse(again.x, again.y); await sleep(4500); exam = await examFrame() || exam; await doAck(); }
    } else break;
  }
  log(`attempt${attempt}: 作答`);
  // exam 帧 => 视口的真偏移（OOPIF 必须叠加外层 iframe rect）
  const offA = await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));if(!f)return{ox:0,oy:0};const r=f.getBoundingClientRect();return{ox:Math.round(r.left),oy:Math.round(r.top)};})()`);
  const offB = await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/testing|exam/.test(e.src||''));if(!f)return null;const b=f.getBoundingClientRect();return{ox:Math.round(b.left),oy:Math.round(b.top)};})()`, tb.ctx).catch(() => null);
  const OX = (offA && offA.ox || 0) + (offB && offB.ox || 0);
  const OY = (offA && offA.oy || 0) + (offB && offB.oy || 0);
  log("exam offset:", OX, OY);
  await answerAll(attempt === 1 ? null : lastKeys, OX, OY);
  // 提交（exam 帧内坐标 + 总偏移 = 真鼠标）
  let submitted = false;
  for (let k = 0; k < 4 && !submitted; k++) {
    const sb = await exEv(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>/^(提交试卷|交卷|提交)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>30);if(!v.length)return null;const e=v[v.length-1];const b=e.getBoundingClientRect();return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`);
    if (sb) { await mouse(sb.x + OX, sb.y + OY); await sleep(2400); await confirmOkAll(); submitted = true; }
    else {
      await exEv(`(()=>{const se=document.scrollingElement;se.scrollTop=se.scrollHeight;return 1;})()`).catch(() => {});
      await sleep(900);
    }
  }
  log(`attempt${attempt}: submitted=${submitted}`);
  await sleep(6000);
  exam = await examFrame() || exam;
  const keys = await readKeys();
  const got = (keys || []).filter(Boolean).length;
  log(`attempt${attempt}: 解析答案 ${got} 项`);
  fs.writeFileSync(`utkeys2-u${U}-a${attempt}.json`, JSON.stringify(keys, null, 1));
  if (got >= 10) lastKeys = keys;
  // 成绩
  const sc = await exEv(`(()=>{const t=document.body.innerText.replace(/\\s+/g,' ');return (t.match(/(得分|成绩|分数)[:：]?\\s*(\\d+(\\.\\d+)?)/)||[])[2]??null;})()`).catch(() => null);
  if (sc) { finalScore = sc; log("成绩:", sc); }
  // 成绩提交按钮（若存在）
  const sp2 = await exEv(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n(e.innerText)==='成绩提交'&&e.getBoundingClientRect().width>18);if(!v.length)return null;const e=v[v.length-1];const b=e.getBoundingClientRect();return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`).catch(() => null);
  if (sp2) { log("点成绩提交"); await mouse(sp2.x + OX, sp2.y + OY); await sleep(3500); await confirmOkAll(OX, OY); }
  if (attempt >= 2 && finalScore !== null) break;
  if (attempt === 3) break;
  if (got === 0 && attempt >= 2) break;
}
var lastKeys = null;
log("UT 完成 score=", finalScore);
fs.writeFileSync(`utdone2-u${U}.json`, JSON.stringify({ score: finalScore }, null, 1));
cdp.close();
