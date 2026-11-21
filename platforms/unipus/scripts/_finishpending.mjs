// _finishpending.mjs — 处理"回放/重录/提交"态录音块：等15s→提交→等答案→重录用答案再提交
import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
const TMP = process.env.TEMP || "C:\\Windows\\Temp";
const WAIT = Number(process.env.REC_WAIT || 16);
const log = (...a) => console.log("[fin]", ...a);
process.on("uncaughtException", e => log("uncaught:", String(e).slice(0, 100)));
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(rd.id);
const { ev, frames, cdp, sessionId } = L;
const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId).catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
};
for (const f of await frames()) {
  if (!/pc\.html/.test(f.url)) continue;
  const p = await ev(`(()=>{const n=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>e.children.length<=1&&e.getBoundingClientRect().width>15&&/^(我知道了|再想想|去学习)$/.test(n(e.innerText)));if(!v.length)return null;const e=v[v.length-1];const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, f.ctx).catch(() => null);
  if (p) { await mouse(p.x, p.y); await sleep(1200); }
}
const tb = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx);
const raw = e => ev(e, tb.ctx);
const tts = (txt, out) => {
  const src = path.join(TMP, "fin-oral.txt"); fs.writeFileSync(src, txt);
  const wav = out.replace(/\.mp3$/, ".wav");
  try {
    execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File sapi-tts.ps1 -TextFile "${src}" -OutWav "${wav}"`, { cwd: process.cwd(), stdio: "pipe", timeout: 180000 });
    execSync(`ffmpeg -y -v error -i "${wav}" -codec:a libmp3lame -q:a 5 "${out}"`, { stdio: "pipe", timeout: 60000 });
    return Number(execSync(`ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "${out}"`).toString().trim());
  } catch { return 0; }
};
const st = (i) => raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(!b)return null;
 const q=s=>(s||'').replace(/[ ]+/g,' ').trim();const t=q(b.innerText);
 const el=b.querySelector('[class*=record_record-recording]')||b.querySelector('[class*=record_record-prepare]');let pt=null;
 if(el){el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();if(r.width>10)pt={x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};}
 const subs=[...b.querySelectorAll('[class*=i-button_default-container]')].map(e=>{const r=e.getBoundingClientRect();return{t:q(e.innerText).slice(0,24),x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),w:Math.round(r.width)};}).filter(x=>x.w>10);
 const m=t.match(/得分[^0-9]*([0-9.]+)/);
 return {tail:t.slice(-110),labels:['点击开始','准备录音','开始录音','结束录音','点击结束','回放','重录','等待结果','我的回放','AI 评分'].filter(l=>t.indexOf(l)>=0),pt,subs,score:m?Number(m[1]):null,redo:t.indexOf('重新作答')>=0,hasAnswer:t.indexOf('答案')>=0,text:t};})()`);
const clickBtn = async (i, label) => {
  const p = await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(!b)return null;const e=[...b.querySelectorAll('[class*=i-button_default-container]')].find(x=>(x.innerText||'').replace(/[ ]+/g,'')==='${label}');if(!e)return null;e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};})()`);
  if (!p) return false;
  await mouse(p.x, p.y); return true;
};
const extractAnswer = (text) => {
  const i = text.lastIndexOf("答案"); if (i < 0) return "";
  let a = text.slice(i + 2).replace(/^[ (]*1[) ]*/, "").trim();
  a = a.replace(/[ ]+/g, " ").replace(/\(\d+\)/g, " ").trim();
  const w = a.split(" "); if (w.length > 110) a = w.slice(0, 145).join(" ");
  if (a.length > 850) a = a.slice(0, 700);
  const dot = a.lastIndexOf(". "); if (dot > a.length * 0.6) a = a.slice(0, dot + 1);
  return a.trim();
};
const record = async (i, TEXT, tag) => {
  const mp3 = path.join(TMP, `fin-${i}-${tag}.mp3`);
  const dur = tts(TEXT, mp3);
  if (!dur || dur < 0.5) { log(`#${i} ${tag} TTS失败`); return false; }
  log(`#${i} ${tag} TTS ${dur.toFixed(1)}s`);
  const b64 = fs.readFileSync(mp3).toString("base64");
  await raw(`window.__ttsB64='';1`);
  for (let p = 0; p < b64.length; p += 120000) await raw(`window.__ttsB64+=${JSON.stringify(b64.slice(p, p + 120000))};1`);
  await raw(`(()=>{const md=navigator.mediaDevices;if(!md)return'nomd';md.getUserMedia=async function(){const bin=atob(window.__ttsB64);const u=new Uint8Array(bin.length);for(let k=0;k<bin.length;k++)u[k]=bin.charCodeAt(k);const ctx=new(window.AudioContext||window.webkitAudioContext)();const buf=await ctx.decodeAudioData(u.buffer);const src=ctx.createBufferSource();src.buffer=buf;const dest=ctx.createMediaStreamDestination();src.connect(dest);src.start();return dest.stream;};return'patched';})()`);
  await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(b)b.scrollIntoView({block:'center'});return 1;})()`);
  let s = null;
  for (let k = 0; k < 30; k++) { await sleep(700); s = await st(i); if (s && (s.pt || s.labels.includes("点击开始"))) break; }
  if (s && s.labels.includes("点击开始") && s.pt) { await mouse(s.pt.x, s.pt.y); await sleep(3000); }
  s = await st(i);
  if (s && (s.labels.includes("准备录音") || s.labels.includes("开始录音")) && s.pt) { await mouse(s.pt.x, s.pt.y); log(`#${i} ${tag} 开始录音`); }
  let t0 = 0, ok = false;
  for (let k = 0; k < 40; k++) { await sleep(500); const x = await st(i); if (x && (x.labels.includes("点击结束") || x.labels.includes("结束录音"))) { ok = true; t0 = Date.now(); break; } }
  if (!ok) { log(`#${i} ${tag} 未进入录制态`); return false; }
  const remain = dur - (Date.now() - t0) / 1000 + 0.6; if (remain > 0) await sleep(remain * 1000);
  const x = await st(i);
  if (x && x.pt) { await mouse(x.pt.x, x.pt.y); log(`#${i} ${tag} 结束录音`); }
  log(`#${i} ${tag} 等 ${WAIT}s 出结果`);
  await sleep(WAIT * 1000);
  return true;
};
const submit = async (i, tag) => {
  for (let k = 0; k < 20; k++) {
    const s = await st(i);
    const sub = s && s.subs.find(v => /提交/.test(v.t));
    if (sub) { await mouse(sub.x, sub.y); log(`#${i} ${tag} 提交`); break; }
    await sleep(600);
  }
  for (let k = 0; k < 12; k++) {
    let hit = false;
    for (const f of await frames()) {
      const rr = await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>e.children.length<=1&&(n(e.innerText)==='确定'||n(e.innerText)==='确认')&&e.getBoundingClientRect().width>18);if(!v.length)return 0;v[v.length-1].click();return 1;})()`, f.ctx).catch(() => 0);
      if (rr) { hit = true; break; }
    }
    if (hit) { log(`#${i} ${tag} 确认`); break; }
    await sleep(600);
  }
};
// 找"回放/重录/提交"态块
const total = await raw(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`).catch(() => 0);
const targets = [];
for (let i = 0; i < total; i++) {
  const s = await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(!b)return null;const t=(b.innerText||'').replace(/[ ]+/g,' ');return {states:['回放','重录','提交','准备时长','点击开始'].filter(x=>t.indexOf(x)>=0),len:t.length,text:t};})()`);
  if (s && s.states.includes("回放") && s.states.includes("重录")) targets.push({ i, ...s });
}
log("待完成块:", JSON.stringify(targets.map(t => t.i)));
for (const { i, text } of targets) {
  try {
    // 1) 录完未提交：先等 15s 再提交，让 AI 出分/答案
    log(`#${i} 录完未提交，等 ${WAIT}s`);
    await sleep(WAIT * 1000);
    await submit(i, "first");
    // 2) 等答案出现
    let s2 = null;
    for (let k = 0; k < 20; k++) { await sleep(2000); s2 = await st(i); if (s2 && s2.hasAnswer) break; }
    log(`#${i} 提交后 hasAnswer=${s2 && s2.hasAnswer} score=${s2 && s2.score}`);
    if (!s2 || !s2.hasAnswer) continue;
    const answer = extractAnswer(s2.text);
    if (answer.length < 30) { log(`#${i} 答案太短`); continue; }
    log(`#${i} 答案(${answer.length}字): ${answer.slice(0, 60)}`);
    // 3) 点重新作答（或重录）
    let clicked = await clickBtn(i, "重新作答");
    if (!clicked) clicked = await clickBtn(i, "重录");
    log(`#${i} 重做按钮=${clicked}`);
    await sleep(3500);
    // 4) 用答案重录并提交
    if (await record(i, answer, "answer")) await submit(i, "answer");
    const fin = await st(i);
    log(`#${i} final score=${fin && fin.score} tail=${JSON.stringify(fin && fin.tail)}`);
  } catch (e) { log(`#${i} 异常`, String(e).slice(0, 90)); }
}
log("DONE");
cdp.close();
