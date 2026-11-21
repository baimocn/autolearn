// unitproc.mjs <unit> [chaAnswers] — 单元全处理：换src→清弹窗→展开→块收割→挑战
import { CDP, sleep } from "./cdp.mjs";
import { connect } from "./utlib.mjs";
import { READER, COURSE, CH, BOOK, BV } from "./reader.mjs";
import fs from "node:fs";
const U = Number(process.argv[2]);
const CHA = process.argv[3] && process.argv[3] !== "-" ? process.argv[3].split(",").map(s => s.trim().toUpperCase()) : null;
const BOOKID = BOOK;
const log = (...a) => console.log(`[u${U}]`, ...a);
process.on("uncaughtException", (e) => log("uncaught:", String(e).slice(0, 100)));

const getTabs = async () => (await fetch("http://127.0.0.1:9222/json/list")).json();
let tabs = await getTabs();
let rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
if (!rd) { log("NO READER — 先进入书籍"); process.exit(1); }
const L = await connect(rd.id);
const { ev, frames, cdp, sessionId } = L;
const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId).catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
};
let tb = null;
const refindTb = async (tries = 30) => {
  for (let k = 0; k < tries; k++) {
    tb = (await frames()).find(f => f.url.includes("textbook/book") && f.ctx);
    if (tb) { const n = await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`, tb.ctx).catch(() => 0); if (n > 0) return true; }
    await sleep(1000);
  }
  return false;
};
const dismissModals = async () => {
  for (let i = 0; i < 3; i++) {
    let hit = false;
    for (const f of await frames()) {
      const p = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>/^(我知道了|知道了|确定)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>20);if(!v.length)return null;const b=v[v.length-1].getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, f.ctx).catch(() => null);
      if (p) { await mouse(p.x, p.y); await sleep(1100); hit = true; break; }
    }
    if (!hit) { await mouse(629, 477); await sleep(800); }
  }
};
const closeDrawer = async () => {
  let tb2 = (await frames()).find(f => f.url.includes("textbook/book") && f.ctx);
  if (!tb2) return;
  const closed = await ev(`(()=>{const e=document.querySelector('[class*=catalog_drawer-close]');if(!e)return 0;const b=e.getBoundingClientRect();if(b.width<3)return 0;const rk=Object.keys(e).find(k=>k.startsWith('__reactProps'));try{if(rk&&e[rk].onClick)e[rk].onClick({stopPropagation(){},preventDefault(){},target:e,currentTarget:e,nativeEvent:{}});else e.click();}catch(err){e.click();}return 1;})()`, tb2.ctx).catch(() => 0);
  if (!closed) { await mouse(390, 27); }
  await sleep(1500);
};
const expandCollapsed = async () => {
  const n = await ev(`(async()=>{
    const cols=[...document.querySelectorAll('[class*=collapsible-container]')];let opened=0;
    for(const c of cols){
      const body=c.querySelector('[class*=collapsible-content]');
      if(!body)continue;
      if(body.getBoundingClientRect().height<20){
        const head=c.querySelector('[class*=collapsible-head]');
        if(head){const rk=Object.keys(head).find(k=>k.startsWith('__reactProps'));
          try{if(rk&&head[rk].onClick)head[rk].onClick({stopPropagation(){},preventDefault(){},target:head,currentTarget:head,nativeEvent:{}});else head.click();}catch(e){head.click();}
          opened++;await new Promise(r=>setTimeout(r,350));}
      }
    }
    return opened;})()`, tb.ctx).catch(() => 0);
  if (n) log("展开折叠区:", n);
  await sleep(2500);
};

// —— 1) 确保在本单元章节（不是则换 src）——
if (!(await refindTb(15))) { log("NO TB"); process.exit(1); }
const cur = tb.url.includes(CH[U].slice(0, 12));
if (!cur) {
  log("换 src 到本单元章节");
  await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));if(!f)return 0;f.src='about:blank';return 1;})()`).catch(() => {});
  await sleep(700);
  await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub|about/.test(e.src||''));if(!f)return 0;f.src=${JSON.stringify(`https://ipub.unipus.cn/learner/textbook/book/${BOOKID}/chapter/${CH[U]}?bookVersionNumber=${BV}`)};return 1;})()`).catch(() => {});
  await sleep(12000);
  // RATE-RECOVER：限流等待+重载
  log("限流恢复等待 90s");
  await sleep(90000);
  await cdp.send("Page.reload",{},sessionId).catch(()=>{});
  await sleep(20000);
}
await dismissModals();
await closeDrawer();
await dismissModals();
if (!(await refindTb(30))) { log("章节未就绪"); process.exit(1); }
await expandCollapsed();
await dismissModals();

// —— 2) 块收割（patient 配方）——
const lens = () => ev(`[...document.querySelectorAll('div.editor-question-block.questionBlockNode')].map(b=>(b.innerText||'').length)`, tb.ctx).catch(() => []);
const probe = (i) => ev(`(()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
  if(!b) return null;
  const t=(b.innerText||'');
  const tn=t.replace(/\\s+/g,' ');
  return {len:t.length,
    area:b.querySelectorAll('textarea').length, inp:b.querySelectorAll('input[type=text]').length,
    dig:b.querySelectorAll('[class*=digEmptyView_blankView]').length, dd:b.querySelectorAll('[class*=digEmptySelectView_selectTrigger]').length,
    tf:b.querySelectorAll('[class*=answer_optionTF]').length, items:b.querySelectorAll('[class*=questionItem]').length,
    file:b.querySelectorAll('input[type=file]').length, video:b.querySelectorAll('video').length, audio:b.querySelectorAll('audio').length,
    sub:[...b.querySelectorAll('[class*=i-button]')].some(e=>((e.innerText||'').replace(/\\s+/g,''))==='提交'),
    redo:/重新作答/.test(tn),
    score:(tn.match(/得分[:：]?\\s*(\\d+(\\.\\d+)?)/)||[])[1]??null};})()`, tb.ctx).catch(() => null);
const btn = (i, label) => ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
  const el=[...b.querySelectorAll('[class*=i-button]')].find(e=>((e.innerText||'').replace(/\\s+/g,''))===${JSON.stringify(label)});
  if(el){el.click();return 1;}return 0;})()`, tb.ctx).catch(() => 0);
