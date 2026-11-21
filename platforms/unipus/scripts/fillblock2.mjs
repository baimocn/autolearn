// fillblock2.mjs <unit> [blocks] — 全题型终版驱动
// 配方：占位提交→揭答案区→解析(k)值→去括号→重做→按题型填→提交
import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";

const U = Number(process.argv[2] || 1);
const only = process.argv[3] ? process.argv[3].split(",").map(Number) : null;
const tid = await ensureReader(U);
const L = await connect(tid);
await L.cdp.send("Page.enable", {}, L.sessionId).catch(() => {});
let tb = null;
for (let k = 0; k < 25 && !tb; k++) {
  tb = (await L.frames()).find((f) => f.url.includes("textbook/book") && f.ctx && f.url.includes(CH[U].slice(0, 12)));
  if (!tb) await sleep(800);
}
if (!tb) { console.log(`[u${U}] NO TB`); process.exit(1); }
const log = (...a) => console.log(`[u${U}]`, ...a);
const ev = async (e) => {
  const r = await L.cdp.send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true, userGesture: true, contextId: tb.ctx }, L.sessionId);
  if (r.exceptionDetails) return { __err: ((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text || "").slice(0, 150) };
  return r.result && r.result.value;
};
const frameEv = async (e) => { // 全 frame 搜（弹层可能在 body 下）
  let v = await ev(e);
  if (v && !v.__err && v !== 0 && v !== null && v !== false) return v;
  for (const f of await L.frames()) {
    try {
      const r = await L.cdp.send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true, userGesture: true, contextId: f.ctx }, L.sessionId);
      if (!r.exceptionDetails && r.result && r.result.value && r.result.value !== 0 && r.result.value !== false) return r.result.value;
    } catch {}
  }
  return v;
};
const scroll = (i) => ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(b)b.scrollIntoView({block:'center'});return 1;})()`);
const dismissRules = async () => {
  for (const f of await L.frames()) {
    await L.ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');
      const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='我知道了'&&e.getBoundingClientRect().width>20);
      if(v.length){v[v.length-1].click();return 1;}return 0;})()`, f.ctx).catch(() => 0);
  }
};
const state = (i) => ev(`(()=>{
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
const waitReady = async (i, tries = 16) => {
  let s = null;
  for (let k = 0; k < tries; k++) {
    await scroll(i); await sleep(950);
    s = await state(i);
    if (s && !s.__err) {
      const ctrl = s.inp + s.area + s.dig + s.dd + s.tf + s.video + s.audio + s.file;
      if (ctrl > 0 && s.len > 80 && s.sub) return s;      // 控件块：有题面+有提交
      if (ctrl === 0 && s.len > 200) return s;            // 纯文本块
    }
    if (k % 4 === 3) await dismissRules();
  }
  return s;
};
const btn = (i, label) => ev(`(()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
  const el=[...b.querySelectorAll('[class*=i-button]')].find(e=>((e.innerText||'').replace(/\\s+/g,''))===${JSON.stringify(label)});
  if(el){el.click();return 1;}return 0;})()`);
const confirmOk = () => frameEv(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');
  const el=[...document.querySelectorAll('button,[class*=i-button]')].filter(e=>/^(确认|确定)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>0);
  if(el.length){el[el.length-1].click();return 1;}return 0;})()`);
