import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const ev=async(e,ctx)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:ctx},L.sessionId);return r.result?.value;};
const mouse=async(x,y)=>{await L.cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},L.sessionId).catch(()=>{});await L.cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},L.sessionId);await L.cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},L.sessionId);};
// 点 X 关结果弹窗 → 再点挑战卡开新一轮 → 挑战须知 → 开始挑战 → 读题
await mouse(912,163); // 结果弹窗 X (视觉)
await sleep(2000);
let tb=(await L.frames()).find(f=>f.url.includes("textbook/book")&&f.ctx);
const clicked=await ev(`(()=>{const cs=[...document.querySelectorAll('[data-lexical-node-type="quiz-paper-link"]')];
 for(const c of cs){const img=c.querySelector('img');let dec='';try{dec=decodeURIComponent(img?img.src:'');}catch(e){dec=img?img.src:'';}
  if(dec.includes('挑战')){c.scrollIntoView({block:'center'});(img||c).click();return 1;}}
 return 0;})()`,tb.ctx).catch(()=>0);
console.log("card:",clicked);
await sleep(4000);
// 挑战须知 → 开始挑战
for(const f of await L.frames()){
  const p=await ev(`(()=>{const n=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n(e.innerText)==='开始挑战'&&e.getBoundingClientRect().width>15);if(!v.length)return null;const b=v[v.length-1].getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`,f.ctx).catch(()=>null);
  if(p){await mouse(p.x,p.y);console.log("开始挑战 @",p.x,p.y);break;}
}
await sleep(6000);
const ex=(await L.frames()).find(f=>/\/exam\/|testing\/challenge/.test(f.url)&&f.ctx);
if(!ex){console.log("NO EXAM");process.exit(0);}
const qs=await ev(`(()=>{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];return items.map((q,i)=>({i,stem:(q.innerText||'').replace(/\s+/g,' ').slice(0,220)}));})()`,ex.ctx);
console.log(JSON.stringify(qs,null,1).slice(0,2800));
L.cdp.close();
