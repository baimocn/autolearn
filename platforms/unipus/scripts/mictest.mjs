// mictest.mjs <audio> — 自检：伪造麦克风流里到底有没有声音（量 RMS）
import { connect, sleep } from "./utlib.mjs";
import { CDP } from "./cdp.mjs";
import fs from "node:fs";
const AUD=process.argv[2];
const b64=fs.readFileSync(AUD).toString("base64");
const ver=await (await fetch("http://127.0.0.1:9222/json/version")).json();
const READER="https://ucontent.unipus.cn/_ipublishpc_default/pc.html?cid=1837944375799767040&theme=3264FA&aitutorialId=34657&cloudCurriculaId=356008&strategyId=4793137&schoolId=9341&source=cloud&sourceCallBackUrl=https://uai.unipus.cn/app/cmgt/resource-detail/?backId=1793504265186&courseResourceId=20001221469";
let tid=(await (await fetch("http://127.0.0.1:9222/json/list")).json()).find(t=>t.type==='page'&&/ucontent/.test(t.url))?.id;
if(!tid){
  const boot=await CDP.connect(ver.webSocketDebuggerUrl);
  const r=await boot.send("Target.createTarget",{url:READER+"#/course-v3:819008cfa01e0f2+xnkdxyy+20250801090513/courseware/u1/u1g2"});
  tid=r.targetId; boot.close(); await sleep(9000);
}
const L=await connect(tid);
const {ev,frames}=L;
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
if(!tb){ console.log("no tb"); process.exit(1); }
await ev(`window.__ttsB64='';1`,tb.ctx);
for(let p=0;p<b64.length;p+=120000){ await ev(`window.__ttsB64+=${JSON.stringify(b64.slice(p,p+120000))};1`,tb.ctx); }

// 方案A：现在的实现（在 getUserMedia 里才 new AudioContext + decode）
const A=await ev(`(async()=>{
  const bin=atob(window.__ttsB64); const u=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
  const ctx=new (window.AudioContext||window.webkitAudioContext)();
  const state0=ctx.state;
  const buf=await ctx.decodeAudioData(u.buffer);
  const src=ctx.createBufferSource(); src.buffer=buf;
  const dest=ctx.createMediaStreamDestination(); src.connect(dest); src.start();
  // 量振幅
  const an=ctx.createAnalyser(); an.fftSize=2048;
  const ms=ctx.createMediaStreamSource(dest.stream); ms.connect(an);
  const arr=new Float32Array(an.fftSize);
  let peak=0;
  for(let k=0;k<12;k++){ await new Promise(r=>setTimeout(r,100)); an.getFloatTimeDomainData(arr);
    for(let i=0;i<arr.length;i++) peak=Math.max(peak,Math.abs(arr[i])); }
  return {state0, stateNow:ctx.state, peak:Number(peak.toFixed(6)), dur:Number(buf.duration.toFixed(1))};
})()`,tb.ctx).catch(e=>"ERR "+e.message);
console.log("方案A(现实现):",JSON.stringify(A));

// 方案B：预建 ctx 并 resume
const B=await ev(`(async()=>{
  const bin=atob(window.__ttsB64); const u=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
  const ctx=new (window.AudioContext||window.webkitAudioContext)();
  try{ await ctx.resume(); }catch(e){}
  const buf=await ctx.decodeAudioData(u.buffer);
  const src=ctx.createBufferSource(); src.buffer=buf;
  const dest=ctx.createMediaStreamDestination();
  const g=ctx.createGain(); g.gain.value=1;
  src.connect(g); g.connect(dest); src.start();
  const an=ctx.createAnalyser(); an.fftSize=2048;
  const ms=ctx.createMediaStreamSource(dest.stream); ms.connect(an);
  const arr=new Float32Array(an.fftSize);
  let peak=0;
  for(let k=0;k<12;k++){ await new Promise(r=>setTimeout(r,100)); an.getFloatTimeDomainData(arr);
    for(let i=0;i<arr.length;i++) peak=Math.max(peak,Math.abs(arr[i])); }
  return {state:ctx.state, peak:Number(peak.toFixed(6))};
})()`,tb.ctx).catch(e=>"ERR "+e.message);
console.log("方案B(resume后):",JSON.stringify(B));
L.cdp.close();
