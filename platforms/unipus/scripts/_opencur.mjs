// _opencur.mjs — 附加到当前已打开的 reader 页，关抽屉/弹窗/刷新到非空，扫描并处理录音块
import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
const TMP = process.env.TEMP || "C:\\Windows\\Temp";
const log = (...a) => console.log("[opencur]", ...a);
process.on("uncaughtException", e => log("uncaught:", String(e).slice(0, 110)));
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
if (!rd) { log("NO READER"); process.exit(1); }
const L = await connect(rd.id);
const { ev, frames, cdp, sessionId } = L;
const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId).catch(()=>{});
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
};
let tb = null;
const clean = async () => {
  tb = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx);
  // 顶层“本单元学习规则”弹窗必须用真实鼠标坐标点，JS click 无效
  for (const f of await frames()) {
    if (!/pc\.html/.test(f.url)) continue;
    const p = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(我知道了|知道了)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return null;const b=v[v.length-1].getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, f.ctx).catch(()=>null);
    if (p) { await mouse(p.x, p.y); await sleep(1200); }
  }
  if (tb) {
    const c = await ev(`(()=>{const e=document.querySelector('[class*=catalog_drawer-close]');if(!e)return null;const b=e.getBoundingClientRect();if(b.width<3)return null;return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, tb.ctx).catch(() => null);
    if (c) { await mouse(c.x, c.y); await sleep(900); }
  }
};
const nonempty = async () => {
  tb = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx);
  if (!tb) return 0;
  return await ev(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];return bs.filter(b=>(b.innerText||'').replace(/\\s+/g,'').length>5).length;})()`, tb.ctx).catch(() => 0);
};
for (let k = 0; k < 4; k++) {
  await clean();
  await sleep(3000);
  const n = await nonempty();
  log(`probe #${k + 1}: nonempty=${n}`);
  if (n > 0) break;
  await cdp.send("Page.reload", { ignoreCache: true }, sessionId).catch(()=>{});
  await sleep(18000);
}
const raw = (e) => ev(e, tb.ctx);
await raw(`(async()=>{const cols=[...document.querySelectorAll('[class*=collapsible-container]')];let n=0;for(const c of cols){const body=c.querySelector('[class*=collapsible-content]');if(!body)continue;if(body.getBoundingClientRect().height<20){const head=c.querySelector('[class*=collapsible-head]');if(head){const rk=Object.keys(head).find(k=>k.startsWith('__reactProps'));try{if(rk&&head[rk].onClick)head[rk].onClick({stopPropagation(){},preventDefault(){},target:head,currentTarget:head,nativeEvent:{}});else head.click();}catch(e){head.click();}n++;await new Promise(r=>setTimeout(r,300));}}}return n;})()`).catch(()=>0);
for (let s = 0; s < 14; s++) {
  await raw(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollBy(0,Math.round(innerHeight*0.85));return 1;})()`).catch(()=>{});
  await sleep(1100);
}
const total = await raw(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`).catch(() => 0);
const orals = [];
for (let i = 0; i < total; i++) {
  await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(b)b.scrollIntoView({block:'center'});return 1;})()`);
  await sleep(500);
  const s = await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(!b)return null;const t=(b.innerText||'');const tn=t.replace(/\\s+/g,' ');const rec=b.querySelector('[class*=record_record-prepare],[class*=record_record-recording],[class*=record_]')?1:0;return {rec,done:/重新作答/.test(tn),len:t.length,tail:tn.slice(-60)};})()`);
  if (s && s.rec && !s.done) orals.push({ i, ...s });
}
log("录音块:", JSON.stringify(orals));
if (!orals.length) { log("无录音块"); cdp.close(); process.exit(3); }
const tts = (txt, out) => {
  const src = path.join(TMP, "opencur-oral.txt"); fs.writeFileSync(src, txt);
  const wav = out.replace(/\.mp3$/, ".wav");
  try {
    execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File sapi-tts.ps1 -TextFile "${src}" -OutWav "${wav}"`, { cwd: process.cwd(), stdio: "pipe", timeout: 120000 });
    execSync(`ffmpeg -y -v error -i "${wav}" -codec:a libmp3lame -q:a 5 "${out}"`, { stdio: "pipe", timeout: 60000 });
    return Number(execSync(`ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "${out}"`).toString().trim());
  } catch { return 0; }
};
for (const { i } of orals) {
  try {
    const prompt = await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];const lines=(b.innerText||'').split('\\n').map(s=>s.trim()).filter(Boolean);const c=lines.filter(s=>/[a-zA-Z]{3}/.test(s)&&s.length>24&&!/录音|麦克风|提交|得分|重新作答|自动判题|计分/.test(s));c.sort((a,b2)=>b2.length-a.length);return c[0]||'';})()`);
    const TEXT = (prompt && String(prompt).length >= 10) ? String(prompt) : "Agriculture has always been the foundation of human civilization. Modern farming methods have greatly improved productivity, while traditional wisdom keeps the soil healthy for future generations.";
    const mp3 = path.join(TMP, `opencur-${i}.mp3`);
    const dur = tts(TEXT, mp3);
    if (!dur || dur < 0.5) { log(`#${i} TTS失败`); continue; }
    log(`#${i} TTS ${dur.toFixed(1)}s, 题面: ${TEXT.slice(0, 50)}`);
    const b64 = fs.readFileSync(mp3).toString("base64");
    await raw(`window.__ttsB64='';1`);
    for (let p = 0; p < b64.length; p += 120000) await raw(`window.__ttsB64+=${JSON.stringify(b64.slice(p, p + 120000))};1`);
    await raw(`(()=>{if(window.__gumPatched)return 'already';window.__gumPatched=1;const md=navigator.mediaDevices;if(!md)return 'nomd';md.getUserMedia=async function(){const bin=atob(window.__ttsB64);const u=new Uint8Array(bin.length);for(let k=0;k<bin.length;k++)u[k]=bin.charCodeAt(k);const ctx=new (window.AudioContext||window.webkitAudioContext)();const buf=await ctx.decodeAudioData(u.buffer);const src=ctx.createBufferSource();src.buffer=buf;const dest=ctx.createMediaStreamDestination();src.connect(dest);src.start();return dest.stream;};return 'patched';})()`);
    await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(b)b.scrollIntoView({block:'center'});return 1;})()`);
    await sleep(800);
    const recState = () => raw(`(()=>{const el=document.querySelector('[class*=record_record-recording]');if(!el)return null;el.scrollIntoView({block:'center'});const rr=el.getBoundingClientRect();if(rr.width<10)return null;return{x:Math.round(rr.left+rr.width/2),y:Math.round(rr.top+rr.height/2)};})()`).catch(()=>null);
    const probe = () => raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(!b)return null;const q=s=>(s||'').replace(/\\s+/g,' ').trim();const t=q(b.innerText);const LBL=['点击开始','准备录音','开始录音','结束录音','点击结束','回放','重录','录音结束'];const el=b.querySelector('[class*=record_record-recording]')||b.querySelector('[class*=record_record-prepare]');let pt=null;if(el){el.scrollIntoView({block:'center'});const rr=el.getBoundingClientRect();if(rr.top>80&&rr.bottom<innerHeight-20&&rr.width>0)pt={x:Math.round(rr.left+rr.width/2),y:Math.round(rr.top+rr.height/2)};}const sub=b.querySelector('[class*=i-button_default-container]');let sp=null;if(sub){const r0=sub.getBoundingClientRect();if(r0.top<80||r0.bottom>innerHeight-10)sub.scrollIntoView({block:'center'});const rr=sub.getBoundingClientRect();if(rr.top>40&&rr.bottom<innerHeight-5)sp={x:Math.round(rr.left+rr.width/2),y:Math.round(rr.top+rr.height/2),t:q(sub.innerText)};}return{lbl:LBL.filter(l=>t.includes(l)),pt,sp,hasRedo:t.includes('重新作答'),tail:t.slice(-50)};})()`);
    let t0 = 0, started = false, didRecord = false;
    for (let step = 0; step < 240; step++) {
      const rec = await recState();
      if (rec) {
        if (!t0) { t0 = Date.now(); log("  - 录制中"); }
        const remain = dur - (Date.now() - t0) / 1000 + 0.5;
        if (remain > 0) await sleep(remain * 1000);
        const r2 = await recState();
        if (r2) { await mouse(r2.x, r2.y); didRecord = true; log("  - 结束录音"); }
        continue;
      }
      const s = await probe(); if (!s) break;
      if ((s.lbl.includes("回放") || s.lbl.includes("重录")) && didRecord) { log("-> 录制完成"); break; }
      if (s.lbl.includes("开始录音") && !started && s.pt) { await mouse(s.pt.x, s.pt.y); started = true; if (!t0) t0 = Date.now(); log("  > 开始录音"); continue; }
      if (s.lbl.includes("点击开始") && s.pt) { await mouse(s.pt.x, s.pt.y); continue; }
      if (s.lbl.includes("准备录音")) { await sleep(400); continue; }
      if (s.lbl.includes("结束录音") || s.lbl.includes("点击结束")) {
        const remain = dur - (Date.now() - t0) / 1000 + 0.5; if (remain > 0) await sleep(remain * 1000);
        const s2 = await probe(); if (s2 && s2.pt) { await mouse(s2.pt.x, s2.pt.y); didRecord = true; log("  - 结束录音"); }
        continue;
      }
      await sleep(500);
    }
    for (let k = 0; k < 25; k++) { const s = await probe(); if (!s) break; if (s.sp && /提交/.test(s.sp.t)) { await mouse(s.sp.x, s.sp.y); log("  ^ 提交"); break; } await sleep(700); }
    for (let k = 0; k < 15; k++) { let hit = false; for (const f of await frames()) { const rr = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>e.children.length<=1&&(n(e.innerText)==='确定'||n(e.innerText)==='确认')&&e.getBoundingClientRect().width>18);if(!v.length)return 0;v[v.length-1].click();return 1;})()`, f.ctx).catch(()=>0); if (rr) { hit = true; break; } } if (hit) { log("  ok 确认"); break; } await sleep(700); }
    const fin = await probe(); log(`#${i} final:`, JSON.stringify(fin && fin.tail));
  } catch (e) { log(`#${i} 异常`, String(e).slice(0, 90)); }
}
log("DONE");
cdp.close();