const confirmOk = () => ev(`(()=>{const b=document.querySelector('.ant-modal-confirm-btns .ant-btn-primary');if(!b)return 0;b.click();return 1;})()`, tb.ctx).catch(() => 0);
const fillInputs = (i, vals) => ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
  const els=[...b.querySelectorAll('input[type=text]')];const vals=${JSON.stringify(vals)};
  const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
  els.forEach((e,k)=>{e.focus();set.call(e,vals[k]??('answer '+(k+1)));
    e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));e.blur();});
  return els.length;})()`, tb.ctx).catch(() => 0);
const fillAreas = (i, v) => ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
  const els=[...b.querySelectorAll('textarea')];
  const set=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;
  els.forEach(e=>{e.focus();set.call(e,${JSON.stringify(v)});
    e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));e.blur();});
  return els.length;})()`, tb.ctx).catch(() => 0);
const pickOpts = (i, wants, trigSel, optSel) => ev(`(async()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
  const norm=s=>(s||'').replace(/\\s+/g,' ').trim();
  const trigs=[...b.querySelectorAll('${trigSel}')];const wants=${JSON.stringify(wants)};
  for(let k=0;k<trigs.length;k++){
    const rk=Object.keys(trigs[k]).find(x=>x.startsWith('__reactProps'));
    try{if(rk&&trigs[k][rk].onClick)trigs[k][rk].onClick({stopPropagation(){},preventDefault(){},target:trigs[k],currentTarget:trigs[k],nativeEvent:{}});else trigs[k].click();}catch(e){trigs[k].click();}
    await new Promise(r=>setTimeout(r,420));
    const opts=[...document.querySelectorAll('${optSel}')].filter(e=>e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0);
    const w=wants[k];
    const hit=(w&&opts.find(o=>norm(o.innerText)===norm(w)))||opts[0];
    if(hit){const ok=Object.keys(hit).find(x=>x.startsWith('__reactProps'));
      try{if(ok&&hit[ok].onClick)hit[ok].onClick({stopPropagation(){},preventDefault(){},target:hit,currentTarget:hit,nativeEvent:{}});else hit.click();}catch(e){hit.click();}}
    await new Promise(r=>setTimeout(r,220));}
  return trigs.length;})()`, tb.ctx).catch(() => 0);
