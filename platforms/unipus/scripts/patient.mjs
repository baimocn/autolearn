// patient.mjs <unit> [blocks|all] — 超高耐心版：每块最多等 90s，逐块处理
import { CDP, sleep } from "./cdp.mjs";
import { connect } from "./utlib.mjs";
import { READER, COURSE, CH } from "./reader.mjs";
import fs from "node:fs";
const U = Number(process.argv[2] || 1);
const ONLY = process.argv[3] && process.argv[3] !== "all" ? process.argv[3].split(",").map(Number) : null;
const BLOCK_WAIT_MS = Number(process.env.BLOCK_WAIT_MS || 90000);
const log = (...a) => console.log(`[pat${U}]`, ...a);
process.on("uncaughtException", (e) => log("uncaught:", String(e).slice(0, 110)));
const getVer = async () => (await fetch("http://127.0.0.1:9222/json/version")).json();
const getTabs = async () => (await fetch("http://127.0.0.1:9222/json/list")).json();
const b0 = await CDP.connect((await getVer()).webSocketDebuggerUrl);
for (const t of (await getTabs()).filter(t => /ucontent\.unipus\.cn/.test(t.url))) await b0.send("Target.closeTarget", { targetId: t.id }).catch(() => {});
await sleep(800);
const r = await b0.send("Target.createTarget", { url: `${READER}#/${COURSE}/courseware/u${U}/u${U}g2` });
b0.close();
await sleep(20000);
try {
  const { execSync } = await import("node:child_process");
  const tu = (await getTabs()).find(t => t.id === r.targetId);
  if (tu && /sso\.unipus\.cn\/sso\/login/.test(tu.url)) {
    log("SSO, relogin");
    try { execSync("node relogin2.mjs", { cwd: process.cwd(), env: { ...process.env, UNIPUS_USER: "USER_A_PHONE", UNIPUS_PASS: "REDACTED_PW" }, stdio: "pipe", timeout: 120000 }); } catch {}
    await sleep(3000);
  }
} catch {}
const L = await connect(r.targetId);
const { ev, frames, cdp, sessionId } = L;
let tb = null;
for (let k = 0; k < 120 && !tb; k++) {
  tb = (await frames()).find(f => f.url.includes("textbook/book") && f.ctx && f.url.includes((CH[U] || "??").slice(0, 12)));
  if (tb) { const n = await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`, tb.ctx).catch(() => 0); if (n > 0) break; }
  await sleep(1000);
}
if (!tb) { log("NO TB"); process.exit(1); }
const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId).catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
};
const dismissRules = async () => {
  for (let i = 0; i < 4; i++) {
    let hit = false;
    for (const f of await frames()) {
      const p = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='我知道了'&&e.getBoundingClientRect().width>20);if(!v.length)return null;const b=v[v.length-1].getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, f.ctx).catch(() => null);
      if (p) { await mouse(p.x, p.y); await sleep(1100); hit = true; break; }
    }
    if (!hit) break;
  }
};
await dismissRules();
// 关公告条 & 抽屉（腾出空间）
await mouse(1243, 101); await sleep(600);
for (let k = 0; k < 2; k++) {
  const dp = await ev(`(()=>{const e=document.querySelector('[class*=catalog_drawer-close]');if(!e)return null;const b=e.getBoundingClientRect();if(b.width<3)return null;return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, tb.ctx).catch(() => null);
  if (!dp) break;
  await mouse(dp.x, dp.y); await sleep(1000);
}

const total = await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`, tb.ctx).catch(() => 0);
log("blocks:", total);
const list = ONLY || [...Array(total).keys()];
const results = {};

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

// 超高耐心等待：滚进视口 + 每 2s 轮询，最长 BLOCK_WAIT_MS
const waitPatient = async (i) => {
  const t0 = Date.now();
  let s = null, seen = "";
  while (Date.now() - t0 < BLOCK_WAIT_MS) {
    // 轻微上下滚动，触发懒挂载
    await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(b)b.scrollIntoView({block:'center'});return 1;})()`, tb.ctx).catch(() => {});
    await sleep(1200);
    s = await probe(i);
    if (s) {
      const sig = `len=${s.len} ctrl=${s.area + s.inp + s.dig + s.dd + s.tf + s.items + s.file + s.video + s.audio} sub=${s.sub}`;
      if (sig !== seen) { seen = sig; log(`  #${i} ${sig} (t+${((Date.now() - t0) / 1000).toFixed(0)}s)`); }
      const ctrl = s.area + s.inp + s.dig + s.dd + s.tf + s.items + s.file + s.video + s.audio;
      if (s.sub && (ctrl > 0 || s.len > 80)) return s;
      if (s.redo) return s;
      if (s.len > 80 && ctrl === 0) return s;
    }
    await sleep(800);
  }
  return s;
};

