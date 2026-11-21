// pctrun.mjs <unit> — 百分比驱动：只攻 <100% 的小节（题块+慢滚），直到全 100%
import { CDP, sleep } from "./cdp.mjs";
import { connect } from "./utlib.mjs";
import { READER, COURSE, CH } from "./reader.mjs";
import fs from "node:fs";

const U = Number(process.argv[2]);
const ROUNDS = Number(process.env.ROUNDS || 3);
const SEC_SCROLL = Number(process.env.SEC_SCROLL || 5);   // 每小节每屏秒数
const SEC_SCREENS = Number(process.env.SEC_SCREENS || 14); // 每小节最多滚几屏
const log = (...a) => console.log(`[pct${U}]`, ...a);
process.on("uncaughtException", (e) => log("uncaught:", String(e).slice(0, 110)));

const getVer = async () => (await fetch("http://127.0.0.1:9222/json/version")).json();
const getTabs = async () => (await fetch("http://127.0.0.1:9222/json/list")).json();
const { execSync } = await import("node:child_process");

// —— 入口：深路由新标签 + 章节校验 + 最多 3 次重试 ——
let L = null, tb = null;
for (let att = 1; att <= 3 && !tb; att++) {
  try {
    const bb = await CDP.connect((await getVer()).webSocketDebuggerUrl);
    for (const t of (await getTabs()).filter(t => /ucontent\.unipus\.cn/.test(t.url))) await bb.send("Target.closeTarget", { targetId: t.id }).catch(() => {});
    await sleep(800);
    const rr = await bb.send("Target.createTarget", { url: `${READER}#/${COURSE}/courseware/u${U}/u${U}g2` });
    bb.close();
    await sleep(11000);
    const tu = (await getTabs()).find(t => t.id === rr.targetId);
    if (tu && /sso\.unipus\.cn\/sso\/login/.test(tu.url)) {
      log("SSO detected, relogin");
      try { execSync("node relogin2.mjs", { cwd: process.cwd(), env: { ...process.env, UNIPUS_USER: process.env.UNIPUS_USER || "USER_A_PHONE", UNIPUS_PASS: process.env.UNIPUS_PASS || "REDACTED_PW" }, stdio: "pipe", timeout: 120000 }); } catch {}
      await sleep(3000);
    }
    L = await connect(rr.targetId);
    for (let k = 0; k < 30 && !tb; k++) {
      const fl = await L.frames();
      tb = fl.find(f => f.url.includes("textbook/book") && f.ctx && f.url.includes((CH[U] || "??").slice(0, 12)));
      if (!tb) await sleep(1000);
    }
    if (!tb) {
      log(`attempt${att}: 章节不匹配，重试`);
      try { L.cdp.close(); } catch {}
      const bb2 = await CDP.connect((await getVer()).webSocketDebuggerUrl);
      await bb2.send("Target.closeTarget", { targetId: rr.targetId }).catch(() => {});
      bb2.close();
      await sleep(2000);
    }
  } catch (e) { log(`attempt${att} 异常`, String(e).slice(0, 90)); await sleep(2000); }
}
if (!tb) { log("入口失败"); process.exit(1); }
const { ev, frames, cdp, sessionId } = L;
const refindTb = async (tries = 55) => {
  for (let k = 0; k < tries; k++) {
    tb = (await frames()).find(f => f.url.includes("textbook/book") && f.ctx && f.url.includes((CH[U] || "??").slice(0, 12)));
    if (tb) {
      const n = await tiny(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`);
      if (n > 0) return true;
    }
    await sleep(1000);
  }
  return false;
};
const tiny = async (e) => {
  if (!tb) return null;
  const rr = await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true, contextId: tb.ctx }, sessionId).catch(() => null);
  return rr && rr.result ? rr.result.value : null;
};
const frameRaw = async (expr) => {
  let v = await tiny(expr);
  if (v && v !== 0 && v !== false && v != null) return v;
  for (const f of await frames()) {
    try {
      const rr = await cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true, contextId: f.ctx }, sessionId);
      if (!rr.exceptionDetails && rr.result && rr.result.value && rr.result.value !== 0 && rr.result.value !== false) return rr.result.value;
    } catch {}
  }
  return v;
};
const dismissRules = async () => {
  for (const f of await frames()) {
    await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='我知道了'&&e.getBoundingClientRect().width>20);if(v.length){v[v.length-1].click();return 1;}return 0;})()`, f.ctx).catch(() => 0);
  }
};
if (!(await refindTb())) { log("NO TB"); process.exit(1); }
await dismissRules();

// —— 读目录树（含百分比）——
const readTree = () => frameRaw(`(()=>{
  const seen=new Set(); const out=[];
  [...document.querySelectorAll('[class*=i-tree-menu_title-flex]')].forEach(e=>{
    let t=(e.innerText||'').replace(/\\s+/g,' ').trim();
    if(!t||t.length>60)return;
    const m=t.match(/(\\d+(?:\\.\\d+)?)\\s*%\\s*$/);
    const pct=m?Number(m[1]):null;
    const name=t.replace(/\\s*\\d+(?:\\.\\d+)?\\s*%\\s*$/,'').trim();
    const key=name;
    if(seen.has(key))return; seen.add(key);
    out.push({name,pct});
  });
  return out;})()`);

const clickSection = (name) => frameRaw(`(()=>{
  const el=[...document.querySelectorAll('[class*=i-tree-menu_title-flex]')].find(e=>{
    const t=(e.innerText||'').replace(/\\s+/g,' ').trim().replace(/\\s*\\d+(?:\\.\\d+)?\\s*%\\s*$/,'').trim();
    return t===${JSON.stringify(name)};
  });
  if(!el)return 0;
  const rk=Object.keys(el).find(k=>k.startsWith('__reactProps'));
  if(rk&&el[rk].onClick){el[rk].onClick({stopPropagation(){},preventDefault(){},target:el,currentTarget:el,nativeEvent:{}});return 1;}
  el.click();return 1;})()`);

// —— 块处理（与 unitfull 同配方，精简版）——
const state = (i) => tiny(`(()=>{
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
const btn = (i, label) => tiny(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
  const el=[...b.querySelectorAll('[class*=i-button]')].find(e=>((e.innerText||'').replace(/\\s+/g,''))===${JSON.stringify(label)});
  if(el){el.click();return 1;}return 0;})()`);
const scrollBlk = (i) => tiny(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(b)b.scrollIntoView({block:'center'});return 1;})()`);
const getText = (i) => tiny(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];return (b.innerText||'');})()`);
const fillInputs = (i, vals) => tiny(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
  const els=[...b.querySelectorAll('input[type=text]')];const vals=${JSON.stringify(vals)};
  const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
  els.forEach((e,k)=>{e.focus();set.call(e,vals[k]??('answer '+(k+1)));
    e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));e.blur();});
  return els.length;})()`);
const fillAreas = (i, v) => tiny(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
  const els=[...b.querySelectorAll('textarea')];
  const set=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;
  els.forEach((e,k)=>{e.focus();set.call(e,${JSON.stringify(v)});
    e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));e.blur();});
  return els.length;})()`);