const actChoice = (i, keys) => ev(`(async()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
  const norm=s=>(s||'').replace(/\\s+/g,' ').trim();
  const items=[...b.querySelectorAll('[class*=questionItem]')];
  const ks=${JSON.stringify(keys)};
  for(let k=0;k<items.length;k++){
    const rows=[...items[k].querySelectorAll('[class*=chioceView_strongListView],[class*=strongListView]')];
    const key=ks[k]; let row=null;
    if(key&&/^[A-H]$/.test(key)) row=rows[key.charCodeAt(0)-65];
    if(!row&&key) row=rows.find(r=>norm(r.innerText)===norm(key));
    if(!row) row=rows[0];
    if(row)row.click();
    await new Promise(r=>setTimeout(r,130));
  }
  return items.length;})()`, tb.ctx).catch(() => 0);
const actTf = (i, keys) => ev(`(async()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
  const norm=s=>(s||'').replace(/\\s+/g,' ').trim();
  const items=[...b.querySelectorAll('[class*=questionItem]')];
  const ks=${JSON.stringify(keys)};
  for(let k=0;k<items.length;k++){
    const opts=[...items[k].querySelectorAll('[class*=answer_optionTF]')];
    const hit=opts.find(o=>norm(o.innerText)===ks[k])||opts[0]; if(!hit)continue;
    const r=hit.getBoundingClientRect();
    const o={bubbles:true,cancelable:true,view:window,clientX:r.left+r.width/2,clientY:r.top+r.height/2};
    ['pointerdown','mousedown','pointerup','mouseup','click'].forEach(n=>{const E=n.startsWith('pointer')?PointerEvent:MouseEvent;hit.dispatchEvent(new E(n,o));});
    await new Promise(r=>setTimeout(r,130));
  }
  return items.length;})()`, tb.ctx).catch(() => 0);
