// patient2.mjs [unit] — 用"已重新进入的最新版阅读器"逐块收割；unit 可选（用目录树切换）
import { connect, sleep } from "./utlib.mjs";
import { CH } from "./reader.mjs";
import fs from "node:fs";
const TARGET_U = process.argv[2] ? Number(process.argv[2]) : null;
const BLOCK_WAIT_MS = Number(process.env.BLOCK_WAIT_MS || 30000);
const log = (...a) => console.log("[p2]", ...a);
process.on("uncaughtException", (e) => log("uncaught:", String(e).slice(0, 110)));
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
if (!rd) { log("NO READER — run _reenter first"); process.exit(1); }
const L = await connect(rd.id);
const { ev, frames, cdp, sessionId } = L;
const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId).catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
};
let tb = null;
const refindTb = async (tries = 60) => {
  for (let k = 0; k < tries; k++) {
    tb = (await frames()).find(f => f.url.includes("textbook/book") && f.ctx);
    if (tb) { const n = await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`, tb.ctx).catch(() => 0); if (n > 0) return true; }
    await new Promise(r => setTimeout(r, 1000));
  }
  return false;
};
// RATE-RECOVER：重载页面等待限流恢复（NORELOAD=1 时跳过，页面已由 enterunit 刷好）
if (!process.env.NORELOAD) {
  await cdp.send("Page.reload", {}, sessionId).catch(() => {});
  await sleep(20000);
  if (!(await refindTb())) { log("NO TB"); process.exit(1); }
  log("RATE-RECOVER 完成");
} else {
  if (!(await refindTb())) { log("NO TB (NORELOAD)"); process.exit(1); }
  log("NORELOAD 直接开始");
}
const dismissRules = async () => {
  for (let i = 0; i < 4; i++) {
    let hit = false;
    for (const f of await frames()) {
      const p = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>/^(我知道了|知道了)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>20);if(!v.length)return null;const b=v[v.length-1].getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, f.ctx).catch(() => null);
      if (p) { await mouse(p.x, p.y); await sleep(1200); hit = true; break; }
    }
    if (!hit) break;
  }
};
const expandCollapsed = async () => {
  const n = await ev(`(async()=>{
    const cols=[...document.querySelectorAll([class*=collapsible-container])];
    let opened=0;
    for(const c of cols){
      const body=c.querySelector([class*=collapsible-content]);
      if(!body)continue;
      if(body.getBoundingClientRect().height<20){
        const head=c.querySelector([class*=collapsible-head]);
        if(head){const rk=Object.keys(head).find(k=>k.startsWith(__reactProps));
          try{if(rk&&head[rk].onClick)head[rk].onClick({stopPropagation(){},preventDefault(){},target:head,currentTarget:head,nativeEvent:{}});else head.click();}catch(e){head.click();}
          opened++;await new Promise(r=>setTimeout(r,350));}
      }
    }
    return opened;})()`, tb.ctx).catch(()=>0);
  if (n) log("展开折叠区:", n);
  await sleep(3000);
};
// 关掉可能开着的目录抽屉（抽屉开着时题目块内容不渲染！）
for (let k = 0; k < 3; k++) {
  const dp = await ev(`(()=>{const e=document.querySelector('[class*=catalog_drawer-close]');if(!e)return null;const b=e.getBoundingClientRect();if(b.width<3)return null;return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, tb.ctx).catch(() => null);
  if (!dp) break;
  await mouse(dp.x, dp.y); await sleep(900);
}
// 滚动预热，让懒加载块挂载
for (let k = 0; k < 6; k++) {
  await ev(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollBy(0,Math.round(innerHeight*0.8));return 1;})()`, tb.ctx).catch(() => {});
  await sleep(1000);
}
await dismissRules();
await expandCollapsed();

// 如需切换单元：点目录里的 "Unit N ..."
const switchUnit = async (u) => {
  // 打开抽屉（三重兜底：按钮→左边缘坐标→重试）
  for (let i = 0; i < 4; i++) {
    const opened0 = await ev(`(()=>{const e=document.querySelector('[class*=catalog_drawer-close]');if(!e)return 0;const b=e.getBoundingClientRect();return b.width>3?1:0;})()`, tb.ctx).catch(() => 0);
    if (opened0) break;
    const op = await ev(`(()=>{const e=document.querySelector('[class*=catalog_area-open-menu]');if(!e)return null;const b=e.getBoundingClientRect();if(b.width<3)return null;return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, tb.ctx).catch(() => null);
    if (op) { await mouse(op.x, op.y); }
    else { await mouse(22, 183); }
    await sleep(2500);
  }
  // 滚到顶
  await ev(`(()=>{const sc=document.querySelector('[class*=i-tree-menu_tree-menu]');if(sc)sc.scrollTop=0;return 1;})()`, tb.ctx).catch(() => {});
  await sleep(800);
  // 找 Unit N 标题
  let p = null;
  for (let k = 0; k < 10 && !p; k++) {
    p = await ev(`(()=>{const el=[...document.querySelectorAll('[class*=i-tree-menu_title-flex]')].find(e=>{const t=(e.innerText||'').replace(/\\s+/g,'');return t.startsWith('Unit${u}')||t.startsWith('Unit ${u}');});if(!el)return null;const b=el.getBoundingClientRect();if(b.top<0||b.top>window.innerHeight-30)return {out:1};return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, tb.ctx).catch(() => null);
    if (p && p.x) break;
    await ev(`(()=>{const sc=document.querySelector('[class*=i-tree-menu_tree-menu]');if(sc)sc.scrollTop=0;return 1;})()`, tb.ctx).catch(() => {});
    await sleep(700);
    p = null;
  }
  if (!p) { log("unit title not found"); return false; }
  await mouse(p.x, p.y);
  await sleep(6000);
  await dismissRules();
  // 关抽屉
  for (let k = 0; k < 2; k++) {
    const dp = await ev(`(()=>{const e=document.querySelector('[class*=catalog_drawer-close]');if(!e)return null;const b=e.getBoundingClientRect();if(b.width<3)return null;return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, tb.ctx).catch(() => null);
    if (!dp) break;
    await mouse(dp.x, dp.y); await sleep(1000);
  }
  return await refindTb(30);
};

if (TARGET_U) {
  const ok = await switchUnit(TARGET_U);
  log("switch to unit", TARGET_U, ok);
}
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
    score:(tn.match(/得分[:：]?\\s*(\\d+(\\.\\d+)?)/)||[])[1]??null};
})()`, tb.ctx).catch(() => null);
const waitPatient = async (i) => {
  const t0 = Date.now(); let s = null;
  while (Date.now() - t0 < BLOCK_WAIT_MS) {
    await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(b)b.scrollIntoView({block:'center'});return 1;})()`, tb.ctx).catch(() => {});
    await sleep(1100);
    s = await probe(i);
    if (s) {
      const ctrl = s.area + s.inp + s.dig + s.dd + s.tf + s.items + s.file + s.video + s.audio;
      if (s.sub && (ctrl > 0 || s.len > 80)) return s;
      if (s.redo) return s;
      if (s.len > 80 && ctrl === 0) return s;
    }
    await sleep(700);
  }
  return s;
};
// 答案区解析（Node 侧）
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
const getText = (i) => ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];return (b.innerText||'');})()`, tb.ctx).catch(() => "");
const fillInputs = (i, vals) => ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
  const els=[...b.querySelectorAll('input[type=text]')];const vals=${JSON.stringify(vals)};
  const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
  els.forEach((e,k)=>{e.focus();set.call(e,vals[k]??('answer '+(k+1)));
    e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));e.blur();});
  return els.length;})()`, tb.ctx);
