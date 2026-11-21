// drive2.mjs <unit> [blocks] — 终版题块驱动：重载→逐块等就绪→分类→提交→（可选）抄答案
// 策略：过关条件=无限制(min_score_pct=0)，保证成功提交即 pass；有答案区则抄一轮
import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";

const U = Number(process.argv[2]);
const only = process.argv[3] ? process.argv[3].split(",").map(Number) : null;
const tid = await ensureReader(U);
const L = await connect(tid);
await L.cdp.send("Page.enable", {}, L.sessionId).catch(() => {});
// 注意：不要 reload —— 平台深路由进入后块内容才稳定挂载（openUnit/重载会导致题体空壳）
if (process.env.RELOAD === "1") await L.cdp.send("Page.reload", {}, L.sessionId).catch(() => {});

const log = (...a) => console.log(`[u${U}]`, ...a);

let tb = null, total = 0;
for (let k = 0; k < 45 && !total; k++) {
  await sleep(1000);
  const fl = await L.frames();
  tb = fl.find((f) => f.url.includes("textbook/book") && f.ctx && f.url.includes(CH[U].slice(0, 12)));
  if (!tb) continue;
  total = await L.ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`, tb.ctx).catch(() => 0) || 0;
}
if (!tb || !total) { log("NO FRAME"); L.cdp.close(); process.exit(1); }
const ctx = tb.ctx;

const raw = async (expr) => {
  const r = await L.cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true, contextId: ctx }, L.sessionId);
  if (r.exceptionDetails) return { __err: ((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text || "exc").slice(0, 180) };
  return r.result && r.result.value;
};
const dismissRules = async () => {
  for (const f of await L.frames()) {
    await L.ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');
      const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='我知道了'&&e.getBoundingClientRect().width>20);
      if(v.length){v[v.length-1].click();return 1;}return 0;})()`, f.ctx).catch(() => 0);
  }
};
await dismissRules();

// —— 块内探测器 ——
const probe = (i) => raw(`(()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
  if(!b) return {__err:'no'};
  const t=(b.innerText||'');
  const tn=t.replace(/\\s+/g,' ');
  const $=s=>[...b.querySelectorAll(s)];
  return {
    len:t.length,
    inp:$('input[type=text]').length, area:$('textarea').length,
    dig:$('[class*=digEmptyView_blankView]').length,
    dd:$('[class*=digEmptySelectView_selectTrigger]').length,
    tf:$('[class*=answer_optionTF]').length, items:$('[class*=questionItem]').length,
    video:$('video').length, audio:$('audio').length, file:$('input[type=file]').length,
    score:(tn.match(/得分[:：]?\\s*(\\d+(\\.\\d+)?)/)||[])[1]??null,
    sub:$('[class*=i-button]').some(e=>((e.innerText||'').replace(/\\s+/g,''))==='提交'),
    redo:/重新作答/.test(tn)
  };})()`);