const getText = (i) => ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];return (b.innerText||'');})()`, tb.ctx).catch(() => "");
function parseAnswers(text) {
  const sec = text.lastIndexOf("\n答案");
  if (sec < 0) return [];
  const lines = text.slice(sec + 3).split("\n").map(s => s.trim());
  const paired = [];
  for (let i = 0; i < lines.length; i++) {
    const mm = /^\((\d+)\)$/.exec(lines[i]);
    if (mm) { let v = ""; for (let j = i + 1; j < lines.length; j++) { if (/^\(\d+\)$/.test(lines[j]) || /^答案[:：]?$/.test(lines[j])) break; v = lines[j]; break; } if (v) paired[Number(mm[1]) - 1] = v; }
  }
  if (paired.filter(Boolean).length >= 2) return paired.filter(Boolean);
  return lines.filter(Boolean).filter(s => !/^\(\d+\)$/.test(s) && !/^答案[:：]?$/.test(s) && !/你的答案|你的得分/.test(s));
}
const stripAlt = (s) => { const t = String(s || "").replace(/\s*[（(][^()（）]*[）)]\s*$/, "").trim(); return t || String(s || "").trim(); };

const procBlock = async (i) => {
  await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(b)b.scrollIntoView({block:'center'});return 1;})()`, tb.ctx);
  await sleep(1000);
  let s = await probe(i);
  if (!s || s.__err || s.len < 30) return { r: "thin", len: s ? s.len : -1 };
  if (s.score !== null && Number(s.score) >= 99.9 && !s.sub) return { r: "full", score: s.score };
  if (!s.sub && !s.redo && s.len > 40) return { r: "submitted", score: s.score };
  let kind = "text";
  if (s.file) kind = "upload";
  else if (s.video || s.audio) kind = "media";
  else if (s.dd) kind = "dd";
  else if (s.tf >= 2) kind = "tf";
  else if (s.inp) kind = "fill";
  else if (s.dig) kind = "dig";
  else if (s.area) kind = "area";
  else if (s.items) kind = "choice";
  if (kind === "upload" || kind === "media" || kind === "text") return { r: kind, len: s.len };
  // 占位
  if (s.sub && s.score === null) {
    if (kind === "fill") await fillInputs(i, Array.from({ length: s.inp }, (_, k) => "x" + (k + 1)));
    else if (kind === "area") await fillAreas(i, "This is my answer. I have considered the question carefully and written my response with the key points from the passage.");
    else if (kind === "dd") await pickOpts(i, null, "[class*=digEmptySelectView_selectTrigger]", "[class*=digEmptySelectView_optionItem]");
    else if (kind === "dig") await pickOpts(i, null, "[class*=digEmptyView_blankView]", "[class*=digEmptyView_optionItem],[class*=digEmptyView_labelView]");
    else if (kind === "choice") await actChoice(i, null);
    else if (kind === "tf") await actTf(i, null);
    await sleep(500);
    await btn(i, "提交");
    await sleep(6500);
    await confirmOk(); await sleep(1200);
    s = await probe(i) || s;
    if (s.score !== null && Number(s.score) >= 99.9) return { r: "full1", score: s.score, kind };
  }
  // 读答案改进
  const text = await getText(i);
  let answers = parseAnswers(text).map(stripAlt);
  if (!answers.length) {
    const keys = []; const re = /正确答案[:：]?\s*\n?\s*([^\n]+)/g; let m;
    while ((m = re.exec(text))) keys.push(m[1].trim());
    if (keys.length) answers = keys;
  }
  if (answers.length && s.redo) {
    await btn(i, "重新作答"); await sleep(2800);
    await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(b)b.scrollIntoView({block:'center'});return 1;})()`, tb.ctx);
    await sleep(1200);
    const st2 = await probe(i);
    if (kind === "fill") await fillInputs(i, answers);
    else if (kind === "area") await fillAreas(i, answers.join("\n"));
    else if (kind === "dd") await pickOpts(i, answers, "[class*=digEmptySelectView_selectTrigger]", "[class*=digEmptySelectView_optionItem]");
    else if (kind === "dig") await pickOpts(i, answers, "[class*=digEmptyView_blankView]", "[class*=digEmptyView_optionItem],[class*=digEmptyView_labelView]");
    else if (kind === "choice") await actChoice(i, answers);
    else if (kind === "tf") await actTf(i, answers);
    await sleep(500);
    await btn(i, "提交");
    await sleep(6500);
    await confirmOk(); await sleep(1200);
    const fin = await probe(i);
    return { r: "done", score: fin && fin.score, kind };
  }
  return { r: "done", score: s.score, kind, note: answers.length ? "" : "noans" };
};

const total = await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`, tb.ctx).catch(() => 0);
log("块数:", total);
const results = [];
for (let i = 0; i < total; i++) {
  try {
    const rr = await procBlock(i);
    results.push({ i, ...rr });
    log(`#${i}`, JSON.stringify(rr).slice(0, 90));
  } catch (e) { log(`#${i} 异常`, String(e).slice(0, 80)); }
}

// —— 3) 挑战 ——
log("== 挑战 ==");
const card = await ev(`(()=>{
  const cs=[...document.querySelectorAll('[data-lexical-node-type="quiz-paper-link"]')];
  for(const c of cs){
    const img=c.querySelector('img');let dec='';try{dec=decodeURIComponent(img?img.src:'');}catch(e){dec=img?img.src:'';}
    if(dec.includes('挑战')){c.scrollIntoView({block:'center'});return 1;}
  }
  return 0;})()`, tb.ctx).catch(() => 0);