const proc = async (i) => {
  let s = await waitPatient(i);
  if (!s) return { r: "none" };
  if (s.score !== null && Number(s.score) >= 99.9 && !s.sub) return { r: "full", score: s.score };
  if (!s.sub && !s.redo) return { r: "submitted", score: s.score };
  let kind = "text";
  if (s.file) kind = "upload";
  else if (s.video || s.audio) kind = "media";
  else if (s.dd) kind = "dd";
  else if (s.tf >= 2) kind = "tf";
  else if (s.inp) kind = "fill";
  else if (s.dig) kind = "dig";
  else if (s.area) kind = "area";
  else if (s.items) kind = "choice";
  if (["upload", "media", "text"].includes(kind)) return { r: kind, len: s.len };
  if (s.redo && s.score !== null) {
    await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
      const el=[...b.querySelectorAll('[class*=i-button]')].find(e=>((e.innerText||'').replace(/\\s+/g,''))==='重新作答');
      if(el)el.click();return !!el;})()`, tb.ctx);
    await sleep(3000);
    s = await probe(i) || s;
  }
  // 作答
  if (kind === "fill") {
    await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
      const els=[...b.querySelectorAll('input[type=text]')];
      const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
      els.forEach((e,k)=>{e.focus();set.call(e,'answer '+(k+1));
        e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));e.blur();});
      return els.length;})()`, tb.ctx);
  } else if (kind === "area") {
    await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
      const els=[...b.querySelectorAll('textarea')];
      const set=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;
      const v='Agriculture has always been the foundation of human civilization. In this task, I have studied the key points of this unit and would like to share my understanding. Modern farming methods have greatly improved productivity, while traditional wisdom keeps the soil healthy for future generations. In conclusion, this unit has deepened my understanding of agriculture.';
      els.forEach(e=>{e.focus();set.call(e,v);
        e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));e.blur();});
      return els.length;})()`, tb.ctx);
  } else if (kind === "choice") {
    await ev(`(async()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
      const items=[...b.querySelectorAll('[class*=questionItem]')];
      items.forEach(it=>{const rows=[...it.querySelectorAll('[class*=chioceView_strongListView],[class*=strongListView]')];if(rows[0])rows[0].click();});
      return 1;})()`, tb.ctx);
  } else if (kind === "tf") {
    await ev(`(async()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
      const items=[...b.querySelectorAll('[class*=questionItem]')];
      items.forEach(it=>{const opts=[...it.querySelectorAll('[class*=answer_optionTF]')];const t2=opts[0];
        if(t2){const rr=t2.getBoundingClientRect();const o={bubbles:true,cancelable:true,view:window,clientX:rr.left+rr.width/2,clientY:rr.top+rr.height/2};
          ['pointerdown','mousedown','pointerup','mouseup','click'].forEach(n=>{const E=n.startsWith('pointer')?PointerEvent:MouseEvent;t2.dispatchEvent(new E(n,o));});}});
      return 1;})()`, tb.ctx);
  } else if (kind === "dd") {
    await ev(`(async()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
      const trigs=[...b.querySelectorAll('[class*=digEmptySelectView_selectTrigger]')];
      for(const tr of trigs){const rk=Object.keys(tr).find(x=>x.startsWith('__reactProps'));
        try{if(rk&&tr[rk].onClick)tr[rk].onClick({stopPropagation(){},preventDefault(){},target:tr,currentTarget:tr,nativeEvent:{}});else tr.click();}catch(e){tr.click();}
        await new Promise(r=>setTimeout(r,400));
        const opts=[...document.querySelectorAll('[class*=digEmptySelectView_optionItem]')].filter(e=>e.getBoundingClientRect().width>0);
        if(opts[0]){const ok=Object.keys(opts[0]).find(x=>x.startsWith('__reactProps'));
          try{if(ok&&opts[0][ok].onClick)opts[0][ok].onClick({stopPropagation(){},preventDefault(){},target:opts[0],currentTarget:opts[0],nativeEvent:{}});else opts[0].click();}catch(e){opts[0].click();}}
        await new Promise(r=>setTimeout(r,250));}
      return trigs.length;})()`, tb.ctx);
  } else if (kind === "dig") {
    await ev(`(async()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
      const blanks=[...b.querySelectorAll('[class*=digEmptyView_blankView]')];
      for(const bl of blanks){const rk=Object.keys(bl).find(x=>x.startsWith('__reactProps'));
        try{if(rk&&bl[rk].onClick)bl[rk].onClick({stopPropagation(){},preventDefault(){},target:bl,currentTarget:bl,nativeEvent:{}});else bl.click();}catch(e){bl.click();}
        await new Promise(r=>setTimeout(r,420));
        const opts=[...document.querySelectorAll('[class*=digEmptyView_optionItem],[class*=digEmptyView_labelView]')].filter(e=>e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0);
        if(opts[0]){const ok=Object.keys(opts[0]).find(x=>x.startsWith('__reactProps'));
          try{if(ok&&opts[0][ok].onClick)opts[0][ok].onClick({stopPropagation(){},preventDefault(){},target:opts[0],currentTarget:opts[0],nativeEvent:{}});else opts[0].click();}catch(e){opts[0].click();}}
        await new Promise(r=>setTimeout(r,250));}
      return blanks.length;})()`, tb.ctx);
  }
  await sleep(800);
  const sub = await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
    const el=[...b.querySelectorAll('[class*=i-button]')].find(e=>((e.innerText||'').replace(/\\s+/g,''))==='提交');
    if(el){el.click();return 1;}return 0;})()`, tb.ctx);
  if (!sub) return { r: "hasctrl-nosubmit", kind, len: s.len };
  await sleep(8000);
  for (const f of await frames()) {
    await ev(`(()=>{const n=s2=>(s2||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>/^(确认|确定)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>18);if(v.length){v[v.length-1].click();return 1;}return 0;})()`, f.ctx).catch(() => 0);
  }
  await sleep(2000);
  const fin = await probe(i);
  return { r: "done", kind, score: fin ? fin.score : null };
};

for (const i of list) {
  try {
    const rr = await proc(i);
    results[i] = rr;
    log(`#${i}`, JSON.stringify(rr));
  } catch (e) { log(`#${i} 异常`, String(e).slice(0, 90)); results[i] = { r: "err" }; }
}
fs.writeFileSync(`pat-u${U}.json`, JSON.stringify(results, null, 1));
log("完成", JSON.stringify(Object.entries(results).filter(([k, v]) => v.r === "done").length) + " done");
cdp.close();