const getText = (i) => ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];return (b.innerText||'');})()`);

const fillInputs = (i, vals) => ev(`(()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
  const els=[...b.querySelectorAll('input[type=text]')];const vals=${JSON.stringify(vals)};
  const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
  els.forEach((e,k)=>{e.focus();set.call(e,vals[k]??('answer '+(k+1)));
    e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));e.blur();});
  return els.map(e=>e.value);})()`);
const fillAreas = (i, v) => ev(`(()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
  const els=[...b.querySelectorAll('textarea')];
  const set=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;
  els.forEach((e,k)=>{e.focus();set.call(e,${JSON.stringify(v)});
    e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));e.blur();});
  return els.length;})()`);
// 下拉(digEmptySelectView)与行内选词(digEmptyView)通用：点触发器→全frame找 optionItem→按文本选
const pickOptions = async (i, wants, trigSel, optSel) => {
  return frameEv(`(async()=>{
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
};
const actChoice = (i, keys) => ev(`(async()=>{
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
const actTf = (i, keys) => ev(`(async()=>{
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

// —— 答案解析（只在“答案”区内）——
function parseAnswers(text) {
  const sec = text.lastIndexOf("\n答案");
  if (sec < 0) return [];
  const tail = text.slice(sec + 3);
  const lines = tail.split("\n").map(s => s.trim());
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
  const flat = lines.filter(Boolean)
    .filter(s => !/^\(\d+\)$/.test(s) && !/^答案[:：]?$/.test(s) && !/你的答案|你的得分/.test(s));
  return flat;
}
const stripAlt = (s) => String(s || "").replace(/\s*[（(][^()（）]*[）)]\s*$/, "").trim() || String(s).trim();
const stripAll = (arr) => arr.map(stripAlt);

// —— 主循环（封装成两遍可复用）——
const processList = async (idxs) => {
  const out = [];
for (const i of idxs) {
  try {
    let st = await waitReady(i);
    if (!st || st.__err) { log(`#${i} 不可用`); summary.push({ i, r: "noblock" }); continue; }
    if (st.len < 80 && !st.video && !st.audio && !st.file) { log(`#${i} 渲染不全(len=${st.len})，跳过待二轮`); summary.push({ i, r: "thin" }); continue; }
    if (st.score !== null && Number(st.score) >= 99.9 && !st.sub) { log(`#${i} 已满分`); summary.push({ i, r: "full", score: st.score }); continue; }
    if (!st.sub && !st.redo && st.len > 40) { log(`#${i} 已提交 score=${st.score}`); summary.push({ i, r: "submitted", score: st.score }); continue; }
    let kind = "text";
    if (st.file) kind = "upload";
    else if (st.video || st.audio) kind = "media";
    else if (st.dd) kind = "dd";
    else if (st.tf >= 2) kind = "tf";
    else if (st.inp) kind = "fill";
    else if (st.dig) kind = "dig";
    else if (st.area) kind = "area";
    else if (st.items) kind = "choice";
    log(`#${i} kind=${kind} len=${st.len} score=${st.score} sub=${st.sub} redo=${st.redo} inp=${st.inp} dig=${st.dig} area=${st.area} dd=${st.dd}`);

    if (kind === "upload" || kind === "media" || kind === "text") { summary.push({ i, r: kind }); continue; }

    // 阶段1：占位提交（若未提交）
    if (st.sub && st.score === null) {
      if (kind === "fill") await fillInputs(i, Array.from({ length: st.inp }, (_, k) => "x" + (k + 1)));
      else if (kind === "area") await fillAreas(i, "This is my answer. I have considered the question carefully and written my key points here.");
      else if (kind === "dd") await pickOptions(i, null, "[class*=digEmptySelectView_selectTrigger]", "[class*=digEmptySelectView_optionItem]");
      else if (kind === "dig") await pickOptions(i, null, "[class*=digEmptyView_blankView]", "[class*=digEmptyView_optionItem],[class*=digEmptyView_labelView]");
      else if (kind === "choice") await actChoice(i, null);
      else if (kind === "tf") await actTf(i, null);
      await sleep(500);
      await btn(i, "提交");
      await sleep(5000);
      await confirmOk(); await sleep(1200); await dismissRules();
      st = await state(i);
      log(`#${i} 占位提交后 score=${st.score} redo=${st.redo}`);
    }

    // 阶段2：读答案
    const text = await getText(i);
    let answers = parseAnswers(text).map(stripAlt);
    if (!answers.length) {
      // 选择题正确答案行
      const keys = [];
      const re = /正确答案[:：]?\s*\n?\s*([^\n]+)/g;
      let m;
      while ((m = re.exec(text))) keys.push(m[1].trim());
      if (keys.length) answers = keys;
    }
    log(`#${i} 答案${answers.length}项: ${JSON.stringify(answers.slice(0, 12)).slice(0, 160)}`);

    // 阶段3：重做→按答案作答→提交
    if (answers.length && (st.redo || st.score === null || Number(st.score) < 99.9)) {
      if (st.redo) { await btn(i, "重新作答"); await sleep(2500); await scroll(i); await sleep(1300); }
      const st2 = await state(i);
      if (st2.len < 40 && !st2.inp && !st2.dig && !st2.dd) { log(`#${i} redo后空壳，保 ${st.score}`); summary.push({ i, r: "done", score: st.score, note: "redo-stuck" }); continue; }
      if (kind === "fill" || (st2.inp && st.inp)) await fillInputs(i, answers.length >= st2.inp ? answers : Array.from({ length: st2.inp }, (_, k) => answers[k] ?? "answer " + (k + 1)));
      else if (kind === "area") await fillAreas(i, answers.join("\n"));
      else if (kind === "dd") await pickOptions(i, answers, "[class*=digEmptySelectView_selectTrigger]", "[class*=digEmptySelectView_optionItem]");
      else if (kind === "dig") await pickOptions(i, answers, "[class*=digEmptyView_blankView]", "[class*=digEmptyView_optionItem],[class*=digEmptyView_labelView]");
      else if (kind === "choice") await actChoice(i, answers);
      else if (kind === "tf") await actTf(i, answers);
      await sleep(500);
      await btn(i, "提交");
      await sleep(5000);
      await confirmOk(); await sleep(1200); await dismissRules();
      const st3 = await state(i);
      log(`#${i} 最终 score=${st3.score}`);
      summary.push({ i, r: "done", score: st3.score });
    } else {
      summary.push({ i, r: "done", score: st.score, note: answers.length ? "" : "noans" });
    }
  } catch (e) {
    log(`#${i} 异常`, String(e).slice(0, 120));
    out.push({ i, r: "error", e: String(e).slice(0, 100) });
  }
}
  return out;
};

let total = await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`);
log("块总数", total);
const list = only || [...Array(total).keys()];
let summary = await processList(list);

// 二轮：对 thin/noblock 重载后补做
const refindTb = async () => {
  for (let k = 0; k < 30; k++) {
    await sleep(1000);
    const fl = await L.frames();
    tb = fl.find((f) => f.url.includes("textbook/book") && f.ctx && f.url.includes(CH[U].slice(0, 12)));
    if (!tb) continue;
    const n = await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`);
    if (n > 0) return true;
  }
  return false;
};
const bad = summary.filter((s) => s.r === "noblock" || s.r === "thin" || s.r === "error").map((s) => s.i);
if (bad.length) {
  log("二轮补做:", bad.join(","));
  await L.cdp.send("Page.reload", {}, L.sessionId).catch(() => {});
  if (await refindTb()) {
    await dismissRules();
    const pass2 = await processList(bad);
    summary = summary.filter((s) => !bad.includes(s.i)).concat(pass2);
  }
}
fs.writeFileSync(`fb2-u${U}.json`, JSON.stringify(summary, null, 1));
log("小结", JSON.stringify(summary));
L.cdp.close();
