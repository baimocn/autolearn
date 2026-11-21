// _oralall.mjs — 通用录音两遍作答：提交→等答案→重新作答→点重录文本→答案TTS→录满→等16s→提交
import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs"; import path from "node:path"; import { execSync } from "node:child_process";
const TMP = process.env.TEMP || "C:\\Windows\\Temp";
const WAIT = Number(process.env.REC_WAIT || 16);
const log = (...a) => console.log("[all]", ...a);
process.on("uncaughtException", e => log("uncaught:", String(e).slice(0, 100)));
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(rd.id); const { ev, frames, cdp, sessionId } = L;
const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId).catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
};
for (const f of await frames()) {
  if (!/pc\.html/.test(f.url)) continue;
  const p = await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>e.children.length<=1&&e.getBoundingClientRect().width>15&&/^(我知道了|再想想|去学习)$/.test(n(e.innerText)));if(!v.length)return null;const e=v[v.length-1];const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, f.ctx).catch(() => null);
  if (p) { await mouse(p.x, p.y); await sleep(1200); }
}
const tb = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx);
const raw = e => ev(e, tb.ctx);
const tts = (txt, out) => {
  const src = path.join(TMP, "all-oral.txt"); fs.writeFileSync(src, txt);
  const wav = out.replace(/\.mp3$/, ".wav");
  try {
    execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File sapi-tts.ps1 -TextFile "${src}" -OutWav "${wav}"`, { cwd: process.cwd(), stdio: "pipe", timeout: 240000 });
    execSync(`ffmpeg -y -v error -i "${wav}" -codec:a libmp3lame -q:a 5 "${out}"`, { stdio: "pipe", timeout: 60000 });
    return Number(execSync(`ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "${out}"`).toString().trim());
  } catch { return 0; }
};
const st = (i) => raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(!b)return null;const q=s=>(s||'').replace(/[ ]+/g,' ').trim();const t=q(b.innerText);const el=b.querySelector('[class*=record_record-recording]')||b.querySelector('[class*=record_record-prepare]');let pt=null;if(el){el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();if(r.width>10)pt={x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};}const btns=[...b.querySelectorAll('[class*=i-button_default-container]')].map(e=>{const r=e.getBoundingClientRect();return{t:q(e.innerText).slice(0,20),x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),w:Math.round(r.width)};}).filter(x=>x.w>10);return{len:t.length,labels:['点击开始','准备录音','开始录音','结束录音','点击结束','回放','重录','等待结果'].filter(l=>t.indexOf(l)>=0),pt,btns,text:t,score:(t.match(/得分[^0-9]*([0-9.]+)/)||[])[1]||null};})()`);
const clickBtn = async (i, label) => {
  // 先把块滚进视口，否则按钮坐标可能是负数（在视口外，点击无效）
  await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(b)b.scrollIntoView({block:'center'});return 1;})()`).catch(()=>{});
  await sleep(600);
  const s = await st(i);
  const b = s && s.btns.find(x => x.t === label);
  if (b && b.y > 0 && b.y < 2000) { await mouse(b.x, b.y); log(`#${i} click ${label}`); return true; }
  // 纯文本节点兜底
  const p = await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(!b)return null;const els=[...b.querySelectorAll('*')].filter(e=>e.children.length===0&&(e.innerText||'').replace(/[ ]+/g,'')==='${label}');if(!els.length)return null;const e=els[els.length-1];e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};})()`);
  if (p) { await mouse(p.x, p.y); log(`#${i} click ${label}(文本)`); return true; }
  return false;
};
const confirm = async (i) => {
  for (let k = 0; k < 12; k++) {
    let hit = false;
    for (const f of await frames()) {
      const rr = await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>e.children.length<=1&&(n(e.innerText)==='确定'||n(e.innerText)==='确认')&&e.getBoundingClientRect().width>18);if(!v.length)return 0;v[v.length-1].click();return 1;})()`, f.ctx).catch(() => 0);
      if (rr) { hit = true; break; }
    }
    if (hit) { log(`#${i} 确认`); return; }
    await sleep(700);
  }
};
const extractAnswer = (text) => {
  const k = text.lastIndexOf("答案"); if (k < 0) return "";
  let a = text.slice(k + 2).replace(/[ ]+/g, " ").replace(/\(\d+\)/g, " ").trim();
  const w = a.split(" "); if (w.length > 145) a = w.slice(0, 145).join(" ");
  if (a.length > 850) a = a.slice(0, 850);
  const d = a.lastIndexOf(". "); if (d > a.length * 0.5) a = a.slice(0, d + 1);
  return a.trim();
};
const record = async (i, TEXT) => {
  const mp3 = path.join(TMP, `all-${i}.mp3`);
  const dur = tts(TEXT, mp3);
  if (!dur || dur < 0.5) { log(`#${i} TTS失败`); return false; }
  log(`#${i} TTS ${dur.toFixed(1)}s 文本=${TEXT.slice(0, 45)}`);
  const b64 = fs.readFileSync(mp3).toString("base64");
  await raw(`window.__ttsB64='';1`);
  for (let p = 0; p < b64.length; p += 120000) await raw(`window.__ttsB64+=${JSON.stringify(b64.slice(p, p + 120000))};1`);
  await raw(`(()=>{const md=navigator.mediaDevices;if(!md)return'nomd';md.getUserMedia=async function(){const bin=atob(window.__ttsB64);const u=new Uint8Array(bin.length);for(let k=0;k<bin.length;k++)u[k]=bin.charCodeAt(k);const ctx=new(window.AudioContext||window.webkitAudioContext)();const buf=await ctx.decodeAudioData(u.buffer);const src=ctx.createBufferSource();src.buffer=buf;const dest=ctx.createMediaStreamDestination();src.connect(dest);src.start();return dest.stream;};return'patched';})()`);
  await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(b)b.scrollIntoView({block:'center'});return 1;})()`);
  let s = null;
  for (let k = 0; k < 30; k++) { await sleep(700); s = await st(i); if (s && (s.pt || s.labels.includes("点击开始"))) break; }
  if (s && s.labels.includes("点击开始") && s.pt) { await mouse(s.pt.x, s.pt.y); await sleep(3000); }
  s = await st(i);
  if (s && (s.labels.includes("准备录音") || s.labels.includes("开始录音")) && s.pt) { await mouse(s.pt.x, s.pt.y); log(`#${i} 开始录音`); }
  let t0 = 0, ok = false;
  for (let k = 0; k < 40; k++) { await sleep(500); const x = await st(i); if (x && (x.labels.includes("点击结束") || x.labels.includes("结束录音"))) { ok = true; t0 = Date.now(); break; } }
  if (!ok) { log(`#${i} 未进入录制态`); return false; }
  const remain = dur - (Date.now() - t0) / 1000 + 0.6; if (remain > 0) await sleep(remain * 1000);
  s = await st(i); if (s && s.pt) { await mouse(s.pt.x, s.pt.y); log(`#${i} 结束录音`); }
  log(`#${i} 等 ${WAIT}s`); await sleep(WAIT * 1000);
  if (await clickBtn(i, "提交")) await confirm(i);
  return true;
};
const doOne = async (i) => {
  let s = await st(i);
  log(`#${i} START labels=${JSON.stringify(s && s.labels)} score=${s && s.score}`);
  // A) 录完未提交（回放/重录）：等后提交，让答案出现
  if (s && s.labels.includes("回放") && s.labels.includes("重录")) {
    log(`#${i} 录完未提交，等 ${WAIT}s`);
    await sleep(WAIT * 1000);
    if (await clickBtn(i, "提交")) await confirm(i);
  }
  // A2) 完全未作答（点击开始/准备时长）：先录题面第一遍，让答案出现
  if (s && (s.labels.includes("点击开始") || s.labels.includes("准备录音"))) {
    const lines = s.text.split(/[\\n\\r]+/).map(x => x.trim()).filter(Boolean);
    const c = lines.filter(x => /[a-zA-Z]{3}/.test(x) && x.length > 24 && !/录音|麦克风|提交|得分|重新作答|准备时长|作答时长|答案|我的回放|AI 评分|计分/.test(x));
    c.sort((a, b) => b.length - a.length);
    const stem = c[0] || "Agriculture has always been the foundation of human civilization. Modern farming methods have greatly improved productivity, while traditional wisdom keeps the soil healthy for future generations.";
    log(`#${i} 未作答，第一遍用题面`);
    await record(i, stem);
    s = await st(i);
  }
  // B) 等答案
  let ans = "";
  for (let k = 0; k < 25; k++) { await sleep(2000); s = await st(i); if (s && s.text.indexOf("答案") >= 0) { ans = extractAnswer(s.text); break; } }
  // C) 若已有答案但分数<90：重新作答→重录→答案录音
  if (s && ans.length < 30) { log(`#${i} 无答案，跳过`); return; }
  const score = s && Number(s.score);
  if (score >= 90) { log(`#${i} 已 ${score} 分，跳过`); return; }
  log(`#${i} 答案${ans.length}字，旧分 ${score}`);
  if (!(await clickBtn(i, "重新作答"))) { log(`#${i} 无重新作答`); return; }
  await sleep(3500);
  s = await st(i);
  if (s && s.labels.includes("重录")) { if (!(await clickBtn(i, "重录"))) { log(`#${i} 无重录`); return; } }
  await sleep(3000);
  await record(i, ans);
  const fin = await st(i);
  log(`#${i} FINAL score=${fin && fin.score} ${JSON.stringify((fin && fin.text || "").slice(0, 110))}`);
};
// 找目标：录音控件 / 回放重录 / 我的回放(已提交低分)
const total = await raw(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`).catch(() => 0);
const targets = [];
for (let i = 0; i < total; i++) {
  const s = await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(!b)return null;const t=(b.innerText||'').replace(/[ ]+/g,' ');return {rec:b.querySelector('[class*=record_record-prepare],[class*=record_record-recording]')?1:0,states:['回放','重录','我的回放','AI 评分','准备时长','点击开始'].filter(x=>t.indexOf(x)>=0),score:(t.match(/得分[^0-9]*([0-9.]+)/)||[])[1]||null,text:t};})()`);
  if (!s) continue;
  if (s.rec || (s.states.includes("回放") && s.states.includes("重录")) || s.states.includes("我的回放")) targets.push({ i, ...s });
}
log("目标:", JSON.stringify(targets.map(t => ({ i: t.i, score: t.score, states: t.states }))));
for (const t of targets) { try { await doOne(t.i); } catch (e) { log(`#${t.i} 异常`, String(e).slice(0, 80)); } }
log("DONE");
cdp.close();