const pickOptions = (i, wants, trigSel, optSel) => frameRaw(`(async()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
  const norm=s=>(s||'').replace(/\\s+/g,' ').trim();
  const trigs=[...b.querySelectorAll('${trigSel}')];
  const wants=${JSON.stringify(wants)};
  for(let k=0;k<trigs.length;k++){
    const rk=Object.keys(trigs[k]).find(x=>x.startsWith('__reactProps'));
    try{if(rk&&trigs[k][rk].onClick)trigs[k][rk].onClick({stopPropagation(){},preventDefault(){},target:trigs[k],currentTarget:trigs[k],nativeEvent:{}});else trigs[k].click();}catch(e){trigs[k].click();}
    await new Promise(r=>setTimeout(r,400));
    const opts=[...document.querySelectorAll('${optSel}')].filter(e=>e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0);
    const w=wants[k];
    const hit=(w&&opts.find(o=>norm(o.innerText)===norm(w)))||(w&&opts.find(o=>norm(o.innerText).includes(norm(w))))||opts[0];
    if(hit){const ok=Object.keys(hit).find(x=>x.startsWith('__reactProps'));
      try{if(ok&&hit[ok].onClick)hit[ok].onClick({stopPropagation(){},preventDefault(){},target:hit,currentTarget:hit,nativeEvent:{}});else hit.click();}catch(e){hit.click();}}
    await new Promise(r=>setTimeout(r,200));
  }
  return trigs.length;})()`);
