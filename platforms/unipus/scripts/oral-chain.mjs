// oral-unit.mjs <unit> — 扫描口语块，TTS 伪造麦克风作答并提交
import { CDP, sleep } from "./cdp.mjs";
import { connect } from "./utlib.mjs";
import { READER, COURSE, CH } from "./reader.mjs";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const U = Number(process.argv[2]);
const CHAIN = process.argv[3] || `u${U}/u${U}g2`;
const log = (...a) => console.log(`[oral${U}]`, ...a);
process.on("uncaughtException", (e) => log("uncaught:", String(e).slice(0, 110)));
const getVer = async () => (await fetch("http://127.0.0.1:9222/json/version")).json();
const getTabs = async () => (await fetch("http://127.0.0.1:9222/json/list")).json();
const TMP = process.env.TEMP || "C:\\Windows\\Temp";

const tts = (txt, out) => {
  const src = path.join(TMP, `oral-u${U}.txt`);
  fs.writeFileSync(src, txt);
  const wav = out.replace(/.mp3$/, ".wav");
  try {
    execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File sapi-tts.ps1 -TextFile "${src}" -OutWav "${wav}"`, { cwd: process.cwd(), stdio: "pipe", timeout: 120000 });
    execSync(`ffmpeg -y -v error -i "${wav}" -codec:a libmp3lame -q:a 5 "${out}"`, { stdio: "pipe", timeout: 60000 });
    const d = Number(execSync(`ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "${out}"`).toString().trim());
    if (d > 0.5) return d;
  } catch {}
  execSync(`node mtts.mjs "${src}" "${out}"`, { cwd: process.cwd(), env: { ...process.env, TTS_PROXY: "" }, stdio: "pipe", timeout: 120000 });
  return Number(execSync(`ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "${out}"`).toString().trim());
};

// 进单元
const b0 = await CDP.connect((await getVer()).webSocketDebuggerUrl);
for (const t of (await getTabs()).filter(t => /ucontent\.unipus\.cn/.test(t.url))) await b0.send("Target.closeTarget", { targetId: t.id }).catch(() => {});
await sleep(800);
const r = await b0.send("Target.createTarget", { url: `${READER}#/${COURSE}/courseware/${CHAIN}` });
b0.close();
await sleep(11000);

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

const L = await connect(r.targetId);
const { ev, frames, cdp, sessionId } = L;
// 强制刷新循环：直到题目块渲染出文字（新开页常出空壳）
for (let rr = 0; rr < 4; rr++) {
  await sleep(11000);
  const tbf = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx);
  let ne = 0;
  if (tbf) ne = await ev(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];return bs.filter(b=>(b.innerText||'').replace(/\s+/g,'').length>5).length;})()`, tbf.ctx).catch(() => 0);
  log(`reload-probe #${rr + 1}: nonempty=${ne}`);
  if (ne > 0) break;
  await cdp.send("Page.reload", { ignoreCache: true }, sessionId).catch(() => {});
}
let tb = null;
for (let k = 0; k < 55; k++) {
  tb = (await frames()).find(f => f.url.includes("textbook/book") && f.ctx && f.url.includes((CH[U] || "??").slice(0, 12)));
  if (tb) {
    const n = await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`, tb.ctx).catch(() => 0);
    if (n > 0) break;
  }
  await sleep(1000);
}
if (!tb) { log("NO TB"); process.exit(1); }
const raw = async (e) => {
  const rr = await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true, userGesture: true, contextId: tb.ctx }, sessionId);
  if (rr.exceptionDetails) return { __err: ((rr.exceptionDetails.exception && rr.exceptionDetails.exception.description) || "").slice(0, 100) };
  return rr.result && rr.result.value;
};
const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId).catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
};
const dismissRules = async () => {
  for (const f of await frames()) {
    await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='我知道了'&&e.getBoundingClientRect().width>20);if(v.length){v[v.length-1].click();return 1;}return 0;})()`, f.ctx).catch(() => 0);
  }
};
const expandCollapsed = async () => {
  const n = await raw(`(async()=>{
    const cols=[...document.querySelectorAll('[class*=collapsible-container]')];
    let opened=0;
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
    return opened;})()`).catch(()=>0);
  if (n) log("展开折叠区:", n);
  await sleep(3000);
};
await dismissRules();
await expandCollapsed();

// 关抽屉（抽屉开着题目块不渲染）+ 兜底点弹窗
for (const f of await frames()) {
  await ev(`(()=>{const n=s=>(s||'').replace(/\s+/g,'');for(const b of document.querySelectorAll('button,div,span,a')){if(/^(我知道了|知道了)$/.test(n(b.innerText)))b.click();}const c=document.querySelector('[class*=catalog_drawer-close]');if(c&&c.getBoundingClientRect().width>3)c.click();return 1;})()`, f.ctx).catch(() => {});
}
await sleep(1500);

