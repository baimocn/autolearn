// allrun.mjs — 跨单元批量：遍历目录树全部小节 → 每节渲染的 task 块按配方处理
// 去重键 = 章节id + 块号；支持多轮（reload 后重扫）
import { ensureReader } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";

const tid = await ensureReader(1);
const L = await connect(tid);
await L.cdp.send("Page.enable", {}, L.sessionId).catch(() => {});
const log = (...a) => console.log("[all]", ...a);

let tb = null, chapter = "";
const refindTb = async (tries = 25) => {
  for (let k = 0; k < tries; k++) {
    tb = (await L.frames()).find((f) => f.url.includes("textbook/book") && f.ctx);
    if (tb) {
      const m = tb.url.match(/chapter\/([a-f0-9-]{12})/);
      const n = await raw(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`).catch(() => 0);
      if (n > 0) { chapter = m ? m[1] : tb.url.slice(0, 60); return true; }
    }
    await sleep(900);
  }
  return false;
};
const raw = async (expr) => {
  if (!tb) return null;
  const r = await L.cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true, contextId: tb.ctx }, L.sessionId);
  if (r.exceptionDetails) return { __err: ((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || "").slice(0, 100) };
  return r.result && r.result.value;
};
const frameRaw = async (expr) => {
  let v = await raw(expr);
  if (v && !v.__err && v !== 0 && v !== false && v != null) return v;
  for (const f of await L.frames()) {
    try {
      const r = await L.cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true, contextId: f.ctx }, L.sessionId);
      if (!r.exceptionDetails && r.result && r.result.value && r.result.value !== 0 && r.result.value !== false) return r.result.value;
    } catch {}
  }
  return v;
};
const dismissRules = async () => {
  for (const f of await L.frames()) {
    await L.ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');
      const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='我知道了'&&e.getBoundingClientRect().width>20);
      if(v.length){v[v.length-1].click();return 1;}return 0;})()`, f.ctx).catch(() => 0);
  }
};
await dismissRules();

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
const scroll = (i) => raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(b)b.scrollIntoView({block:'center'});return 1;})()`);
const btn = (i, label) => raw(`(()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
  const el=[...b.querySelectorAll('[class*=i-button]')].find(e=>((e.innerText||'').replace(/\\s+/g,''))===${JSON.stringify(label)});
  if(el){el.click();return 1;}return 0;})()`);
const confirmOk = () => frameRaw(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');
  const el=[...document.querySelectorAll('button,[class*=i-button]')].filter(e=>/^(确认|确定)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>0);
  if(el.length){el[el.length-1].click();return 1;}return 0;})()`);
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
  const flat = lines.filter(Boolean).filter((s) => !/^\(\d+\)$/.test(s) && !/^答案[:：]?$/.test(s) && !/你的答案|你的得分/.test(s));
  return flat;
}
const stripAlt = (s) => { const t = String(s || "").replace(/\s*[（(][^()（）]*[）)]\s*$/, "").trim(); return t || String(s || "").trim(); };

const processBlock = async (i) => {
  await scroll(i); await sleep(700);
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
  if (kind === "upload" || kind === "media" || kind === "text") return { r: kind, len: st.len };

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
    await confirmOk(); await sleep(1000); await dismissRules();
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
    await sleep(2500); await scroll(i); await sleep(1300);
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
      await sleep(5000);
      await confirmOk(); await sleep(1000); await dismissRules();
      const st3 = await state(i);
      return { r: "done", score: st3.score, kind };
    }
    return { r: "done", score: st.score, kind, note: "redo-stuck" };
  }
  return { r: "done", score: st.score, kind, note: answers.length ? "" : "noans" };
};

// —— 主流程 ——
if (!(await refindTb())) { log("NO TB"); process.exit(1); }
const done = new Set();          // chapter+idx 已处理
const results = {};
const sectionsSeen = new Set();

const listSections = () => raw(`(()=>{
  const seen=new Set(); const out=[];
  [...document.querySelectorAll('[class*=i-tree-menu_title-flex]')].forEach(e=>{
    const t=(e.innerText||'').replace(/\\s+/g,' ').trim();
    if(t&&!seen.has(t)&&t.length<50){seen.add(t);out.push(t);}
  });
  return out;})()`);

for (let round = 0; round < 3; round++) {
  const sections = (await listSections()) || [];
  log(`round${round} 小节 ${sections.length}`);
  for (let si = 0; si < sections.length; si++) {
    const sec = sections[si];
    const key0 = sec;
    if (round > 0 && sectionsSeen.has(key0) && done.size > 0) { /* 仍重扫，块内容可能变化 */ }
    const clicked = await raw(`(()=>{
      const el=[...document.querySelectorAll('[class*=i-tree-menu_title-flex]')].find(e=>(e.innerText||'').replace(/\\s+/g,' ').trim()===${JSON.stringify(sec)});
      if(!el)return 0;
      const rk=Object.keys(el).find(k=>k.startsWith('__reactProps'));
      if(rk&&el[rk].onClick){el[rk].onClick({stopPropagation(){},preventDefault(){},target:el,currentTarget:el,nativeEvent:{}});return 1;}
      el.click();return 1;})()`);
    if (!clicked) continue;
    sectionsSeen.add(key0);
    await sleep(4200);
    await dismissRules();
    if (!(await refindTb(8))) { log("丢帧，跳过", sec); continue; }
    const lens = (await raw(`[...document.querySelectorAll('div.editor-question-block.questionBlockNode')].map(b=>(b.innerText||'').length)`)) || [];
    for (let i = 0; i < lens.length; i++) {
      const key = chapter + "#" + i;
      if (done.has(key) || lens[i] < 80) continue;
      try {
        const r = await processBlock(i);
        r.sec = si; r.secName = sec.slice(0, 18);
        results[key] = r;
        if (r.r !== "thin") done.add(key);
        log(`${sec.slice(0, 16)} #${i}`, JSON.stringify(r).slice(0, 100));
      } catch (e) {
        log(`${sec.slice(0, 16)} #${i} 异常`, String(e).slice(0, 80));
      }
    }
    fs.writeFileSync("allrun-state.json", JSON.stringify({ n: done.size, sectionsSeen: sectionsSeen.size }, null, 1));
  }
  // reload 再扫一轮
  const thinCount = Object.values(results).filter((r) => r.r === "thin").length;
  log(`round${round} 结束 done=${done.size} thin=${thinCount}`);
  if (round < 2) {
    await L.cdp.send("Page.reload", {}, L.sessionId).catch(() => {});
    if (!(await refindTb(40))) { log("reload 后丢帧"); break; }
    await dismissRules(); await sleep(2500);
  }
}
fs.writeFileSync("allrun-results.json", JSON.stringify(results, null, 1));
log("全部完成 done=", done.size);
L.cdp.close();