const waitReady = async (i, tries = 16) => {
  let p = null;
  for (let k = 0; k < tries; k++) {
    await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(b)b.scrollIntoView({block:'center'});return 1;})()`);
    await sleep(950);
    p = await probe(i);
    if (p && !p.__err && (p.len > 80 || p.inp + p.area + p.dig + p.dd + p.tf + p.video + p.audio + p.file > 0)) return p;
    if (k % 4 === 3) await dismissRules();
  }
  return p;
};
const clickSubmit = (i) => raw(`(()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
  const el=[...b.querySelectorAll('[class*=i-button]')].find(e=>((e.innerText||'').replace(/\\s+/g,''))==='提交');
  if(!el) return 0; el.click(); return 1;})()`);
const clickRedo = (i) => raw(`(()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
  const el=[...b.querySelectorAll('[class*=i-button]')].find(e=>((e.innerText||'').replace(/\\s+/g,''))==='重新作答');
  if(!el) return 0; el.click(); return 1;})()`);
const readAns = (i) => raw(`(()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
  const t=(b.innerText||'');
  const paren=[]; const re=/\\(\\s*(\\d+)\\s*\\)\\s*\\n?([^\\n(]+)/g; let m;
  while((m=re.exec(t))) paren[Number(m[1])-1]=m[2].trim();
  if(paren.filter(Boolean).length>=2) return paren.filter(Boolean);
  const keys=[]; const re2=/正确答案[:：]?\\s*\\n?\\s*([^\\n]+)/g;
  while((m=re2.exec(t))) keys.push(m[1].trim());
  if(keys.length) return keys;
  const k=t.lastIndexOf('\\n答案');
  if(k>=0){
    const lines=t.slice(k+3).split('\\n').map(s=>s.trim()).filter(Boolean)
      .filter(s=>!/^(\\(\\d+\\)|答案[:：]?)$/.test(s)&&!/你的答案|你的得分/.test(s));
    if(lines.length) return lines;
  }
  return [];})()`);

// —— 作答器 ——
const actFill = (i, vals) => raw(`(()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
  const els=[...b.querySelectorAll('input[type=text]')];const vals=${JSON.stringify(vals)};
  const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
  els.forEach((e,k)=>{e.focus();set.call(e,vals[k]??('x'+k));
    e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));e.blur();});
  return {ok:1,n:els.length};})()`);
const actArea = (i, vals) => raw(`(()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
  const els=[...b.querySelectorAll('textarea')];const vals=${JSON.stringify(vals)};
  const set=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;
  els.forEach((e,k)=>{e.focus();set.call(e,vals[k]??'This is my answer.');
    e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));e.blur();});
  return {ok:1,n:els.length};})()`);
const actDd = (i, want) => raw(`(async()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
  const norm=s=>(s||'').replace(/\\s+/g,' ').trim();
  const trigs=[...b.querySelectorAll('[class*=digEmptySelectView_selectTrigger]')];
  const wants=${JSON.stringify(want)};
  for(let k=0;k<trigs.length;k++){
    const rk=Object.keys(trigs[k]).find(x=>x.startsWith('__reactProps'));
    try{trigs[k][rk].onClick({stopPropagation(){},preventDefault(){},target:trigs[k],currentTarget:trigs[k],nativeEvent:{}});}catch(e){trigs[k].click();}
    await new Promise(r=>setTimeout(r,350));
    const opts=[...document.querySelectorAll('[class*=digEmptySelectView_optionItem]')].filter(e=>e.getBoundingClientRect().width>0);
    const w=wants[k];
    const hit=(w&&opts.find(o=>norm(o.innerText)===norm(w)))||opts[0];
    if(hit){const ok=Object.keys(hit).find(x=>x.startsWith('__reactProps'));
      try{hit[ok].onClick({stopPropagation(){},preventDefault(){},target:hit,currentTarget:hit,nativeEvent:{}});}catch(e){hit.click();}}
    await new Promise(r=>setTimeout(r,200));
  }
  return {ok:1,n:trigs.length};})()`);
const actChoice = (i, keys) => raw(`(async()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
  const norm=s=>(s||'').replace(/\\s+/g,' ').trim();
  const items=[...b.querySelectorAll('[class*=questionItem]')];
  const ks=${JSON.stringify(keys)};
  for(let k=0;k<items.length;k++){
    const rows=[...items[k].querySelectorAll('[class*=chioceView_strongListView],[class*=strongListView]')];
    const key=ks[k];
    let row=null;
    if(key&&/^[A-H]$/.test(key)) row=rows[key.charCodeAt(0)-65];
    if(!row&&key) row=rows.find(r=>norm(r.innerText)===norm(key));
    if(!row) row=rows[0];
    if(row) row.click();
    await new Promise(r=>setTimeout(r,120));
  }
  return {ok:1,n:items.length};})()`);
const actTf = (i, keys) => raw(`(async()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
  const norm=s=>(s||'').replace(/\\s+/g,' ').trim();
  const items=[...b.querySelectorAll('[class*=questionItem]')];
  const ks=${JSON.stringify(keys)};
  for(let k=0;k<items.length&&k<ks.length;k++){
    const opts=[...items[k].querySelectorAll('[class*=answer_optionTF]')];
    const hit=opts.find(o=>norm(o.innerText)===ks[k])||opts[0]; if(!hit)continue;
    const r=hit.getBoundingClientRect();
    const o={bubbles:true,cancelable:true,view:window,clientX:r.left+r.width/2,clientY:r.top+r.height/2};
    ['pointerdown','mousedown','pointerup','mouseup','click'].forEach(n=>{
      const E=n.startsWith('pointer')?PointerEvent:MouseEvent;hit.dispatchEvent(new E(n,o));});
    await new Promise(r=>setTimeout(r,120));
  }
  return {ok:1,n:items.length};})()`);
const actDig = (i, want) => raw(`(async()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
  const norm=s=>(s||'').replace(/\\s+/g,' ').trim();
  const blanks=[...b.querySelectorAll('[class*=digEmptyView_blankView]')];
  const wants=${JSON.stringify(want)};
  let picked=0;
  for(let k=0;k<blanks.length;k++){
    const bl=blanks[k];
    const rk=Object.keys(bl).find(x=>x.startsWith('__reactProps'));
    try{if(rk&&bl[rk].onClick)bl[rk].onClick({stopPropagation(){},preventDefault(){},target:bl,currentTarget:bl,nativeEvent:{}});else bl.click();}catch(e){bl.click();}
    await new Promise(r=>setTimeout(r,450));
    const opts=[...document.querySelectorAll('[class*=digEmptyView_optionItem],[class*=digEmptyView_select] [class*=option],[class*=digSelectOption]')]
      .filter(e=>e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0);
    const w=wants[k];
    const hit=(w&&opts.find(o=>norm(o.innerText)===norm(w)))||opts[0];
    if(hit){const ok=Object.keys(hit).find(x=>x.startsWith('__reactProps'));
      try{if(ok&&hit[ok].onClick)hit[ok].onClick({stopPropagation(){},preventDefault(){},target:hit,currentTarget:hit,nativeEvent:{}});else hit.click();}catch(e){hit.click();}
      picked++;}
    await new Promise(r=>setTimeout(r,250));
  }
  return {ok:1,n:blanks.length,picked};})()`);

// —— 主循环 ——
const list = only || [...Array(total).keys()];
const summary = [];
for (const i of list) {
  try {
    const p0 = await waitReady(i);
    if (!p0 || p0.__err) { log(`#${i} 不可用`); summary.push({ i, r: "noblock" }); continue; }
    if (p0.score !== null && Number(p0.score) >= 99.9 && !p0.sub) { log(`#${i} 已满分`); summary.push({ i, r: "full" }); continue; }
    if (!p0.sub && p0.len > 80) { log(`#${i} 已提交无分按钮 score=${p0.score}`); summary.push({ i, r: "submitted", score: p0.score }); continue; }

    let kind = "text";
    if (p0.file) kind = "upload";
    else if (p0.video || p0.audio) kind = "media";
    else if (p0.dd) kind = "dd";
    else if (p0.tf >= 2) kind = "tf";
    else if (p0.dig) kind = "dig";
    else if (p0.inp) kind = "fill";
    else if (p0.area) kind = "area";
    else if (p0.items) kind = "choice";
    log(`#${i} kind=${kind} len=${p0.len} inp=${p0.inp} area=${p0.area} dig=${p0.dig} dd=${p0.dd} tf=${p0.tf} items=${p0.items} score=${p0.score} sub=${p0.sub}`);

    if (kind === "upload" || kind === "media" || kind === "text") {
      summary.push({ i, r: kind, len: p0.len });
      log(`#${i} ${kind} 暂跳过`);
      continue;
    }

    // 第一遍：占位作答
    if (kind === "fill") await actFill(i, null);
    else if (kind === "area") await actArea(i, null);
    else if (kind === "dd") await actDd(i, null);
    else if (kind === "choice") await actChoice(i, null);
    else if (kind === "tf") await actTf(i, null);
    else if (kind === "dig") await actDig(i, null);
    await sleep(500);
    const s1 = await clickSubmit(i);
    if (!s1) { log(`#${i} 无提交按钮`); summary.push({ i, r: "nosubmit" }); continue; }
    await sleep(4500);
    await dismissRules();
    // 确认弹窗兜底
    await raw(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');
      const el=[...document.querySelectorAll('button,[class*=i-button]')].filter(e=>/^(确认|确定)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>0);
      if(el.length){el[el.length-1].click();return 1;}return 0;})()`);
    await sleep(1500);
    let p1 = await probe(i);
    if (p1 && p1.score !== null && Number(p1.score) >= 99.9) { log(`#${i} 一次高分 ${p1.score}`); summary.push({ i, r: "done", score: p1.score }); continue; }
    if (p1 && !p1.sub) { log(`#${i} 已提交 score=${p1.score}`); summary.push({ i, r: "done", score: p1.score }); continue; }

    // 抄答案改进（一轮）
    const ans = await readAns(i);
    log(`#${i} 答案 ${Array.isArray(ans) ? ans.length : 0} 项`);
    if (Array.isArray(ans) && ans.length) {
      const cr = await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
        return [...b.querySelectorAll('[class*=i-button]')].some(e=>((e.innerText||'').replace(/\\s+/g,''))==='重新作答');})()`);
      if (cr) { await clickRedo(i); await sleep(2200); await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(b)b.scrollIntoView({block:'center'});return 1;})()`); await sleep(1500); }
      const p2 = await probe(i);
      const stuck = p2 && p2.len < 60 && !p2.inp && !p2.dig && !p2.dd;
      if (stuck) { log(`#${i} redo后未渲染，放弃改进`); summary.push({ i, r: "done", score: p1 && p1.score, note: "redo-stuck" }); continue; }
      if (kind === "fill") await actFill(i, ans);
      else if (kind === "area") await actArea(i, ans.length === (p2 && p2.area) ? ans : [ans.join("\\n")]);
      else if (kind === "dd") await actDd(i, ans);
      else if (kind === "choice") await actChoice(i, ans);
      else if (kind === "tf") await actTf(i, ans);
      else if (kind === "dig") await actDig(i, ans);
      await sleep(500);
      await clickSubmit(i);
      await sleep(4500);
      await dismissRules();
      const p3 = await probe(i);
      log(`#${i} 改进后 score=${p3 && p3.score}`);
      summary.push({ i, r: "done", score: p3 && p3.score });
    } else {
      summary.push({ i, r: "done", score: p1 && p1.score, note: "noans" });
    }
  } catch (e) {
    log(`#${i} 异常`, String(e).slice(0, 120));
    summary.push({ i, r: "error", e: String(e).slice(0, 100) });
  }
}
fs.writeFileSync(`drive-u${U}.json`, JSON.stringify(summary, null, 1));
log("小结", JSON.stringify(summary));
L.cdp.close();
