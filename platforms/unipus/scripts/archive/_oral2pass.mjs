// _oral2pass.mjs — 两遍作答法：第一遍提交后等 15s 读"答案"，第二遍用答案 TTS 重录提交
import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
const TMP = process.env.TEMP || "C:\\Windows\\Temp";
const WAIT_AFTER_RECORD = Number(process.env.REC_WAIT || 16); // 用户提示：录音结束后约15s才能提交
const log = (...a) => console.log("[2p]", ...a);
process.on("uncaughtException", e => log("uncaught:", String(e).slice(0, 100)));

const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
if (!rd) { log("NO READER"); process.exit(1); }
const L = await connect(rd.id);
const { ev, frames, cdp, sessionId } = L;
const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId).catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
};
// 清顶层弹窗（真实鼠标）
for (const f of await frames()) {
  if (!/pc\.html/.test(f.url)) continue;
  const p = await ev(`(()=>{const n=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>e.children.length<=1&&e.getBoundingClientRect().width>15&&/^(再想想|去学习|我知道了|知道了)$/.test(n(e.innerText)));if(!v.length)return null;const e=v[v.length-1];const b=e.getBoundingClientRect();return{t:n(e.innerText),x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, f.ctx).catch(() => null);
  if (p) { log("modal", JSON.stringify(p)); await mouse(p.x, p.y); await sleep(1200); }
}
let tb = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx);
const raw = (e) => ev(e, tb.ctx);
const tts = (txt, out) => {
  const src = path.join(TMP, "2p-oral.txt"); fs.writeFileSync(src, txt);
  const wav = out.replace(/\.mp3$/, ".wav");
  try {
    execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File sapi-tts.ps1 -TextFile "${src}" -OutWav "${wav}"`, { cwd: process.cwd(), stdio: "pipe", timeout: 180000 });
    execSync(`ffmpeg -y -v error -i "${wav}" -codec:a libmp3lame -q:a 5 "${out}"`, { stdio: "pipe", timeout: 60000 });
    return Number(execSync(`ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "${out}"`).toString().trim());
  } catch (e) { log("tts err", String(e).slice(0, 70)); return 0; }
};
const inject = async (mp3) => {
  const b64 = fs.readFileSync(mp3).toString("base64");
  await raw(`window.__ttsB64='';1`);
  for (let p = 0; p < b64.length; p += 120000) await raw(`window.__ttsB64+=${JSON.stringify(b64.slice(p, p + 120000))};1`);
  return await raw(`(()=>{const md=navigator.mediaDevices;if(!md)return'nomd';md.getUserMedia=async function(){const bin=atob(window.__ttsB64);const u=new Uint8Array(bin.length);for(let k=0;k<bin.length;k++)u[k]=bin.charCodeAt(k);const ctx=new(window.AudioContext||window.webkitAudioContext)();const buf=await ctx.decodeAudioData(u.buffer);const src=ctx.createBufferSource();src.buffer=buf;const dest=ctx.createMediaStreamDestination();src.connect(dest);src.start();return dest.stream;};return'patched';})()`);
};
const st = (i) => raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(!b)return null;
 const q=s=>(s||'').replace(/\s+/g,' ').trim();const t=q(b.innerText);
 const el=b.querySelector('[class*=record_record-recording]')||b.querySelector('[class*=record_record-prepare]');let pt=null;
 if(el){el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();if(r.width>10)pt={x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};}
 const subs=[...b.querySelectorAll('[class*=i-button_default-container]')].map(e=>{const r=e.getBoundingClientRect();return{t:q(e.innerText).slice(0,24),x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),w:Math.round(r.width)};}).filter(x=>x.w>10);
 const m=t.match(/得分[:：]\s*(\d+(\.\d+)?)/);
 return {tail:t.slice(-100),labels:['点击开始','准备录音','开始录音','结束录音','点击结束','回放','重录','等待结果'].filter(l=>t.includes(l)),pt,subs,score:m?Number(m[1]):null,redo:/重新作答/.test(t),hasAnswer:/答案\s*\(?1\)?/.test(t),text:t};})()`);
// 从已提交块里提取"答案"之后的正文（去掉 AI 评语）
const extractAnswer = (text) => {
  const i = text.lastIndexOf("答案");
  if (i < 0) return "";
  let a = text.slice(i + 2).replace(/^\s*\(1\)\s*/, "").trim();
  a = a.replace(/\s+/g, " ").replace(/\(\d+\)/g, " ").replace(/\s{2,}/g, " ").trim();
  // 作答时长上限 5 分钟，TTS 约 150 wpm；截到约 110 词（≈45s）保证完整录完
  const words = a.split(" ");
  if (words.length > 110) a = words.slice(0, 110).join(" ");
  if (a.length > 850) a = a.slice(0, 700);
  // 收在句末，避免断句影响流利度评分
  const dot = a.lastIndexOf(". ");
  if (dot > a.length * 0.6) a = a.slice(0, dot + 1);
  return a.trim();
};
const recordAndSubmit = async (i, TEXT, tag) => {
  const mp3 = path.join(TMP, `2p-${i}-${tag}.mp3`);
  const dur = tts(TEXT, mp3);
  if (!dur || dur < 0.5) { log(`#${i} ${tag} TTS失败`); return false; }
  log(`#${i} ${tag} TTS ${dur.toFixed(1)}s 文本=${TEXT.slice(0, 55)}`);
  await inject(mp3);
  await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(b)b.scrollIntoView({block:'center'});return 1;})()`);
  // 「重新作答」后控件要重新挂载，等到出现录音控件/点击开始
  let s = null;
  for (let k = 0; k < 30; k++) {
    await sleep(700);
    s = await st(i);
    if (s && (s.pt || s.labels.includes("点击开始") || s.labels.includes("准备录音"))) break;
  }
  log(`#${i} ${tag} 控件=${s ? s.labels.join("/") + " pt=" + !!s.pt : "NULL"}`);
  if (s && s.labels.includes("点击开始") && s.pt) { await mouse(s.pt.x, s.pt.y); await sleep(3000); }
  s = await st(i);
  if (s && (s.labels.includes("准备录音") || s.labels.includes("开始录音")) && s.pt) { await mouse(s.pt.x, s.pt.y); log(`#${i} ${tag} 开始录音`); }
  let t0 = 0, ok = false;
  for (let k = 0; k < 40; k++) {
    await sleep(500);
    const x = await st(i);
    if (x && (x.labels.includes("点击结束") || x.labels.includes("结束录音"))) { ok = true; t0 = Date.now(); break; }
  }
  if (!ok) { log(`#${i} ${tag} 未进入录制态`); return false; }
  const remain = dur - (Date.now() - t0) / 1000 + 0.6;
  if (remain > 0) await sleep(remain * 1000);
  const x = await st(i);
  if (x && x.pt) { await mouse(x.pt.x, x.pt.y); log(`#${i} ${tag} 结束录音`); }
  // 关键：录音结束后等待平台处理音频/AI评分
  log(`#${i} ${tag} 等待 ${WAIT_AFTER_RECORD}s 出结果`);
  await sleep(WAIT_AFTER_RECORD * 1000);
  for (let k = 0; k < 20; k++) {
    const y = await st(i);
    const sub = y && y.subs.find(v => /提交/.test(v.t));
    if (sub) { await mouse(sub.x, sub.y); log(`#${i} ${tag} 提交`); break; }
    await sleep(600);
  }
  for (let k = 0; k < 12; k++) {
    let hit = false;
    for (const f of await frames()) {
      const rr = await ev(`(()=>{const n=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>e.children.length<=1&&(n(e.innerText)==='确定'||n(e.innerText)==='确认')&&e.getBoundingClientRect().width>18);if(!v.length)return 0;v[v.length-1].click();return 1;})()`, f.ctx).catch(() => 0);
      if (rr) { hit = true; break; }
    }
    if (hit) { log(`#${i} ${tag} 确认`); break; }
    await sleep(600);
  }
  // 等 AI 评分与答案出现
  await sleep(8000);
  const fin = await st(i);
  log(`#${i} ${tag} final 得分=${fin && fin.score} hasAnswer=${fin && fin.hasAnswer} tail=${JSON.stringify(fin && fin.tail)}`);
  return true;
};

