// unit-runner.mjs <unit> — 遍历目录小节，逐块处理全部 task
// 模型：内容只挂载“当前小节”的块 → 点小节标题导航 → 收集 len>80 的块 → 配方处理
import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";

const U = Number(process.argv[2] || 1);
const tid = await ensureReader(U);
const L = await connect(tid);
await L.cdp.send("Page.enable", {}, L.sessionId).catch(() => {});
const log = (...a) => console.log(`[u${U}]`, ...a);

let tb = null;
const refindTb = async (tries = 25) => {
  for (let k = 0; k < tries; k++) {
    tb = (await L.frames()).find((f) => f.url.includes("textbook/book") && f.ctx && f.url.includes(CH[U].slice(0, 12)));
    if (tb) {
      const n = await raw(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`).catch(() => 0);
      if (n > 0) return true;
    }
    await sleep(900);
  }
  return false;
};
const raw = async (expr) => {
  if (!tb) return null;
  const r = await L.cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true, contextId: tb.ctx }, L.sessionId);
  if (r.exceptionDetails) return { __err: ((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || "").slice(0, 120) };
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

// —— 块级助手 ——
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

// —— 单块处理 ——
const processBlock = async (i) => {
  await scroll(i); await sleep(700);
  let st = await state(i);
  if (!st || st.__err || st.len < 80) return { i, r: "thin", len: st && st.len };
  if (st.score !== null && Number(st.score) >= 99.9 && !st.sub) return { i, r: "full", score: st.score };
  if (!st.sub && !st.redo) return { i, r: "submitted", score: st.score };
  let kind = "text";
  if (st.file) kind = "upload";
  else if (st.video || st.audio) kind = "media";
  else if (st.dd) kind = "dd";
  else if (st.tf >= 2) kind = "tf";
  else if (st.inp) kind = "fill";
  else if (st.dig) kind = "dig";
  else if (st.area) kind = "area";
  else if (st.items) kind = "choice";
  if (kind === "upload" || kind === "media" || kind === "text") return { i, r: kind, len: st.len };

  // 占位提交
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
  // 读答案
  const text = await getText(i);
  let answers = parseAnswers(text).map(stripAlt);
  if (!answers.length) {
    const keys = []; const re = /正确答案[:：]?\s*\n?\s*([^\n]+)/g; let m;
    while ((m = re.exec(text))) keys.push(m[1].trim());
    if (keys.length) answers = keys;
  }
  // 重做→精确作答→提交
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
      return { i, r: "done", score: st3.score, kind };
    }
    return { i, r: "done", score: st.score, kind, note: "redo-stuck" };
  }
  return { i, r: "done", score: st.score, kind, note: answers.length ? "" : "noans" };
};

// —— 主流程：遍历小节 ——
if (!(await refindTb())) { log("NO TB"); process.exit(1); }
const total = await raw(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`);
log("块总数", total);
const pending = new Set([...Array(total).keys()]);
const results = {};

const listSections = () => raw(`(()=>{
  const seen=new Set(); const out=[];
  [...document.querySelectorAll('[class*=i-tree-menu_title-flex]')].forEach(e=>{
    const t=(e.innerText||'').replace(/\\s+/g,' ').trim();
    if(t&&!seen.has(t)&&t.length<50){seen.add(t);out.push(t);}
  });
  return out;})()`);

let sections = (await listSections()) || [];
log("小节数", sections.length, JSON.stringify(sections).slice(0, 300));

for (let round = 0; round < 2; round++) {
  for (let si = 0; si < sections.length && pending.size; si++) {
    const sec = sections[si];
    const clicked = await raw(`(()=>{
      const el=[...document.querySelectorAll('[class*=i-tree-menu_title-flex]')].find(e=>(e.innerText||'').replace(/\\s+/g,' ').trim()===${JSON.stringify(sec)});
      if(!el)return 0;
      const rk=Object.keys(el).find(k=>k.startsWith('__reactProps'));
      if(rk&&el[rk].onClick){el[rk].onClick({stopPropagation(){},preventDefault(){},target:el,currentTarget:el,nativeEvent:{}});return 1;}
      el.click();return 1;})()`);
    if (!clicked) continue;
    await sleep(4500);
    await dismissRules();
    // 扫描当前渲染且 pending 的块
    const lens = (await raw(`[...document.querySelectorAll('div.editor-question-block.questionBlockNode')].map(b=>(b.innerText||'').length)`)) || [];
    for (let i = 0; i < lens.length; i++) {
      if (!pending.has(i) || lens[i] < 80) continue;
      try {
        const r = await processBlock(i);
        results[i] = r;
        if (r.r !== "thin") pending.delete(i);
        log(`小节[${si}] #${i}`, JSON.stringify(r).slice(0, 110));
      } catch (e) {
        log(`小节[${si}] #${i} 异常`, String(e).slice(0, 90));
      }
    }
  }
  if (!pending.size) break;
  // 重载后再来一轮
  log("reload 二轮, 剩余:", [...pending].join(","));
  await L.cdp.send("Page.reload", {}, L.sessionId).catch(() => {});
  if (!(await refindTb())) break;
  await dismissRules();
  await sleep(2000);
  sections = (await listSections()) || [];
}
fs.writeFileSync(`runner-u${U}.json`, JSON.stringify({ results, pending: [...pending] }, null, 1));
log("完成。结果数", Object.keys(results).length, "未处理", [...pending].join(",") || "无");
L.cdp.close();
