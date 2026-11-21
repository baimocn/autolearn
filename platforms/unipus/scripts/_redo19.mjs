import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs"; import path from "node:path"; import { execSync } from "node:child_process";
const TMP=process.env.TEMP||"C:\Windows\Temp";
const log=(...a)=>console.log("[r19]",...a);
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp,sessionId}=L;
const mouse=async(x,y)=>{await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},sessionId).catch(()=>{});await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},sessionId);await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},sessionId);};
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
const raw=e=>ev(e,tb.ctx);
const i=19;
const state=()=>raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(!b)return null;const q=s=>(s||'').replace(/[ ]+/g,' ').trim();const t=q(b.innerText);const el=b.querySelector('[class*=record_record-recording]')||b.querySelector('[class*=record_record-prepare]');let pt=null;if(el){el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();if(r.width>10)pt={x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};}const btns=[...b.querySelectorAll('[class*=i-button_default-container]')].map(e=>{const r=e.getBoundingClientRect();return{t:q(e.innerText).slice(0,20),x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),w:Math.round(r.width)};}).filter(x=>x.w>10);return{len:t.length,labels:['点击开始','准备录音','开始录音','结束录音','点击结束','回放','重录','等待结果'].filter(l=>t.indexOf(l)>=0),pt,btns,text:t};})()`);
let s=await state();log("BEFORE",JSON.stringify({len:s.len,labels:s.labels,btns:s.btns}));
// 提取答案
let ans="";const k=s.text.lastIndexOf("答案");if(k>=0){ans=s.text.slice(k+2).replace(/[ ]+/g," ").replace(/\(\d+\)/g," ").trim();const w=ans.split(" ");if(w.length>100)ans=w.slice(0,100).join(" ");if(ans.length>600)ans=ans.slice(0,600);const d=ans.lastIndexOf(". ");if(d>ans.length*0.5)ans=ans.slice(0,d+1);}
log("ANS",ans.length,ans.slice(0,80));
// 点重新作答
// 重新作答后回到 回放/重录 态，要点「重录」才重进录音态
let rb=s.btns.find(x=>x.t==='重新作答');
if(rb){await mouse(rb.x,rb.y);log('clicked 重新作答');await sleep(3500);s=await state();}
rb=(s&&s.btns.find(x=>/重录/.test(x.t)))||null;
if(!rb){log("no redo button");process.exit(1);}
await mouse(rb.x,rb.y);log("clicked",rb.t);
await sleep(4000);
s=await state();log("AFTER-REDO",JSON.stringify({len:s.len,labels:s.labels,btns:s.btns,pt:s.pt}));
// TTS
const src=path.join(TMP,"r19.txt");fs.writeFileSync(src,ans);
const wav=path.join(TMP,"r19.wav"),mp3=path.join(TMP,"r19.mp3");
try{execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File sapi-tts.ps1 -TextFile "${src}" -OutWav "${wav}"`,{cwd:process.cwd(),stdio:"pipe",timeout:180000});execSync(`ffmpeg -y -v error -i "${wav}" -codec:a libmp3lame -q:a 5 "${mp3}"`,{stdio:"pipe",timeout:60000});}catch(e){log("tts err",String(e).slice(0,80));}
const dur=Number(execSync(`ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "${mp3}"`).toString().trim());
log("dur",dur);
const b64=fs.readFileSync(mp3).toString("base64");await raw(`window.__ttsB64='';1`);for(let p=0;p<b64.length;p+=120000)await raw(`window.__ttsB64+=${JSON.stringify(b64.slice(p,p+120000))};1`);
await raw(`(()=>{const md=navigator.mediaDevices;if(!md)return'nomd';md.getUserMedia=async function(){const bin=atob(window.__ttsB64);const u=new Uint8Array(bin.length);for(let k=0;k<bin.length;k++)u[k]=bin.charCodeAt(k);const ctx=new(window.AudioContext||window.webkitAudioContext)();const buf=await ctx.decodeAudioData(u.buffer);const src=ctx.createBufferSource();src.buffer=buf;const dest=ctx.createMediaStreamDestination();src.connect(dest);src.start();return dest.stream;};return'patched';})()`);
// 等控件
for(let k=0;k<30;k++){await sleep(700);s=await state();if(s&&(s.pt||s.labels.includes("点击开始"))){log("control ready",JSON.stringify(s.labels));break;}}
if(s&&s.labels.includes("点击开始")&&s.pt){await mouse(s.pt.x,s.pt.y);log("点击开始");await sleep(3000);}
s=await state();
if(s&&(s.labels.includes("准备录音")||s.labels.includes("开始录音"))&&s.pt){await mouse(s.pt.x,s.pt.y);log("开始录音");}
let t0=0,ok=false;
for(let k=0;k<40;k++){await sleep(500);const x=await state();if(x&&(x.labels.includes("点击结束")||x.labels.includes("结束录音"))){ok=true;t0=Date.now();log("录制中");break;}}
if(!ok){log("未进入录制态");log("STATE",JSON.stringify(await state()).slice(0,500));cdp.close();process.exit(2);}
const remain=dur-(Date.now()-t0)/1000+0.6;if(remain>0)await sleep(remain*1000);
s=await state();if(s&&s.pt){await mouse(s.pt.x,s.pt.y);log("结束录音");}
log("等16s");await sleep(16000);
// 提交
for(let k=0;k<20;k++){s=await state();const sub=s&&s.btns.find(v=>/提交/.test(v.t));if(sub){await mouse(sub.x,sub.y);log("提交");break;}await sleep(600);}
for(let k=0;k<12;k++){let hit=false;for(const f of await frames()){const rr=await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>e.children.length<=1&&(n(e.innerText)==='确定'||n(e.innerText)==='确认')&&e.getBoundingClientRect().width>18);if(!v.length)return 0;v[v.length-1].click();return 1;})()`,f.ctx).catch(()=>0);if(rr){hit=true;break;}}if(hit){log("确认");break;}await sleep(600);}
await sleep(10000);
const fin=await state();log("FINAL",JSON.stringify({len:fin&&fin.len,text:(fin&&fin.text||"").slice(0,300)}));
cdp.close();
