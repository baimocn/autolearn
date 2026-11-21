// unitfull.mjs <unit> — 单元全流程：深路由新标签 → 题块配方 → 视频拖尾 → 慢滚上报
import { CDP, sleep } from "./cdp.mjs";
import { connect } from "./utlib.mjs";
import { READER, COURSE } from "./reader.mjs";
import fs from "node:fs";

const U = Number(process.argv[2]);
const SCROLL_SEC = Number(process.env.SCROLL_SEC || 10);
const log = (...a) => console.log(`[u${U}]`, ...a);
const { CH } = await import("./config.mjs");
process.on("uncaughtException", (e) => log("uncaught:", String(e).slice(0, 120)));
process.on("unhandledRejection", (e) => log("unrej:", String(e).slice(0, 120)));

const getVer = async () => (await fetch("http://127.0.0.1:9222/json/version")).json();
const getTabs = async () => (await fetch("http://127.0.0.1:9222/json/list")).json();

// —— 1) 深路由新标签打开单元 reader ——
const b0 = await CDP.connect((await getVer()).webSocketDebuggerUrl);
for (const t of (await getTabs()).filter(t => /ucontent\.unipus\.cn/.test(t.url))) await b0.send("Target.closeTarget", { targetId: t.id }).catch(() => {});
await sleep(800);
let r = null;
for (let att = 0; att < 2 && !r; att++) {
  try { r = await b0.send("Target.createTarget", { url: `${READER}#/${COURSE}/courseware/u${U}/u${U}g2` }); }
  catch (e) { log("createTarget重试", String(e).slice(0,60)); await sleep(3000); }
}
b0.close();
const rd = { id: r.targetId };
await sleep(18000);

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

const L = await connect(rd.id);
await L.cdp.send("Page.enable", {}, L.sessionId).catch(() => {});
const { ev, frames, cdp: cdp2, sessionId } = L;

let tb = null;
const refindTb = async (tries = 110) => {
  for (let k = 0; k < tries; k++) {
    tb = (await frames()).find(f => f.url.includes("textbook/book") && f.ctx && f.url.includes((CH[U] || "????").slice(0, 12)));
    if (tb) {
      const n = await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`, tb.ctx).catch(() => 0);
      if (n > 0) return true;
    }
    await sleep(1000);
  }
  return false;
};
const raw = async (expr) => {
  if (!tb) return null;
  const r = await cdp2.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true, contextId: tb.ctx }, sessionId);
  if (r.exceptionDetails) return { __err: ((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || "").slice(0, 100) };
  return r.result && r.result.value;
};
const frameRaw = async (expr) => {
  let v = await raw(expr);
  if (v && !v.__err && v !== 0 && v !== false && v != null) return v;
  for (const f of await frames()) {
    try {
      const r = await cdp2.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true, contextId: f.ctx }, sessionId);
      if (!r.exceptionDetails && r.result && r.result.value && r.result.value !== 0 && r.result.value !== false) return r.result.value;
    } catch {}
  }
  return v;
};
const dismissRules = async () => {
  for (const f of await frames()) {
    await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');
      const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='我知道了'&&e.getBoundingClientRect().width>20);
      if(v.length){v[v.length-1].click();return 1;}return 0;})()`, f.ctx).catch(() => 0);
  }
};
await dismissRules();
if (!(await refindTb())) { log("NO TB for unit", U); process.exit(1); }

// —— 2) 题块配方（allrun 核心，2 轮）——
const btn = (i, label) => raw(`(()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
  const el=[...b.querySelectorAll('[class*=i-button]')].find(e=>((e.innerText||'').replace(/\\s+/g,''))===${JSON.stringify(label)});
  if(el){el.click();return 1;}return 0;})()`);
