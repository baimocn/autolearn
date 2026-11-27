// _redo19b.mjs — 完整流程：提交(等答案)→重新作答→重录→答案TTS→等16s→提交
import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs"; import path from "node:path"; import { execSync } from "node:child_process";
const TMP = process.env.TEMP || "C:\\Windows\\Temp";
const log = (...a) => console.log("[r19b]", ...a);
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(rd.id); const { ev, frames, cdp, sessionId } = L;
const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId).catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
};
const tb = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx);
const raw = e => ev(e, tb.ctx);
const i = 19;
const state = () => raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(!b)return null;const q=s=>(s||'').replace(/[ ]+/g,' ').trim();const t=q(b.innerText);const el=b.querySelector('[class*=record_record-recording]')||b.querySelector('[class*=record_record-prepare]');let pt=null;if(el){el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();if(r.width>10)pt={x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};}const btns=[...b.querySelectorAll('[class*=i-button_default-container]')].map(e=>{const r=e.getBoundingClientRect();return{t:q(e.innerText).slice(0,20),x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),w:Math.round(r.width)};}).filter(x=>x.w>10);return{len:t.length,labels:['点击开始','准备录音','开始录音','结束录音','点击结束','回放','重录','等待结果'].filter(l=>t.indexOf(l)>=0),pt,btns,text:t,score:(t.match(/得分[^0-9]*([0-9.]+)/)||[])[1]||null};})()`);
const click = async (label) => {
  const s = await state();
  const b = s && s.btns.find(x => x.t === label || (label === "重录" && /重录/.test(x.t)));
  if (!b) { log(`no button ${label}, have ${JSON.stringify(s && s.btns)}`); return false; }
  await mouse(b.x, b.y); log(`click ${label}`); return true;
};
const confirm = async () => {
  for (let k = 0; k < 12; k++) {
    let hit = false;
    for (const f of await frames()) {
      const rr = await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>e.children.length<=1&&(n(e.innerText)==='确定'||n(e.innerText)==='确认')&&e.getBoundingClientRect().width>18);if(!v.length)return 0;v[v.length-1].click();return 1;})()`, f.ctx).catch(() => 0);
      if (rr) { hit = true; break; }
    }
    if (hit) { log("确认"); return; }
    await sleep(700);
  }
};
const extractAnswer = (text) => {
  const k = text.lastIndexOf("答案"); if (k < 0) return "";
  let a = text.slice(k + 2).replace(/[ ]+/g, " ").replace(/\(\d+\)/g, " ").trim();
  const w = a.split(" "); if (w.length > 100) a = w.slice(0, 145).join(" ");
  if (a.length > 600) a = a.slice(0, 600);
  const d = a.lastIndexOf(". "); if (d > a.length * 0.5) a = a.slice(0, d + 1);
  return a.trim();
};
// STEP 1: 当前是 回放/重录 态 → 提交 → 等答案
let s = await state(); log("STEP0", JSON.stringify({ len: s.len, labels: s.labels, score: s.score, btns: s.btns }));
await sleep(16000);
if (await click("提交")) { await confirm(); }
let ans = "";
for (let k = 0; k < 25; k++) {
  await sleep(2000);
  s = await state();
  if (s && s.text.indexOf("答案") >= 0) { ans = extractAnswer(s.text); break; }
}
log("STEP1 答案长度", ans.length, ans.slice(0, 70));
if (ans.length < 30) { log("无答案，退出"); cdp.close(); process.exit(2); }
// STEP 2: 重新作答 → 重录
if (!(await click("重新作答"))) { cdp.close(); process.exit(3); }
await sleep(3500);
s = await state(); log("STEP2a", JSON.stringify({ len: s.len, labels: s.labels, btns: s.btns }));
if (s && s.labels.includes("重录")) {
  // "重录"常是纯文本节点，不在 i-button 列表里：按文本坐标点
  const pt = await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];const els=[...b.querySelectorAll('*')].filter(e=>e.children.length===0&&(e.innerText||'').replace(/[ ]+/g,'')==='重录');if(!els.length)return null;const e=els[els.length-1];e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};})()`);
  if (pt) { await mouse(pt.x, pt.y); log("click 重录(文本)", JSON.stringify(pt)); }
  else if (!(await click("重录"))) { cdp.close(); process.exit(4); }
}
await sleep(3000);
s = await state(); log("STEP2b 控件", JSON.stringify({ labels: s.labels, pt: s.pt, btns: s.btns }));
// STEP 3: TTS + 注入
const src = path.join(TMP, "r19b.txt"); fs.writeFileSync(src, ans);
const wav = path.join(TMP, "r19b.wav"), mp3 = path.join(TMP, "r19b.mp3");
execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File sapi-tts.ps1 -TextFile "${src}" -OutWav "${wav}"`, { cwd: process.cwd(), stdio: "pipe", timeout: 180000 });
execSync(`ffmpeg -y -v error -i "${wav}" -codec:a libmp3lame -q:a 5 "${mp3}"`, { stdio: "pipe", timeout: 60000 });
const dur = Number(execSync(`ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "${mp3}"`).toString().trim());
log("TTS", dur.toFixed(1) + "s");
const b64 = fs.readFileSync(mp3).toString("base64");
await raw(`window.__ttsB64='';1`);
for (let p = 0; p < b64.length; p += 120000) await raw(`window.__ttsB64+=${JSON.stringify(b64.slice(p, p + 120000))};1`);
await raw(`(()=>{const md=navigator.mediaDevices;if(!md)return'nomd';md.getUserMedia=async function(){const bin=atob(window.__ttsB64);const u=new Uint8Array(bin.length);for(let k=0;k<bin.length;k++)u[k]=bin.charCodeAt(k);const ctx=new(window.AudioContext||window.webkitAudioContext)();const buf=await ctx.decodeAudioData(u.buffer);const src=ctx.createBufferSource();src.buffer=buf;const dest=ctx.createMediaStreamDestination();src.connect(dest);src.start();return dest.stream;};return'patched';})()`);
await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(b)b.scrollIntoView({block:'center'});return 1;})()`);
await sleep(1000);
// STEP 4: 录制
for (let k = 0; k < 30; k++) { await sleep(700); s = await state(); if (s && (s.pt || s.labels.includes("点击开始"))) break; }
log("STEP4 控件", JSON.stringify({ labels: s.labels, pt: s.pt }));
if (s && s.labels.includes("点击开始") && s.pt) { await mouse(s.pt.x, s.pt.y); log("点击开始"); await sleep(3000); }
s = await state();
if (s && (s.labels.includes("准备录音") || s.labels.includes("开始录音")) && s.pt) { await mouse(s.pt.x, s.pt.y); log("开始录音"); }
let t0 = 0, ok = false;
for (let k = 0; k < 40; k++) { await sleep(500); const x = await state(); if (x && (x.labels.includes("点击结束") || x.labels.includes("结束录音"))) { ok = true; t0 = Date.now(); log("录制中"); break; } }
if (!ok) { log("未进入录制态"); log("STATE", JSON.stringify(await state()).slice(0, 600)); cdp.close(); process.exit(5); }
const remain = dur - (Date.now() - t0) / 1000 + 0.6; if (remain > 0) await sleep(remain * 1000);
s = await state(); if (s && s.pt) { await mouse(s.pt.x, s.pt.y); log("结束录音"); }
// STEP 5: 等 16s → 提交 → 确认
log("等16s"); await sleep(16000);
if (await click("提交")) await confirm();
await sleep(10000);
const fin = await state();
log("FINAL", JSON.stringify({ len: fin && fin.len, score: fin && fin.score, text: (fin && fin.text || "").slice(0, 260) }));
cdp.close();
