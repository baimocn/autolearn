import { CDP, sleep } from "./cdp.mjs";
import { connect } from "./utlib.mjs";
import { READER, COURSE } from "./reader.mjs";
const U=process.argv[2];
const FIRST={1:"u1g1",2:"u2g236",3:"u3g349",4:"u4g499",5:"u5g602",6:"u6g707",7:"u7g881",8:"u8g983"}[U]||("u"+U+"g2");
const log=(...a)=>console.log("[co]",...a);
process.on("uncaughtException",e=>log("uncaught:",String(e).slice(0,80)));
const ver=await(await fetch("http://127.0.0.1:9222/json/version")).json();
const boot=await CDP.connect(ver.webSocketDebuggerUrl);
for(const t of (await(await fetch("http://127.0.0.1:9222/json/list")).json()).filter(t=>/ucontent/.test(t.url)))await boot.send("Target.closeTarget",{targetId:t.id}).catch(()=>{});
await sleep(700);
const r=await boot.send("Target.createTarget",{url:`${READER}#/${COURSE}/courseware/u${U}/${FIRST}`});
boot.close();
await sleep(15000);
const L=await connect(r.targetId);
const {ev,frames,cdp,sessionId}=L;
const mouse=async(x,y)=>{await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},sessionId).catch(()=>{});await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},sessionId);await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},sessionId);};
let tb=null;
for(let k=0;k<40&&!tb;k++){tb=(await frames()).find(f=>f.url.includes("textbook/book")&&f.ctx);if(tb){const n=await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`,tb.ctx).catch(()=>0);if(n>0)break;}await sleep(1000);}
if(!tb){log("NO TB");process.exit(1);}
const dismiss=async()=>{for(const f of await frames()){const p=await ev(`(()=>{const n=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>/^(我知道了|知道了)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>20);if(!v.length)return null;const b=v[v.length-1].getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`,f.ctx).catch(()=>null);if(p){await mouse(p.x,p.y);await sleep(1000);}}};
await dismiss();
// 开抽屉（若关）
for(let i=0;i<3;i++){
  const opened=await ev(`(()=>{const e=document.querySelector('[class*=catalog_drawer-close]');if(!e)return 0;const b=e.getBoundingClientRect();return b.width>3?1:0;})()`,tb.ctx).catch(()=>0);
  if(opened)break;
  const op=await ev(`(()=>{const e=document.querySelector('[class*=catalog_area-open-menu]');if(!e)return null;const b=e.getBoundingClientRect();if(b.width<3)return null;return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`,tb.ctx).catch(()=>null);
  if(op)await mouse(op.x,op.y);else await mouse(22,183);
  await sleep(2200);
}
// JS 点挑战卡
const clicked=await ev(`(()=>{const cs=[...document.querySelectorAll('[data-lexical-node-type="quiz-paper-link"]')];
 for(const c of cs){const img=c.querySelector('img');let dec='';try{dec=decodeURIComponent(img?img.src:'');}catch(e){dec=img?img.src:'';}
  if(dec.includes('挑战')){c.scrollIntoView({block:'center'});(img||c).click();return 1;}}
 return 0;})()`,tb.ctx).catch(()=>0);
log("card:",clicked);
await sleep(4000);
await dismiss();
// 开始挑战
let started=false;
for(let a=0;a<4&&!started;a++){
  for(const f of await frames()){
    const r=await ev(`(()=>{const n=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(开始挑战|再次挑战)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return 0;v[v.length-1].click();return 1;})()`,f.ctx).catch(()=>0);
    if(r){started=true;break;}
  }
  if(!started){await dismiss();await sleep(2500);}
}
log("start:",started);
// 等考试帧+题目
let ex=null;
for(let k=0;k<30&&!ex;k++){
  await sleep(1000);
  ex=(await frames()).find(f=>/\/exam\/|testing\/challenge/.test(f.url)&&f.ctx);
}
if(!ex){log("NO EXAM");process.exit(2);}
await sleep(8000);
const qs=await ev(`(()=>{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];return items.map((q,i)=>({i,stem:(q.innerText||'').replace(/\s+/g,' ').slice(0,300)}));})()`,ex.ctx).catch(()=>[]);
console.log("QUESTIONS:",JSON.stringify(qs,null,1).slice(0,3500));
log("考试帧保持打开，等待作答脚本");
L.cdp.close();