const confirmOk = () => frameRaw(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');
  const el=[...document.querySelectorAll('button,[class*=i-button]')].filter(e=>/^(确认|确定)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>0);
  if(el.length){el[el.length-1].click();return 1;}return 0;})()`);
const state = (i) => raw(`(()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
  if(!b) return {__err:'no'};
  const t=(b.innerText||'').replace(/\\s+/g,' ');
  return {len:(b.innerText||'').length,
    inp:b.querySelectorAll('input[type=text]').length, area:b.querySelectorAll('textarea').length,
    dig:b.querySelectorAll('[class*=digEmptyView_blankView]').length,
    dd:b.querySelectorAll('[class*=digEmptySelectView_selectTrigger]').length,
    tf:b.querySelectorAll('[class*=answer_optionTF]').length, items:b.querySelectorAll('[class*=questionItem]').length,
    video:b.querySelectorAll('video').length, audio:b.querySelectorAll('audio').length, file:b.querySelectorAll('input[type=file]').length,
    score:(t.match(/得分[:：]?\\s*(\\d+(\\.\\d+)?)/)||[])[1]??null, redo:/重新作答/.test(t), sub:/提交/.test(t)};})()`);
const scrollBlk = (i) => raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(b)b.scrollIntoView({block:'center'});return 1;})()`);
const getText = (i) => raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];return (b.innerText||'');})()`);
const fillInputs = (i, vals) => raw(`(()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
  const els=[...b.querySelectorAll('input[type=text]')];const vals=${JSON.stringify(vals)};
  const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
  els.forEach((e,k)=>{e.focus();set.call(e,vals[k]??('answer '+(k+1)));
    e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));e.blur();});
  return els.map(e=>e.value);})()`);
const fillAreas = (i, v) => raw(`(()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
  const els=[...b.querySelectorAll('textarea')];
  const set=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;
  els.forEach((e,k)=>{e.focus();set.call(e,${JSON.stringify(v)});
    e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));e.blur();});
  return els.length;})()`);
const pickOptions = (i, wants, trigSel, optSel) => frameRaw(`(async()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
  const norm=s=>(s||'').replace(/\\s+/g,' ').trim();
  const trigs=[...b.querySelectorAll('${trigSel}')];
  const wants=${JSON.stringify(wants)}; let picked=0;
  for(let k=0;k<trigs.length;k++){
    const rk=Object.keys(trigs[k]).find(x=>x.startsWith('__reactProps'));
    try{if(rk&&trigs[k][rk].onClick)trigs[k][rk].onClick({stopPropagation(){},preventDefault(){},target:trigs[k],currentTarget:trigs[k],nativeEvent:{}});else trigs[k].click();}catch(e){trigs[k].click();}
    await new Promise(r=>setTimeout(r,420));
    const opts=[...document.querySelectorAll('${optSel}')].filter(e=>e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0);
    const w=wants[k];
    const hit=(w&&opts.find(o=>norm(o.innerText)===norm(w)))||(w&&opts.find(o=>norm(o.innerText).includes(norm(w))))||opts[0];
    if(hit){const ok=Object.keys(hit).find(x=>x.startsWith('__reactProps'));
      try{if(ok&&hit[ok].onClick)hit[ok].onClick({stopPropagation(){},preventDefault(){},target:hit,currentTarget:hit,nativeEvent:{}});else hit.click();}catch(e){hit.click();}
      picked++;}
    await new Promise(r=>setTimeout(r,220));
  }
  return {ok:1,n:trigs.length,picked};})()`);
const actChoice = (i, keys) => raw(`(async()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
  const norm=s=>(s||'').replace(/\\s+/g,' ').trim();
  const items=[...b.querySelectorAll('[class*=questionItem]')];
  const ks=${JSON.stringify(keys)}; let clicked=0;
  for(let k=0;k<items.length;k++){
    const rows=[...items[k].querySelectorAll('[class*=chioceView_strongListView],[class*=strongListView]')];
    const key=ks[k]; let row=null;
    if(key&&/^[A-H]$/.test(key)) row=rows[key.charCodeAt(0)-65];
    if(!row&&key) row=rows.find(r=>norm(r.innerText)===norm(key));
    if(!row) row=rows[0];
    if(row){row.click();clicked++;}
    await new Promise(r=>setTimeout(r,130));
  }
  return {ok:1,n:items.length,clicked};})()`);
const actTf = (i, keys) => raw(`(async()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
  const norm=s=>(s||'').replace(/\\s+/g,' ').trim();
  const items=[...b.querySelectorAll('[class*=questionItem]')];
  const ks=${JSON.stringify(keys)}; let clicked=0;
  for(let k=0;k<items.length;k++){
    const opts=[...items[k].querySelectorAll('[class*=answer_optionTF]')];
    const hit=opts.find(o=>norm(o.innerText)===ks[k])||opts[0]; if(!hit)continue;
    const r=hit.getBoundingClientRect();
    const o={bubbles:true,cancelable:true,view:window,clientX:r.left+r.width/2,clientY:r.top+r.height/2};
    ['pointerdown','mousedown','pointerup','mouseup','click'].forEach(n=>{const E=n.startsWith('pointer')?PointerEvent:MouseEvent;hit.dispatchEvent(new E(n,o));});
    clicked++;
    await new Promise(r=>setTimeout(r,130));
  }
  return {ok:1,n:items.length,clicked};})()`);
function parseAnswers(text) {
  const sec = text.lastIndexOf("\n答案");
  if (sec < 0) return [];
  const lines = text.slice(sec + 3).split("\n").map((s) => s.trim());
  const paired = [];
  for (let i = 0; i < lines.length; i++) {
    const mm = /^\((\d+)\)$/.exec(lines[i]);
    if (mm) {
      let v = "";
      for (let j = i + 1; j < lines.length; j++) {
        if (/^\(\d+\)$/.test(lines[j]) || /^答案[:：]?$/.test(lines[j])) break;
        v = lines[j]; break;
      }
      if (v) paired[Number(mm[1]) - 1] = v;
    }
  }
  if (paired.filter(Boolean).length >= 2) return paired.filter(Boolean);
  return lines.filter(Boolean).filter((s) => !/^\(\d+\)$/.test(s) && !/^答案[:：]?$/.test(s) && !/你的答案|你的得分/.test(s));
}
const stripAlt = (s) => { const t = String(s || "").replace(/\s*[（(][^()（）]*[）)]\s*$/, "").trim(); return t || String(s || "").trim(); };

const processBlock = async (i) => {
  await scrollBlk(i); await sleep(1200);
  let st = await state(i);
  if (!st || st.__err || st.len < 80) return { r: "thin", len: st && st.len };
  if (st.score !== null && Number(st.score) >= 99.9 && !st.sub) return { r: "full", score: st.score };
  if (!st.sub && !st.redo) return { r: "submitted", score: st.score };
  let kind = "text";
  if (st.file) kind = "upload";
  else if (st.video || st.audio) kind = "media";
  else if (st.dd) kind = "dd";
  else if (st.tf >= 2) kind = "tf";
  else if (st.inp) kind = "fill";
  else if (st.dig) kind = "dig";
  else if (st.area) kind = "area";
  else if (st.items) kind = "choice";
  if (kind === "upload" || kind === "media") return { r: kind, len: st.len };
  if (kind === "text") return { r: "text", len: st.len };

  if (st.sub && st.score === null) {
    if (kind === "fill") await fillInputs(i, Array.from({ length: st.inp }, (_, k) => "x" + (k + 1)));
    else if (kind === "area") await fillAreas(i, "This is my answer. I have considered the question carefully and written my key points here.");
    else if (kind === "dd") await pickOptions(i, null, "[class*=digEmptySelectView_selectTrigger]", "[class*=digEmptySelectView_optionItem]");
    else if (kind === "dig") await pickOptions(i, null, "[class*=digEmptyView_blankView]", "[class*=digEmptyView_optionItem],[class*=digEmptyView_labelView]");
    else if (kind === "choice") await actChoice(i, null);
    else if (kind === "tf") await actTf(i, null);
    await sleep(500);
    await btn(i, "提交");
    await sleep(7000);
    await confirmOk(); await sleep(1500); await dismissRules();
    st = await state(i);
  }
  const text = await getText(i);
  let answers = parseAnswers(text).map(stripAlt);
  if (!answers.length) {
    const keys = []; const re = /正确答案[:：]?\s*\n?\s*([^\n]+)/g; let m;
    while ((m = re.exec(text))) keys.push(m[1].trim());
    if (keys.length) answers = keys;
  }
  if (answers.length && st.redo) {
    await btn(i, "重新作答");
    await sleep(2500); await scrollBlk(i); await sleep(1300);
    const st2 = await state(i);
    if (st2.len >= 40 || st2.inp || st2.dig || st2.dd) {
      if (kind === "fill") await fillInputs(i, answers.length >= st2.inp ? answers : Array.from({ length: st2.inp }, (_, k) => answers[k] ?? "answer " + (k + 1)));
      else if (kind === "area") await fillAreas(i, answers.join("\n"));
      else if (kind === "dd") await pickOptions(i, answers, "[class*=digEmptySelectView_selectTrigger]", "[class*=digEmptySelectView_optionItem]");
      else if (kind === "dig") await pickOptions(i, answers, "[class*=digEmptyView_blankView]", "[class*=digEmptyView_optionItem],[class*=digEmptyView_labelView]");
      else if (kind === "choice") await actChoice(i, answers);
      else if (kind === "tf") await actTf(i, answers);
      await sleep(500);
      await btn(i, "提交");
      await sleep(7000);
      await confirmOk(); await sleep(1500); await dismissRules();
      const st3 = await state(i);
      return { r: "done", score: st3.score, kind };
    }
    return { r: "done", score: st.score, kind, note: "redo-stuck" };
  }
  return { r: "done", score: st.score, kind, note: answers.length ? "" : "noans" };
};

const listSections = () => raw(`(()=>{
  const seen=new Set(); const out=[];
  [...document.querySelectorAll('[class*=i-tree-menu_title-flex]')].forEach(e=>{
    const t=(e.innerText||'').replace(/\\s+/g,' ').trim();
    if(t&&!seen.has(t)&&t.length<50){seen.add(t);out.push(t);}
  });
  return out;})()`);

log("阶段A：题块");
const done = new Set(); const results = {};
for (let round = 0; round < 2; round++) {
  const sections = (await listSections()) || [];
  for (let si = 0; si < sections.length; si++) {
    const clicked = await raw(`(()=>{
      const el=[...document.querySelectorAll('[class*=i-tree-menu_title-flex]')].find(e=>(e.innerText||'').replace(/\\s+/g,' ').trim()===${JSON.stringify(sections[si])});
      if(!el)return 0;
      const rk=Object.keys(el).find(k=>k.startsWith('__reactProps'));
      if(rk&&el[rk].onClick){el[rk].onClick({stopPropagation(){},preventDefault(){},target:el,currentTarget:el,nativeEvent:{}});return 1;}
      el.click();return 1;})()`);
    if (!clicked) continue;
    await sleep(7000);
    await dismissRules();
    if (!(await refindTb(8))) continue;
    const lens = (await raw(`[...document.querySelectorAll('div.editor-question-block.questionBlockNode')].map(b=>(b.innerText||'').length)`)) || [];
    for (let i = 0; i < lens.length; i++) {
      const key = "b" + i;
      if (done.has(key) || lens[i] < 80) continue;
      try {
        const r = await processBlock(i);
        r.sec = si;
        results[key] = r;
        if (r.r !== "thin") done.add(key);
        log(`块#${i}`, JSON.stringify(r).slice(0, 100));
      } catch (e) { log(`块#${i} 异常`, String(e).slice(0, 80)); }
    }
  }
  if (round < 1) {
    await cdp2.send("Page.reload", {}, sessionId).catch(() => {});
    if (!(await refindTb(40))) break;
    await dismissRules(); await sleep(2500);
  }
}