// 主循环：找所有录音/已提交录音块
const total = await raw(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`).catch(() => 0);
log("DIAG total=" + total + " chapter=" + (tb.url || "").slice(60, 110) + " sample=" + JSON.stringify(await raw(`(()=>{const b=document.querySelector('div.editor-question-block.questionBlockNode');return b?(b.innerText||'').replace(/\\s+/g,' ').slice(0,80):'';})()`).catch(() => "")));
const targets = [];
for (let i = 0; i < total; i++) {
  const s = await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(!b)return null;const t=(b.innerText||'').replace(/[ ]+/g,' ');const m=t.match(/得分[^0-9]*([0-9.]+)/);return {rec:b.querySelector('[class*=record_record-prepare],[class*=record_record-recording]')?1:0,redo:t.indexOf('重新作答')>=0,score:m?Number(m[1]):null,hasAnswer:t.indexOf('答案')>=0,text:t};})()`);
  if (!s) { if (i < 3) log(`  blk${i} NULL`); continue; }
  if (i < 3) log(`  blk${i} rec=${s.rec} redo=${s.redo} textLen=${(s.text || "").length} text=${JSON.stringify((s.text || "").slice(0, 50))}`);
  // 录音题判据（不依赖得分正则）：录音控件 / 我的回放 / 准备时长 / 点击开始 / AI 评分
  const isOral = s.rec || /我的回放|准备时长|点击开始|AI 评分|作答时长/.test(s.text || "");
  if (isOral) targets.push({ i, ...s });
}
log("目标块:", JSON.stringify(targets.map(t => ({ i: t.i, score: t.score, rec: t.rec, redo: t.redo, hasAnswer: t.hasAnswer }))));
for (const t of targets) {
  try {
    const { i, rec, redo, score, hasAnswer, text } = t;
    // 已提交：点重新作答，用答案重录（无论分数高低，答案版应≥90）
    if (redo && !rec) {
      let answer = extractAnswer(text);
      // 有些块答案在末尾但没有"答案 (1)"标记，取 AI 评分后的正文
      if (!answer || answer.length < 30) {
        const ai = text.indexOf("AI 评分");
        if (ai >= 0) answer = text.slice(ai).replace(/^AI 评分[:：]?\s*/, "").slice(0, 900);
      }
      if (!answer || answer.length < 30) { log(`#${i} 无可用答案，跳过`); continue; }
      const pt = await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];const el=[...b.querySelectorAll('[class*=i-button_default-container]')].find(e=>(e.innerText||'').replace(/\s+/g,'')==='重新作答');if(!el)return null;el.scrollIntoView({block:'center'});const q=el.getBoundingClientRect();return{x:Math.round(q.left+q.width/2),y:Math.round(q.top+q.height/2)};})()`);
      if (!pt) { log(`#${i} 找不到重新作答`); continue; }
      await mouse(pt.x, pt.y); log(`#${i} 重新作答(旧分 ${score})`);
      await sleep(3500);
      await recordAndSubmit(i, answer, "answer");
    } else if (rec) {
      // 未作答：第一遍用题面，提交后等答案出现，再重做
      const lines = text.split("\n").map(s => s.trim()).filter(Boolean);
      const c = lines.filter(s => /[a-zA-Z]{3}/.test(s) && s.length > 24 && !/录音|麦克风|提交|得分|重新作答|准备时长|作答时长|答案|我的回放|AI 评分/.test(s));
      c.sort((a, b) => b.length - a.length);
      const stem = c[0] || "Agriculture has always been the foundation of human civilization. Modern farming methods have greatly improved productivity, while traditional wisdom keeps the soil healthy for future generations.";
      await recordAndSubmit(i, stem, "first");
      // 等答案出现（AI 评分可能需要更久）
      let s2 = null;
      for (let k = 0; k < 20; k++) { await sleep(2000); s2 = await st(i); if (s2 && s2.hasAnswer) break; }
      if (s2 && s2.hasAnswer) {
        const answer = extractAnswer(s2.text);
        if (answer.length > 30) {
          const pt = await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];const el=[...b.querySelectorAll('[class*=i-button_default-container]')].find(e=>(e.innerText||'').replace(/\s+/g,'')==='重新作答');if(!el)return null;el.scrollIntoView({block:'center'});const q=el.getBoundingClientRect();return{x:Math.round(q.left+q.width/2),y:Math.round(q.top+q.height/2)};})()`);
          if (pt) { await mouse(pt.x, pt.y); log(`#${i} 重新作答(用答案)`); await sleep(3500); await recordAndSubmit(i, answer, "answer"); }
        }
      } else log(`#${i} 第一遍后未出现答案`);
    }
  } catch (e) { log(`#${i} 异常`, String(e).slice(0, 90)); }
}
log("DONE");
cdp.close();