const actChoice = (i, keys) => tiny(`(async()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
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
    await new Promise(r=>setTimeout(r,120));
  }
  return items.length;})()`);
const actTf = (i, keys) => tiny(`(async()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
  const norm=s=>(s||'').replace(/\\s+/g,' ').trim();
  const items=[...b.querySelectorAll('[class*=questionItem]')];
  const ks=${JSON.stringify(keys)};
  for(let k=0;k<items.length;k++){
    const opts=[...items[k].querySelectorAll('[class*=answer_optionTF]')];
    const hit=opts.find(o=>norm(o.innerText)===ks[k])||opts[0]; if(!hit)continue;
    const rr=hit.getBoundingClientRect();
    const o={bubbles:true,cancelable:true,view:window,clientX:rr.left+rr.width/2,clientY:rr.top+rr.height/2};
    ['pointerdown','mousedown','pointerup','mouseup','click'].forEach(n=>{const E=n.startsWith('pointer')?PointerEvent:MouseEvent;hit.dispatchEvent(new E(n,o));});
    await new Promise(r=>setTimeout(r,120));
  }
  return items.length;})()`);
const confirmOk = () => frameRaw(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');
  const el=[...document.querySelectorAll('button,[class*=i-button]')].filter(e=>/^(确认|确定)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>0);
  if(el.length){el[el.length-1].click();return 1;}return 0;})()`);
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
  await scrollBlk(i); await sleep(600);
  let st = await state(i);
  if (!st || st.__err || st.len < 80) return { r: "thin" };
  if (st.score !== null && Number(st.score) >= 99.9 && !st.sub) return { r: "full" };
  if (!st.sub && !st.redo) return { r: "submitted" };
  let kind = "text";
  if (st.file) kind = "upload";
  else if (st.video || st.audio) kind = "media";
  else if (st.dd) kind = "dd";
  else if (st.tf >= 2) kind = "tf";
  else if (st.inp) kind = "fill";
  else if (st.dig) kind = "dig";
  else if (st.area) kind = "area";
  else if (st.items) kind = "choice";
  if (kind === "upload" || kind === "media" || kind === "text") return { r: kind };
  if (st.sub && st.score === null) {
    if (kind === "fill") await fillInputs(i, Array.from({ length: st.inp }, (_, k) => "x" + (k + 1)));
    else if (kind === "area") await fillAreas(i, "This is my answer. I have considered the question carefully and written my key points here.");
    else if (kind === "dd") await pickOptions(i, null, "[class*=digEmptySelectView_selectTrigger]", "[class*=digEmptySelectView_optionItem]");
    else if (kind === "dig") await pickOptions(i, null, "[class*=digEmptyView_blankView]", "[class*=digEmptyView_optionItem],[class*=digEmptyView_labelView]");
    else if (kind === "choice") await actChoice(i, null);
    else if (kind === "tf") await actTf(i, null);
    await sleep(400);
    await btn(i, "提交");
    await sleep(4800);
    await confirmOk(); await sleep(900); await dismissRules();
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
    await btn(i, "重新作答"); await sleep(2300); await scrollBlk(i); await sleep(1200);
    const st2 = await state(i);
    if (st2.len >= 40 || st2.inp || st2.dig || st2.dd) {
      if (kind === "fill") await fillInputs(i, answers.length >= st2.inp ? answers : Array.from({ length: st2.inp }, (_, k) => answers[k] ?? "answer " + (k + 1)));
      else if (kind === "area") await fillAreas(i, answers.join("\n"));
      else if (kind === "dd") await pickOptions(i, answers, "[class*=digEmptySelectView_selectTrigger]", "[class*=digEmptySelectView_optionItem]");
      else if (kind === "dig") await pickOptions(i, answers, "[class*=digEmptyView_blankView]", "[class*=digEmptyView_optionItem],[class*=digEmptyView_labelView]");
      else if (kind === "choice") await actChoice(i, answers);
      else if (kind === "tf") await actTf(i, answers);
      await sleep(400);
      await btn(i, "提交"); await sleep(4800);
      await confirmOk(); await sleep(900); await dismissRules();
      const st3 = await state(i);
      return { r: "done", score: st3.score, kind };
    }
    return { r: "done", score: st.score, kind, note: "redo-stuck" };
  }
  return { r: "done", score: st.score, kind, note: answers.length ? "" : "noans" };
};

// —— 主流程 ——
const doneBlocks = new Set();
const results = {};
for (let round = 0; round < ROUNDS; round++) {
  let tree = (await readTree()) || [];
  let targets = tree.filter(x => x.pct !== null && x.pct < 100);
  const unknown = tree.filter(x => x.pct === null);
  if (round === 0) targets = targets.concat(unknown);
  log(`round${round}: 小节=${tree.length} 目标=${targets.length} (${targets.map(t => t.name + ":" + t.pct).join(" | ").slice(0, 220)})`);
  if (!targets.length) { log("全部小节 100% 或无目标"); break; }
  let progressed = false;
  for (const tgt of targets) {
    const clicked = await clickSection(tgt.name);
    if (!clicked) { log(`  ${tgt.name} 点击失败`); continue; }
    await sleep(4800);
    await dismissRules();
    if (!(await refindTb(10))) { log(`  ${tgt.name} 丢帧`); continue; }
    // 处理本节渲染出的题块
    const lens = (await tiny(`[...document.querySelectorAll('div.editor-question-block.questionBlockNode')].map(b=>(b.innerText||'').length)`)) || [];
    for (let i = 0; i < lens.length; i++) {
      const key = tgt.name + "#" + i;
      if (doneBlocks.has(key) || lens[i] < 80) continue;
      try {
        const rr = await processBlock(i);
        if (rr.r !== "thin") { doneBlocks.add(key); progressed = true; }
        results[key] = rr;
        log(`  ${tgt.name} #${i}`, JSON.stringify(rr).slice(0, 90));
      } catch (e) { log(`  ${tgt.name} #${i} 异常`, String(e).slice(0, 80)); }
    }
    // 小节内慢滚（上报阅读节点）
    const screens = await tiny(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;return Math.max(1,Math.min(${SEC_SCREENS},Math.round(sc.clientHeight?1:1)+${SEC_SCREENS}));})()`);
    for (let s = 0; s < SEC_SCREENS; s++) {
      await tiny(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollBy(0,Math.round(window.innerHeight*0.9));return 1;})()`).catch(() => {});
      await sleep(SEC_SCROLL * 1000);
    }
    // 复读本节百分比
    const tree2 = (await readTree()) || [];
    const now = tree2.find(x => x.name === tgt.name);
    log(`  ${tgt.name}: ${tgt.pct}% -> ${now ? now.pct + "%" : "?"}`);
    if (now && tgt.pct !== null && now.pct !== null && now.pct !== tgt.pct) progressed = true;
  }
  if (!progressed) { log("本轮无进展，结束"); break; }
}
const finalTree = (await readTree()) || [];
fs.writeFileSync(`pct-u${U}.json`, JSON.stringify(finalTree, null, 1));
log("最终目录:", JSON.stringify(finalTree.map(x => `${x.name}:${x.pct === null ? "-" : x.pct + "%"}`)));
cdp.close();
