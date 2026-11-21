// _steporal2.mjs — 修版：识别“点击结束”，等足音频时长再结束；支持重做低分题
import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
const TMP = process.env.TEMP || "C:\Windows\Temp";
const log = (...a) => console.log("[st2]", ...a);
process.on("uncaughtException", e => log("uncaught:", String(e).slice(0, 100)));
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(rd.id);
const { ev, frames, cdp, sessionId } = L;
const mouse = async (x,y) => {
  await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},sessionId).catch(()=>{});
  await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},sessionId);
  await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},sessionId);
};
for (const f of await frames()) {
  if (!/pc\.html/.test(f.url)) continue;
  const p = await ev(`(()=>{const n=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>e.children.length<=1&&e.getBoundingClientRect().width>15&&/^(再想想|去学习|我知道了|知道了)$/.test(n(e.innerText)));if(!v.length)return null;const e=v[v.length-1];const b=e.getBoundingClientRect();return{t:n(e.innerText),x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, f.ctx).catch(()=>null);
  if (p) { log("top modal:", JSON.stringify(p)); await mouse(p.x,p.y); await sleep(1200); }
}
const tb = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx);
const raw = e => ev(e, tb.ctx);
const total = await raw(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`).catch(()=>0);
const idxs = [];
for (let i=0;i<total;i++){
  const s = await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(!b)return null;const t=(b.innerText||'').replace(/\s+/g,' ');const m=t.match(/得分[:：]?\s*(\d+(\.\d+)?)/);return {rec:b.querySelector('[class*=record_record-prepare],[class*=record_record-recording]')?1:0,redo:/重新作答/.test(t),score:m?Number(m[1]):null};})()`);
  if (s && s.rec) idxs.push({i,...s});
}
log("录音块:", JSON.stringify(idxs));
const tts = (txt,out) => {
  const src=path.join(TMP,"st2-oral.txt");fs.writeFileSync(src,txt);const wav=out.replace(/\.mp3$/,".wav");
  try{execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File sapi-tts.ps1 -TextFile "${src}" -OutWav "${wav}"`,{cwd:process.cwd(),stdio:"pipe",timeout:120000});
   execSync(`ffmpeg -y -v error -i "${wav}" -codec:a libmp3lame -q:a 5 "${out}"`,{stdio:"pipe",timeout:60000});
   return Number(execSync(`ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "${out}"`).toString().trim());}catch{return 0;}
};
for (const {i,redo,score} of idxs) {
  // 已完成且分数>90 跳过；低分重做
  if (redo && score !== null && score > 90) { log(`#${i} 已 ${score} 分，跳过`); continue; }
  try {
    if (redo) {
      const r = await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];const el=[...b.querySelectorAll('[class*=i-button_default-container]')].find(e=>(e.innerText||'').replace(/\s+/g,'')==='重新作答');if(!el)return 0;el.scrollIntoView({block:'center'});const q=el.getBoundingClientRect();window.__redoPt={x:Math.round(q.left+q.width/2),y:Math.round(q.top+q.height/2)};return 1;})()`);
      if(r){const pt=await raw(`window.__redoPt`);await mouse(pt.x,pt.y);log(`#${i} 重新作答 (旧分 ${score})`);await sleep(3000);}
      else { log(`#${i} 找不到重新作答`); continue; }
    }
    const prompt = await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];const lines=(b.innerText||'').split('\n').map(s=>s.trim()).filter(Boolean);const c=lines.filter(s=>/[a-zA-Z]{3}/.test(s)&&s.length>24&&!/录音|麦克风|提交|得分|重新作答|准备时长|作答时长|答案|我的回放/.test(s));c.sort((a,b2)=>b2.length-a.length);return c[0]||'';})()`);
    const TEXT = (prompt&&String(prompt).length>=10)?String(prompt):"Agriculture has always been the foundation of human civilization. Modern farming methods have greatly improved productivity, while traditional wisdom keeps the soil healthy for future generations.";
    const mp3=path.join(TMP,`st2-${i}.mp3`);const dur=tts(TEXT,mp3);
    if(!dur||dur<0.5){log(`#${i} TTS失败`);continue;}
    log(`#${i} TTS ${dur.toFixed(1)}s`);
    const b64=fs.readFileSync(mp3).toString("base64");
    await raw(`window.__ttsB64='';1`);
    for(let p=0;p<b64.length;p+=120000)await raw(`window.__ttsB64+=${JSON.stringify(b64.slice(p,p+120000))};1`);
    await raw(`(()=>{if(window.__gumPatched)return 'already';window.__gumPatched=1;const md=navigator.mediaDevices;if(!md)return 'nomd';md.getUserMedia=async function(){const bin=atob(window.__ttsB64);const u=new Uint8Array(bin.length);for(let k=0;k<bin.length;k++)u[k]=bin.charCodeAt(k);const ctx=new (window.AudioContext||window.webkitAudioContext)();const buf=await ctx.decodeAudioData(u.buffer);const src=ctx.createBufferSource();src.buffer=buf;const dest=ctx.createMediaStreamDestination();src.connect(dest);src.start();return dest.stream;};return 'patched';})()`);
    await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(b)b.scrollIntoView({block:'center'});return 1;})()`);
    await sleep(1000);
    const st = () => raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(!b)return null;const q=s=>(s||'').replace(/\s+/g,' ').trim();const t=q(b.innerText);const el=b.querySelector('[class*=record_record-recording]')||b.querySelector('[class*=record_record-prepare]');let pt=null;if(el){el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();if(r.width>10)pt={x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};}const subs=[...b.querySelectorAll('[class*=i-button_default-container]')].map(e=>{const r=e.getBoundingClientRect();return{t:q(e.innerText).slice(0,20),x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),w:Math.round(r.width)};}).filter(x=>x.w>10);return{tail:t.slice(-80),labels:['点击开始','准备录音','开始录音','结束录音','点击结束','回放','重录'].filter(l=>t.includes(l)),pt,subs};})()`);
    // 点开始
    let s=await st();
    if(s&&s.labels.includes("点击开始")&&s.pt){await mouse(s.pt.x,s.pt.y);log(`#${i} 点击开始`);await sleep(2500);}
    s=await st();
    if(s&&(s.labels.includes("准备录音")||s.labels.includes("开始录音"))&&s.pt){await mouse(s.pt.x,s.pt.y);log(`#${i} 开始录音`);}
    // 等“点击结束”/“结束录音”出现（最长 20s）
    let t0=Date.now(),recOk=false;
    for(let k=0;k<40;k++){await sleep(500);const x=await st();if(x&&(x.labels.includes("点击结束")||x.labels.includes("结束录音"))){recOk=true;t0=Date.now();log(`#${i} ● 录制中`);break;}}
    if(recOk){
      const remain=dur-(Date.now()-t0)/1000+0.6;
      if(remain>0)await sleep(remain*1000);
      const x=await st();
      if(x&&x.pt){await mouse(x.pt.x,x.pt.y);log(`#${i} ■ 结束录音 (${dur.toFixed(1)}s)`);}
      await sleep(2500);
    } else log(`#${i} 未进入录制态，跳过提交`);
    if(!recOk) continue;
    for(let k=0;k<20;k++){const x=await st();const sub=x&&x.subs.find(v=>/提交/.test(v.t));if(sub){await mouse(sub.x,sub.y);log(`#${i} 提交`);break;}await sleep(600);}
    for(let k=0;k<12;k++){let hit=false;for(const f of await frames()){const rr=await ev(`(()=>{const n=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>e.children.length<=1&&(n(e.innerText)==='确定'||n(e.innerText)==='确认')&&e.getBoundingClientRect().width>18);if(!v.length)return 0;v[v.length-1].click();return 1;})()`,f.ctx).catch(()=>0);if(rr){hit=true;break;}}if(hit){log(`#${i} 确认`);break;}await sleep(600);}
    const fin=await st();log(`#${i} final:`,JSON.stringify(fin&&fin.tail));
  } catch(e){log(`#${i} 异常`,String(e).slice(0,90));}
}
log("DONE");
cdp.close();