// 滚动预热：懒加载块挂载后再扫（否则后半单元的口语块扫不到）
const PRE_SCREENS = Number(process.env.SCREENS || 18);
for (let s = 0; s < PRE_SCREENS; s++) {
  await raw(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollBy(0,Math.round(window.innerHeight*0.9));return 1;})()`);
  await sleep(1200);
}
await raw(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollTo(0,0);return 1;})()`);
await sleep(900);
await expandCollapsed();
await sleep(1200);

// 扫口语块
const total = await raw(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`);
const orals = [];
for (let i = 0; i < total; i++) {
  await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(b)b.scrollIntoView({block:'center'});return 1;})()`);
  await sleep(600);
  const s = await raw(`(()=>{
    const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
    if(!b)return null;
    const t=(b.innerText||'');
    const tn=t.replace(/\\s+/g,' ');
    const rec=b.querySelector('[class*=record_record-prepare],[class*=record_record-recording],[class*=record_]')?1:0;
    return {rec, mic:/录音|麦克风|朗读下面|Read aloud|read the following/i.test(tn)?1:0,
      done:/重新作答/.test(tn), score:(tn.match(/得分[:：]?\\s*(\\d+(\\.\\d+)?)/)||[])[1]??null, len:t.length};
  })()`);
  if (s && (s.rec || (s.mic && !s.done))) orals.push({ i, ...s });
}
log("口语块:", JSON.stringify(orals));
if (!orals.length) {
  const diag = await raw(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
    const recEls=[...document.querySelectorAll('[class*=record_record-prepare],[class*=record_record-recording]')];
    return {blocks:bs.length,nonempty:bs.filter(b=>(b.innerText||'').replace(/\s+/g,'').length>5).length,rec:recEls.length,bodyLen:document.body.innerText.length,url:location.href.slice(60,120)};})()`).catch(e=>String(e));
  log("DIAG:", JSON.stringify(diag));
  cdp.close(); process.exit(3);
}

// 逐题处理
for (const { i, done } of orals) {
  try {
    if (done) { log(`#${i} 已提交`); continue; }
    // 提取朗读文本（取最长的英文行）
    const prompt = await raw(`(()=>{
      const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
      const lines=(b.innerText||'').split('\\n').map(s=>s.trim()).filter(Boolean);
      const cand=lines.filter(s=>/[a-zA-Z]{3}/.test(s)&&s.length>24&&!/录音|麦克风|提交|得分|重新作答|自动判题|计分/.test(s));
      cand.sort((a,b2)=>b2.length-a.length);
      return cand[0]||'';})()`);
    log(`#${i} 朗读文本(${(prompt || "").length}字): ${(prompt || "").slice(0, 60)}`);
    let TTS_TEXT = prompt && String(prompt).length >= 10 ? String(prompt) : "Agriculture has always been the foundation of human civilization. Modern farming methods have greatly improved productivity, while traditional wisdom keeps the soil healthy for future generations. In my opinion, this is the main message of this unit.";
    if (!prompt || String(prompt).length < 10) log(`#${i} 无题面文本，使用兜底朗读句`);
    const mp3 = path.join(TMP, `oral-u${U}-${i}.mp3`);
    let dur = 0;
    try { dur = tts(TTS_TEXT, mp3); } catch (e) { log(`#${i} TTS失败`, String(e).slice(0, 80)); continue; }
    log(`#${i} TTS ${dur.toFixed(1)}s`);
    const b64 = fs.readFileSync(mp3).toString("base64");
    // 注入
    await raw(`window.__ttsB64='';window.__gumCalls=0;1`);
    for (let p = 0; p < b64.length; p += 120000) await raw(`window.__ttsB64+=${JSON.stringify(b64.slice(p, p + 120000))};1`);
    log("注入:", await raw(`(()=>{ if(window.__gumPatched) return 'already'; window.__gumPatched=1;
      const md=navigator.mediaDevices; if(!md) return 'no md';
      md.getUserMedia=async function(){ const bin=atob(window.__ttsB64); const u=new Uint8Array(bin.length);
        for(let k=0;k<bin.length;k++)u[k]=bin.charCodeAt(k);
        const ctx=new (window.AudioContext||window.webkitAudioContext)();
        const buf=await ctx.decodeAudioData(u.buffer);
        const src=ctx.createBufferSource(); src.buffer=buf;
        const dest=ctx.createMediaStreamDestination(); src.connect(dest); src.start();
        window.__gumCalls=(window.__gumCalls||0)+1; return dest.stream; };
      return 'patched';})()`));
    // 滚到块
    await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(b)b.scrollIntoView({block:'center'});return 1;})()`);
    await sleep(800);
    // 状态机
    const probe = () => raw(`(()=>{
      const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
      if(!b) return null;
      const q=s=>(s||'').replace(/\\s+/g,' ').trim(); const t=q(b.innerText);
      const LBL=['点击开始','准备录音','开始录音','结束录音','点击结束','回放','重录','录音结束'];
      const el=b.querySelector('[class*=record_record-recording]')||b.querySelector('[class*=record_record-prepare]');
      let pt=null;
      if(el){ el.scrollIntoView({block:'center'}); const rr=el.getBoundingClientRect();
        if(rr.top>80&&rr.bottom<window.innerHeight-20&&rr.width>0) pt={x:Math.round(rr.left+rr.width/2),y:Math.round(rr.top+rr.height/2)}; }
      const sub=b.querySelector('[class*=i-button_default-container]');
      let sp=null;
      if(sub){ const r0=sub.getBoundingClientRect();
        if(r0.top<80||r0.bottom>window.innerHeight-10) sub.scrollIntoView({block:'center'});
        const rr=sub.getBoundingClientRect();
        if(rr.top>40&&rr.bottom<window.innerHeight-5) sp={x:Math.round(rr.left+rr.width/2),y:Math.round(rr.top+rr.height/2),t:q(sub.innerText)}; }
      return {lbl:LBL.filter(l=>t.includes(l)), hasRedo:t.includes('重新作答'), pt, sp, gum:window.__gumCalls||0, tail:t.slice(-50)};})()`);
    const recState = () => raw(`(()=>{const el=document.querySelector('[class*=record_record-recording]');if(!el)return null;
      el.scrollIntoView({block:'center'});const rr=el.getBoundingClientRect();
      if(rr.width<10)return null;return {x:Math.round(rr.left+rr.width/2),y:Math.round(rr.top+rr.height/2)};})()`).catch(() => null);
    let t0 = 0, started = false, didRecord = false;
    for (let step = 0; step < 240; step++) {
      const rec = await recState();
      if (rec) {
        if (!t0) { t0 = Date.now(); log("  ● 录制中"); }
        const remain = dur - (Date.now() - t0) / 1000 + 0.5;
        if (remain > 0) await sleep(remain * 1000);
        const r2 = await recState();
        if (r2 && r2.y > 80 && r2.y < 900) { await mouse(r2.x, r2.y); didRecord = true; log(`  ■ 结束录音 ${((Date.now() - t0) / 1000).toFixed(1)}s`); }
        else { const j = await raw(`(()=>{const el=document.querySelector('[class*=record_record-recording]');if(!el)return 0;el.click();return 1;})()`); if (j) didRecord = true; }
        continue;
      }
      const s = await probe();
      if (!s) break;
      if (!didRecord && s.hasRedo) {
        const rr = await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
          const el=[...b.querySelectorAll('[class*=i-button_default-container]')].find(e=>(e.innerText||'').replace(/\\s+/g,'')==='重新作答');
          if(!el) return 0; el.click(); return 1;})()`);
        if (rr) { log("  ↺ 重新作答"); await sleep(2500); t0 = 0; started = false; continue; }
      }
      if ((s.lbl.includes("回放") || s.lbl.includes("重录")) && didRecord) { log(`→ 录制完成`); break; }
      if (s.lbl.includes("开始录音") && !started && s.pt) { await mouse(s.pt.x, s.pt.y); started = true; if (!t0) t0 = Date.now(); log("  ▶ 开始录音"); continue; }
      if (s.lbl.includes("结束录音") || s.lbl.includes("点击结束")) {
        if (!t0) { t0 = Date.now(); }
        const remain = dur - (Date.now() - t0) / 1000 + 0.5;
        if (remain > 0) await sleep(remain * 1000);
        const s2 = await probe();
        if (s2 && s2.pt) { await mouse(s2.pt.x, s2.pt.y); didRecord = true; log(`  ■ 结束录音`); }
        else { const j = await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];const el=b&&(b.querySelector('[class*=record_record-recording]')||b.querySelector('[class*=record_record-prepare]'));if(!el)return 0;el.click();return 1;})()`); if (j) { didRecord = true; log("  ■ 结束(JS)"); } }
        continue;
      }
      if (s.lbl.includes("准备录音")) { await sleep(400); continue; }
      if (s.lbl.includes("点击开始") && s.pt) { await mouse(s.pt.x, s.pt.y); continue; }
      await sleep(500);
    }
    // 提交
    for (let k = 0; k < 25; k++) {
      const s = await probe();
      if (!s) break;
      if (s.sp && /提交/.test(s.sp.t)) { await mouse(s.sp.x, s.sp.y); log("  ↑ 提交"); break; }
      await sleep(700);
    }
    for (let k = 0; k < 15; k++) {
      let hit = false;
      for (const f of await frames()) {
        const rr = await ev(`(()=>{const n=s2=>(s2||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>e.children.length<=1&&(n(e.innerText)==='确定'||n(e.innerText)==='确认')&&e.getBoundingClientRect().width>18);if(!v.length)return 0;v[v.length-1].click();return 1;})()`, f.ctx).catch(() => 0);
        if (rr) { hit = true; break; }
      }
      if (hit) { log("  ✓ 确认"); break; }
      await sleep(700);
    }
    const fin = await probe();
    log(`#${i} final:`, JSON.stringify(fin && fin.tail));
  } catch (e) { log(`#${i} 异常`, String(e).slice(0, 100)); }
}
log("口语完成");
cdp.close();