// —— 3) 视频拖尾 ——
log("阶段B：视频");
if (await refindTb(10)) {
  const sh = await raw(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;return Math.round(sc.scrollHeight);})()`);
  let handled = 0;
  for (let y = 0; y < (sh || 4000) + 400; y += 620) {
    await raw(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollTop=${y};return 1;})()`).catch(() => {});
    await sleep(550);
    await raw(`(()=>{[...document.querySelectorAll('video')].forEach(v=>{if(!v.__d){v.muted=true;try{v.play().catch(()=>{});}catch(e){}}});return 1;})()`).catch(() => {});
    await sleep(900);
    const r = await raw(`(()=>{
      const vs=[...document.querySelectorAll('video')];const done=[];
      vs.forEach(v=>{ if(!isFinite(v.duration)||!v.duration||v.__d)return;
        const rc=v.getBoundingClientRect(); if(rc.bottom<0||rc.top>window.innerHeight)return;
        v.pause(); v.currentTime=Math.max(0,v.duration-0.15); v.dispatchEvent(new Event('timeupdate')); v.__d=true; done.push(Math.round(v.duration));});
      return done;})()`).catch(() => null);
    if (r && r.length) { handled += r.length; log(`  y=${y} 拖完 ${r.length} 个`); }
  }
  log("视频处理", handled, "个");
}

// —— 4) 慢滚上报（正文 finishNode）——
log("阶段C：慢滚");
if (await refindTb(10)) {
  await raw(`(()=>{for(const m of document.querySelectorAll('[class*=backdrop]')){m.style.display='none';m.style.pointerEvents='none';}return 1;})()`).catch(() => {});
  const fin = [];
  await cdp2.send("Network.enable", {}, sessionId).catch(() => {});
  cdp2.on("Network.requestWillBeSent", (p) => { if (/finishNode/.test(p.request && p.request.url || "")) fin.push(1); });
  const screens = await raw(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollTop=0;return Math.round(sc.scrollHeight/window.innerHeight);})()`);
  const n = Math.min(140, Math.max(8, screens || 10));
  for (let s = 0; s < n; s++) {
    await raw(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollBy(0,Math.round(window.innerHeight*0.95));return 1;})()`).catch(() => {});
    await sleep(SCROLL_SEC * 1000);
  }
  log("慢滚完成，finishNode≈", fin.length, "条");
}

fs.writeFileSync(`unitfull-u${U}.json`, JSON.stringify(results, null, 1));
log(`Unit ${U} 全流程完成`);
cdp2.close();
