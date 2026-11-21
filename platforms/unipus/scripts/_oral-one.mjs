// _oral-one.mjs <blockIdx> [rate] [maxWords] — 单题重录：完整答案 + 可调语速
import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
const IDX = Number(process.argv[2]);
const RATE = Number(process.argv[3] || 0);
const MAXW = Number(process.argv[4] || 260);
const TMP = process.env.TEMP || "C:\\Windows\\Temp";
const log = (...a) => console.log("[one" + IDX + "]", ...a);
process.on("uncaughtException", e => log("uncaught:", String(e).slice(0, 110)));
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(rd.id);
const { ev, frames, cdp, sessionId } = L;
const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId).catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
};
const tb = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx);
const raw = e => ev(e, tb.ctx);
const st = () => raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${IDX}];if(!b)return null;
 const q=s=>(s||'').replace(/[ ]+/g,' ').trim();const t=q(b.innerText);
 const el=b.querySelector('[class*=record_record-recording]')||b.querySelector('[class*=record_record-prepare]');let pt=null;
 if(el){el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();if(r.width>10)pt={x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};}
 const btns=[...b.querySelectorAll('[class*=i-button_default-container]')].map(e=>{const r=e.getBoundingClientRect();return{t:q(e.innerText).slice(0,20),x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),w:Math.round(r.width)};}).filter(x=>x.w>10);
 const m=t.match(/得分[^0-9]*([0-9.]+)/);
 return {text:t,tail:t.slice(-90),labels:['点击开始','准备录音','开始录音','结束录音','点击结束','回放','重录'].filter(l=>t.indexOf(l)>=0),pt,btns,score:m?Number(m[1]):null,hasAns:t.indexOf('答案')>=0};})()`);
const clickBtn = async (label) => {
  await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${IDX}];if(b)b.scrollIntoView({block:'center'});return 1;})()`).catch(() => {});
  await sleep(600);
  const s = await st();
  const b = s && s.btns.find(x => x.t === label);
  if (b && b.y > 0 && b.y < 2000) { await mouse(b.x, b.y); log("click", label); return true; }
  const p = await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${IDX}];if(!b)return null;const els=[...b.querySelectorAll('*')].filter(e=>e.children.length===0&&(e.innerText||'').replace(/[ ]+/g,'')==='${label}');if(!els.length)return null;const e=els[els.length-1];e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};})()`);
  if (p) { await mouse(p.x, p.y); log("click(text)", label); return true; }
  log("no button", label);
  return false;
};
let s = await st();
log("START score=" + (s && s.score) + " labels=" + JSON.stringify(s && s.labels));
// 提取答案：优先当前块，否则复用缓存文件
let ans = "";
if (s && s.hasAns) {
  const k = s.text.lastIndexOf("答案");
  ans = s.text.slice(k + 2).trim();
} else {
  const cache = path.join(TMP, "one" + IDX + ".txt");
  if (fs.existsSync(cache)) { ans = fs.readFileSync(cache, "utf8"); log("reuse cached answer"); }
}
if (!ans) { log("no answer text, skip"); cdp.close(); process.exit(2); }
ans = ans.replace(/\s+/g, " ");
const w = ans.split(" ");
if (w.length > MAXW) ans = w.slice(0, MAXW).join(" ");
log("answer words=" + ans.split(" ").length + " chars=" + ans.length);
// 重新作答（若有）→ 重录
s = await st();
if (s && s.btns.some(b => b.t === "重新作答")) {
  if (!(await clickBtn("重新作答"))) { cdp.close(); process.exit(3); }
  await sleep(3500);
  s = await st();
}
if (s && s.labels.includes("重录")) { if (!(await clickBtn("重录"))) { cdp.close(); process.exit(4); } }
await sleep(3000);
// TTS
const src = path.join(TMP, "one" + IDX + ".txt");
fs.writeFileSync(src, ans);
const mp3 = path.join(TMP, "one" + IDX + ".mp3");
try {
  execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File sapi-tts.ps1 -TextFile "${src}" -OutWav "${mp3.replace(/\.mp3$/, ".wav")}" -Rate ${RATE}`, { cwd: process.cwd(), stdio: "pipe", timeout: 240000 });
  execSync(`ffmpeg -y -v error -i "${mp3.replace(/\.mp3$/, ".wav")}" -codec:a libmp3lame -q:a 5 "${mp3}"`, { stdio: "pipe", timeout: 60000 });
} catch (e) { log("tts err", String(e).slice(0, 120)); cdp.close(); process.exit(5); }
const dur = Number(execSync(`ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "${mp3}"`).toString().trim());
log("TTS " + dur.toFixed(1) + "s rate=" + RATE);
const b64 = fs.readFileSync(mp3).toString("base64");
await raw(`window.__ttsB64='';1`);
for (let p = 0; p < b64.length; p += 120000) await raw(`window.__ttsB64+=${JSON.stringify(b64.slice(p, p + 120000))};1`);
await raw(`(()=>{const md=navigator.mediaDevices;if(!md)return'nomd';md.getUserMedia=async function(){const bin=atob(window.__ttsB64);const u=new Uint8Array(bin.length);for(let k=0;k<bin.length;k++)u[k]=bin.charCodeAt(k);const ctx=new(window.AudioContext||window.webkitAudioContext)();const buf=await ctx.decodeAudioData(u.buffer);const src=ctx.createBufferSource();src.buffer=buf;const dest=ctx.createMediaStreamDestination();src.connect(dest);src.start();return dest.stream;};return'patched';})()`);
await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${IDX}];if(b)b.scrollIntoView({block:'center'});return 1;})()`);
await sleep(800);
// 录制
let t0 = 0, ok = false;
for (let k2 = 0; k2 < 30; k2++) { await sleep(700); s = await st(); if (s && (s.pt || s.labels.includes("点击开始"))) break; }
if (s && s.labels.includes("点击开始") && s.pt) { await mouse(s.pt.x, s.pt.y); await sleep(3000); }
s = await st();
if (s && (s.labels.includes("准备录音") || s.labels.includes("开始录音")) && s.pt) { await mouse(s.pt.x, s.pt.y); log("start rec"); }
for (let k2 = 0; k2 < 40; k2++) { await sleep(500); const x = await st(); if (x && (x.labels.includes("点击结束") || x.labels.includes("结束录音"))) { ok = true; t0 = Date.now(); log("recording"); break; } }
if (!ok) { log("not recording"); cdp.close(); process.exit(6); }
const remain = dur - (Date.now() - t0) / 1000 + 0.6;
if (remain > 0) await sleep(remain * 1000);
s = await st(); if (s && s.pt) { await mouse(s.pt.x, s.pt.y); log("stop rec"); }
log("wait 16s"); await sleep(16000);
// 提交
for (let k2 = 0; k2 < 20; k2++) { s = await st(); const sub = s && s.btns.find(v => /提交/.test(v.t)); if (sub) { await mouse(sub.x, sub.y); log("submit"); break; } await sleep(600); }
for (let k2 = 0; k2 < 10; k2++) { let hit = false; for (const f of await frames()) { const c = await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>e.children.length<=1&&(n(e.innerText)==='确定'||n(e.innerText)==='确认')&&e.getBoundingClientRect().width>18);if(!v.length)return 0;v[v.length-1].click();return 1;})()`, f.ctx).catch(() => 0); if (c) { hit = true; break; } } if (hit) { log("confirmed"); break; } await sleep(700); }
await sleep(8000);
const fin = await st();
log("FINAL score=" + (fin && fin.score));
cdp.close();