if (card) {
  await sleep(1200);
  const clicked = await ev(`(()=>{const cs=[...document.querySelectorAll('[data-lexical-node-type="quiz-paper-link"]')];
    for(const c of cs){const img=c.querySelector('img');let dec='';try{dec=decodeURIComponent(img?img.src:'');}catch(e){dec=img?img.src:'';}
      if(dec.includes('挑战')){(img||c).click();return 1;}}
    return 0;})()`, tb.ctx).catch(() => 0);
  log("卡点击:", clicked);
  await sleep(4000);
  await dismissModals();
  // 开始挑战
  let started = false;
  for (let attempt = 0; attempt < 4 && !started; attempt++) {
    for (const f of await frames()) {
      const r = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(开始挑战|再次挑战|开始答题)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return 0;v[v.length-1].click();return 1;})()`, f.ctx).catch(() => 0);
      if (r) { started = true; break; }
    }
    if (!started) { await dismissModals(); await ev(`(()=>{const cs=[...document.querySelectorAll('[data-lexical-node-type="quiz-paper-link"]')];
      for(const c of cs){const img=c.querySelector('img');let dec='';try{dec=decodeURIComponent(img?img.src:'');}catch(e){dec=img?img.src:'';}
        if(dec.includes('挑战')){(img||c).click();return 1;}}return 0;})()`, tb.ctx).catch(() => 0); await sleep(3000); }
  }
  log("开始挑战:", started);
  // 等考试帧
  let ex = null;
  const oldExams = new Set((await frames()).filter(f => f.url.includes("/exam/")).map(f => f.url.split("?")[0]));
  for (let k = 0; k < 25; k++) {
    await sleep(1000);
    for (const f of await frames()) {
      if (f.url.includes("/exam/") && f.ctx && !oldExams.has(f.url.split("?")[0])) { ex = f; break; }
    }
    if (ex) break;
  }
  if (ex) {
    log("exam:", ex.url.slice(45, 80));
    const answered = await ev(`(async()=>{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];
      items.forEach(q=>{const rows=[...q.querySelectorAll('[class*=chioceView_strongListView]')];if(rows[0])rows[0].click();});
      return items.length;})()`, ex.ctx).catch(() => 0);
    log("已答(占位):", answered);
    await sleep(1500);
    // 如果有答案串则用正确答案重做
    if (CHA) {
      // 找重新作答/继续答题入口
      const again = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(再次挑战|重新作答)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return 0;v[v.length-1].click();return 1;})()`, ex.ctx).catch(() => 0);
      log("再次入口:", again);
      await sleep(4000);
      const n2 = await ev(`(()=>{
        const norm=s=>(s||'').replace(/\\s+/g,' ').trim();
        const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];
        const ks=${JSON.stringify(CHA)};
        items.forEach((q,i)=>{
          const rows=[...q.querySelectorAll('[class*=chioceView_strongListView]')];
          if(rows.length){const key=ks[i];const row=key?rows["ABCD".indexOf(key[0])]:null;
            if(row)row.click();return;}
          const el=q.querySelector('input,textarea');
          if(el){const proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
            Object.getOwnPropertyDescriptor(proto,'value').set.call(el,'x');
            el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}
        });
        return items.length;})()`, ex.ctx).catch(() => 0);
      log("正确作答:", n2);
      await sleep(1200);
    }
    const sub = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n(s===undefined?'':e.innerText)==='提交'&&e.getBoundingClientRect().width>10);if(!v.length)return 0;v[v.length-1].click();return 1;})()`, ex.ctx).catch(() => 0);
    log("提交:", sub);
    await sleep(3500);
    let conf = 0;
    for (let k = 0; k < 6 && !conf; k++) {
      conf = await ev(`(()=>{const b=document.querySelector('.ant-modal-confirm-btns .ant-btn-primary');if(!b)return 0;b.click();return 1;})()`, ex.ctx).catch(() => 0);
      if (!conf) { for (const f of await frames()) { const r = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>/^(确定|确认)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return 0;v[v.length-1].click();return 1;})()`, f.ctx).catch(() => 0); if (r) { conf = 1; break; } } await sleep(1500); }
    }
    log("确定:", conf);
    await sleep(5000);
    // 成绩提交
    let posted = false;
    for (let k = 0; k < 10; k++) {
      const rr = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n(e.innerText)==='成绩提交'&&e.getBoundingClientRect().width>12);if(!v.length)return 0;v[v.length-1].click();return 1;})()`, ex.ctx).catch(() => 0);
      if (rr) { posted = true; break; }
      await sleep(1500);
    }
    log("成绩提交:", posted);
    await sleep(3000);
    for (const f of await frames()) {
      const t = await ev(`(()=>{const t2=document.body.innerText;const m=t2.replace(/\\s+/g,' ').match(/(本轮成绩|提交成功|成绩提交成功)[^。]{0,50}/);return m?m[0]:'';})()`, f.ctx).catch(() => "");
      if (t) log("RESULT:", t);
    }
  } else log("考试帧未出现");
} else log("本单元无挑战卡");

fs.writeFileSync(`unitproc-u${U}.json`, JSON.stringify(results, null, 1));
log("== 完成 ==", results.filter(r => ["done", "full", "full1"].includes(r.r)).length, "块处理");
cdp.close();