const fillAreas = (i, v) => ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
  const els=[...b.querySelectorAll('textarea')];
  const set=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;
  els.forEach(e=>{e.focus();set.call(e,${JSON.stringify(v)});
    e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));e.blur();});
  return els.length;})()`, tb.ctx);
const pickOpts = (i, wants, trigSel, optSel) => ev(`(async()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
  const norm=s=>(s||'').replace(/\\s+/g,' ').trim();
  const trigs=[...b.querySelectorAll('${trigSel}')];const wants=${JSON.stringify(wants)};
  for(let k=0;k<trigs.length;k++){
    const rk=Object.keys(trigs[k]).find(x=>x.startsWith('__reactProps'));
    try{if(rk&&trigs[k][rk].onClick)trigs[k][rk].onClick({stopPropagation(){},preventDefault(){},target:trigs[k],currentTarget:trigs[k],nativeEvent:{}});else trigs[k].click();}catch(e){trigs[k].click();}
    await new Promise(r=>setTimeout(r,420));
    const opts=[...document.querySelectorAll('${optSel}')].filter(e=>e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0);
    const w=wants[k];
    const hit=(w&&opts.find(o=>norm(o.innerText)===norm(w)))||(w&&opts.find(o=>norm(o.innerText).includes(norm(w))))||opts[0];
    if(hit){const ok=Object.keys(hit).find(x=>x.startsWith('__reactProps'));
      try{if(ok&&hit[ok].onClick)hit[ok].onClick({stopPropagation(){},preventDefault(){},target:hit,currentTarget:hit,nativeEvent:{}});else hit.click();}catch(e){hit.click();}}
    await new Promise(r=>setTimeout(r,220));}
  return trigs.length;})()`, tb.ctx);
const acts = {
  choice: (i) => ev(`(async()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
    const items=[...b.querySelectorAll('[class*=questionItem]')];
    items.forEach(it=>{const rows=[...it.querySelectorAll('[class*=chioceView_strongListView],[class*=strongListView]')];if(rows[0])rows[0].click();});
    return 1;})()`, tb.ctx),
  tf: (i) => ev(`(async()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
    const items=[...b.querySelectorAll('[class*=questionItem]')];
    items.forEach(it=>{const opts=[...it.querySelectorAll('[class*=answer_optionTF]')];const t2=opts[0];
      if(t2){const rr=t2.getBoundingClientRect();const o={bubbles:true,cancelable:true,view:window,clientX:rr.left+rr.width/2,clientY:rr.top+rr.height/2};
        ['pointerdown','mousedown','pointerup','mouseup','click'].forEach(n=>{const E=n.startsWith('pointer')?PointerEvent:MouseEvent;t2.dispatchEvent(new E(n,o));});}});
    return 1;})()`, tb.ctx),
};
const doUpload = async (i) => {
  const fsx = await import("node:fs");
  const pathx = await import("node:path");
  const { execSync } = await import("node:child_process");
  const TMP = process.env.TEMP || "C:\\Windows\\Temp";
  // 题面文本
  const txt = await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];return (b.innerText||'').slice(0,800);})()`) || "Writing task";
  const src = pathx.join(TMP, "upsrc-" + i + ".txt");
  fsx.writeFileSync(src, "Task (Unit " + (TARGET_U || "cur") + ")\n\n" + String(txt).replace(/提交|上传|计分|自动判题/g, "").trim() + "\n\nMy Answer:\n\nAgriculture has always been the foundation of human civilization. In this task, I have studied the key points of this unit and would like to share my understanding. Modern farming methods have greatly improved productivity, while traditional wisdom keeps the soil healthy for future generations. Balancing efficiency with sustainability is the main message of this unit. In conclusion, this unit has deepened my understanding of agriculture and its role in culture and society.");
  const pdf = pathx.join(TMP, "U" + (TARGET_U || "cur") + "_Task" + i + ".pdf");
  try { execSync('node mkpdf.mjs "' + pdf + '" "Task" "' + src + '"', { cwd: process.cwd(), stdio: "pipe", timeout: 30000 }); } catch (e) { return { r: "upload", note: "pdf-fail" }; }
  if (!fsx.existsSync(pdf)) return { r: "upload", note: "pdf-missing" };
  // 滚到块
  for (let k = 0; k < 6; k++) {
    await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(!b)return 0;
      const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;
      const rr=b.getBoundingClientRect(),box=sc.getBoundingClientRect();sc.scrollTop+=(rr.top-box.top)-25;return 1;})()`, tb.ctx).catch(()=>0);
    await sleep(1300);
    const has = await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];return b?b.querySelectorAll('.ant-upload-btn,input[type=file]').length:0;})()`);
    if (has) break;
  }
  await cdp.send("Page.enable", {}, sessionId).catch(() => {});
  await cdp.send("Page.setInterceptFileChooserDialog", { enabled: true }, sessionId).catch(() => {});
  let got = null;
  cdp.on("Page.fileChooserOpened", (q) => { got = q; });
  await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
    const s2=b.querySelector('.ant-upload-btn')||b.querySelector('input[type=file]');
    if(!s2)return 0; s2.click(); return 1;})()`);
  for (let k = 0; k < 14 && !got; k++) await sleep(400);
  if (!got) { await cdp.send("Page.setInterceptFileChooserDialog", { enabled: false }, sessionId).catch(() => {}); return { r: "upload", note: "no-chooser" }; }
  await cdp.send("DOM.setFileInputFiles", { files: [pdf], backendNodeId: got.backendNodeId }, sessionId);
  await cdp.send("Page.setInterceptFileChooserDialog", { enabled: false }, sessionId).catch(() => {});
  let attached = false;
  for (let k = 0; k < 10; k++) {
    await sleep(1600);
    const d = await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
      return {items:b.querySelectorAll('.ant-upload-list-item').length, n:(()=>{const fi=b.querySelector('input[type=file]');return fi?fi.files.length:0;})()};})()`);
    if (d && (d.items > 0 || d.n > 0)) { attached = true; break; }
  }
  await sleep(400);
  const sub = await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
    const el=[...b.querySelectorAll('[class*=i-button]')].find(e=>((e.innerText||'').replace(/\\s+/g,''))==='提交');
    if(el){el.click();return 1;}return 0;})()`);
  await sleep(6000);
  for (const f of await frames()) await ev(`(()=>{const n=s2=>(s2||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>/^(确认|确定)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>18);if(v.length){v[v.length-1].click();return 1;}return 0;})()`, f.ctx).catch(() => 0);
  await sleep(1500);
  const fin = await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
    const t=(b.innerText||'').replace(/\\s+/g,' ');
    return {redo:/重新作答/.test(t), score:(t.match(/得分[:：]?\\s*(\\d+(\\.\\d+)?)/)||[])[1]??null};})()`);
  return { r: "done", kind: "upload", attached, sub, score: fin && fin.score };
};
const proc = async (i) => {
  let s = await waitPatient(i);
  if (!s) return { r: "none" };
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
  if (kind === "upload") { try { return await doUpload(i); } catch (e) { return { r: "upload", note: String(e).slice(0,60) }; } }
  if (["media", "text"].includes(kind)) return { r: kind, len: s.len };
  // 占位提交
  if (s.sub && s.score === null) {
    if (kind === "fill") await fillInputs(i, Array.from({ length: s.inp }, (_, k) => "x" + (k + 1)));
    else if (kind === "area") await fillAreas(i, "This is my answer. I have considered the question and written my response with the key points from the passage.");
    else if (kind === "dd") await pickOpts(i, null, "[class*=digEmptySelectView_selectTrigger]", "[class*=digEmptySelectView_optionItem]");
    else if (kind === "dig") await pickOpts(i, null, "[class*=digEmptyView_blankView]", "[class*=digEmptyView_optionItem],[class*=digEmptyView_labelView]");
    else if (kind === "choice") await acts.choice(i);
    else if (kind === "tf") await acts.tf(i);
    await sleep(500);
    const sub0 = await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
      const el=[...b.querySelectorAll('[class*=i-button]')].find(e=>((e.innerText||'').replace(/\\s+/g,''))==='提交');
      if(el){el.click();return 1;}return 0;})()`, tb.ctx);
    if (!sub0) return { r: "nosub", kind };
    await sleep(6500);
    for (const f of await frames()) await ev(`(()=>{const n=s2=>(s2||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>/^(确认|确定)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>18);if(v.length){v[v.length-1].click();return 1;}return 0;})()`, f.ctx).catch(() => 0);
    await sleep(1200);
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
    await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
      const el=[...b.querySelectorAll('[class*=i-button]')].find(e=>((e.innerText||'').replace(/\\s+/g,''))==='重新作答');
      if(el)el.click();return !!el;})()`, tb.ctx);
    await sleep(2800);
    if (kind === "fill") await fillInputs(i, answers);
    else if (kind === "area") await fillAreas(i, answers.join("\n"));
    else if (kind === "dd") await pickOpts(i, answers, "[class*=digEmptySelectView_selectTrigger]", "[class*=digEmptySelectView_optionItem]");
    else if (kind === "dig") await pickOpts(i, answers, "[class*=digEmptyView_blankView]", "[class*=digEmptyView_optionItem],[class*=digEmptyView_labelView]");
    else if (kind === "choice") await acts.choice(i);
    else if (kind === "tf") await acts.tf(i);
    await sleep(500);
    const sub = await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
      const el=[...b.querySelectorAll('[class*=i-button]')].find(e=>((e.innerText||'').replace(/\\s+/g,''))==='提交');
      if(el){el.click();return 1;}return 0;})()`, tb.ctx);
    if (!sub) return { r: "done", score: s.score, kind, note: "nosub2" };
    await sleep(6500);
    for (const f of await frames()) await ev(`(()=>{const n=s2=>(s2||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>/^(确认|确定)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>18);if(v.length){v[v.length-1].click();return 1;}return 0;})()`, f.ctx).catch(() => 0);
    await sleep(1500);
    const fin = await probe(i);
    return { r: "done", score: fin && fin.score, kind };
  }
  return { r: "done", score: s.score, kind, note: answers.length ? "" : "noans" };
};

let total = await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`, tb.ctx).catch(() => 0);
log("blocks:", total);
const results = {};
for (let i = 0; i < total; i++) {
  try {
    await refindTb(3); // 每块前刷新帧（防止 ctx 失效）
    // 动态感知块数（切单元后壳数量会变化）
    let exists = await ev(`!![...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}]`, tb.ctx).catch(() => false);
    for (let k = 0; k < 4 && !exists; k++) {
      await refindTb(5);
      await sleep(1500);
      const t2 = await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`, tb.ctx).catch(() => 0);
      if (t2 > total) total = t2;
      exists = await ev(`!![...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}]`, tb.ctx).catch(() => false);
    }
    if (!exists) { results[i] = { r: "no-block" }; log(`#${i} 无块`); continue; }
    const rr = await proc(i); results[i] = rr; log(`#${i}`, JSON.stringify(rr));
  }
  catch (e) { log(`#${i} 异常`, String(e).slice(0, 90)); results[i] = { r: "err" }; }
}
fs.writeFileSync(`p2-${TARGET_U || "cur"}.json`, JSON.stringify(results, null, 1));
log("done,", Object.values(results).filter(r => ["done", "full", "full1"].includes(r.r)).length, "blocks");
// 可选：块后慢滚（上报 text 节点）
if (process.env.SCROLL === "1") {
  const screens = Number(process.env.SCREENS || 40);
  const sec = Number(process.env.SEC || 7);
  log("scroll pass", screens, "screens");
  await ev(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollTop=0;return 1;})()`, tb.ctx).catch(()=>{});
  await sleep(1500);
  for (let sc2 = 0; sc2 < screens; sc2++) {
    await ev(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollBy(0,Math.round(window.innerHeight*0.92));return 1;})()`, tb.ctx).catch(()=>{});
    await sleep(sec * 1000);
  }
  log("scroll done");
}
cdp.close();
