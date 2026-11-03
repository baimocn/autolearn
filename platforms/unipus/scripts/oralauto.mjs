// oralauto.mjs <unit> <blockIdx> <audioFile> [recordSec]
import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
const U=Number(process.argv[2]); const I=Number(process.argv[3]); const AUD=process.argv[4];
const REC=Number(process.argv[5]||52);
const CH={1:"7840f299-1cce-403e-9320-d6ddf613cebf",2:"2c3ad11f-a37e-4a64-ba6a-6cfa256cc6be",3:"5f975081-b8b7-4799-9d9c-b83a53423e4f",4:"6c59c2ec-f8bd-46f8-8506-6a8b25ff9e7b",5:"bfb4fa0c-fbd4-436f-8b37-3b307810cf63",6:"1ed78c87-3e9c-4426-a2fb-4a155955a7bb",7:"bc8967a2-13b9-4a3f-a127-e368e228e9e5",8:"f8dc1090-7968-4eb7-b231-63da59732244"}[U];
const TID=process.env.TID||"594407D5EFAB3168E687104616F51088";
const log=(...a)=>console.log(...a);
const b64=fs.readFileSync(AUD).toString("base64");
const L=await connect(TID);
const {ev,frames,cdp,sessionId,mouse}=L;
await cdp.send("Page.bringToFront",{},sessionId).catch(()=>{});
let tb=null;
for(let k=0;k<15;k++){ tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx&&f.url.includes(CH.slice(0,12))); if(tb) break; await sleep(800); }
if(!tb){ log("!! 章节不对"); process.exit(1); }
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${I}];if(b)b.scrollIntoView({block:'center'});return 1;})()`,tb.ctx);
await sleep(1000);
// 注入
await ev(`window.__ttsB64='';1`,tb.ctx);
for(let p=0;p<b64.length;p+=120000){ await ev(`window.__ttsB64+=${JSON.stringify(b64.slice(p,p+120000))};1`,tb.ctx); }
const inj=await ev(`(()=>{ if(window.__gumPatched) return 'already'; window.__gumPatched=1;
  const md=navigator.mediaDevices; if(!md) return 'no md';
  md.getUserMedia=async function(){ const bin=atob(window.__ttsB64); const u=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
    const ctx=new (window.AudioContext||window.webkitAudioContext)();
    const buf=await ctx.decodeAudioData(u.buffer);
    const src=ctx.createBufferSource(); src.buffer=buf;
    const dest=ctx.createMediaStreamDestination(); src.connect(dest); src.start();
    window.__ttsCtx=ctx; return dest.stream; };
  return 'patched';})()`,tb.ctx);
log("inject:",inj);
// 点麦克风
const pm=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${I}];
  const el=b.querySelector('[class*=record_record-prepare]'); if(!el)return null; const r=el.getBoundingClientRect();
  return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};})()`,tb.ctx);
log("mic:",JSON.stringify(pm));
if(!pm){ log("!! 无麦克风按钮"); process.exit(1); }
await mouse(pm.x,pm.y);
await sleep(2500);
log("开始后:",await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${I}];return (b.innerText||'').replace(/\\s+/g,' ').slice(0,120);})()`,tb.ctx));
// 录制
log(`录制 ${REC}s ...`);
await sleep(REC*1000);
const ps=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${I}];
  const el=b.querySelector('[class*=record_record-recording]'); if(!el)return null; const r=el.getBoundingClientRect();
  return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};})()`,tb.ctx);
log("stop:",JSON.stringify(ps));
if(!ps){ log("!! 无结束按钮"); process.exit(1); }
await mouse(ps.x,ps.y);
await sleep(3000);
// 等待结果
for(let t=0;t<20;t++){
  const s=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${I}];return (b.innerText||'').replace(/\\s+/g,' ').slice(0,200);})()`,tb.ctx);
  log(`  +${t*5}s | ${s}`);
  if(/得分|分$|重新作答/.test(s)) break;
  await sleep(5000);
}
// 提交
const pb=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${I}];
  const el=[...b.querySelectorAll('[class*=i-button_default-container]')].find(e=>/提交/.test(e.innerText||''));
  if(!el)return null; const r=el.getBoundingClientRect();
  return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),cls:String(el.className).slice(0,80)};})()`,tb.ctx);
log("submit:",JSON.stringify(pb));
if(pb) await mouse(pb.x,pb.y);
await sleep(4000);
for(const f of await frames()){
  const m=await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>e.children.length<=1&&(n(e.innerText)==='确定'||n(e.innerText)==='确认')&&e.getBoundingClientRect().width>18);if(!v.length)return 0;v[v.length-1].click();return 1;})()`,f.ctx).catch(()=>0);
  if(m){ log("确认 clicked"); break; }
}
await sleep(5000);
log("final:",await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${I}];return (b.innerText||'').replace(/\\s+/g,' ').slice(0,240);})()`,tb.ctx));
L.cdp.close();
