import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp,sessionId}=L;
const mouse=async(x,y)=>{await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},sessionId).catch(()=>{});await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},sessionId);await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},sessionId);};
const tbf=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
// 关抽屉弹窗
for(const f of await frames()){if(!/pc\.html/.test(f.url))continue;await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');for(const b of document.querySelectorAll('button,div,span,a')){if(/^(我知道了|知道了)$/.test(n(b.innerText)))b.click();}return 1;})()`,f.ctx).catch(()=>{});}
await ev(`(()=>{const c=document.querySelector('[class*=catalog_drawer-close]');if(c)c.click();return 1;})()`,tbf.ctx).catch(()=>{});
await sleep(1200);
// 找 UT 卡并点
const card=await ev(`(()=>{const cs=[...document.querySelectorAll('[data-lexical-node-type="quiz-paper-link"]')];
 for(const c of cs){const img=c.querySelector('img');const s=img?decodeURIComponent(img.src||''):'';if(/UT/i.test(s)&&!/挑战/.test(s)){c.scrollIntoView({block:'center'});const b=c.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),status:c.getAttribute('data-lexical-node-status')};}}
 return null;})()`,tbf.ctx).catch(()=>null);
console.log('card',JSON.stringify(card));
if(!card){cdp.close();process.exit(2);}
const offA=await (async()=>{const top=(await frames()).find(f=>/pc\.html/.test(f.url)&&f.ctx);return ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));if(!f)return{ox:0,oy:0};const r=f.getBoundingClientRect();return{ox:Math.round(r.left),oy:Math.round(r.top)};})()`,top.ctx).catch(()=>({ox:0,oy:0}));})();
await mouse(card.x+offA.ox,card.y+offA.oy);
await sleep(3500);
// 开始答题/再次作答
for(let k=0;k<8;k++){
 let hit=false;
 for(const f of await frames()){
  if(!f.ctx)continue;
  const p=await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(开始答题|再次作答)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>20);if(!v.length)return null;const e=v[v.length-1];const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),t:n(e.innerText)};})()`,f.ctx).catch(()=>null);
  if(p){await mouse(p.x,p.y+(/pc\.html/.test(f.url)?0:offA.oy));console.log('clicked',p.t);hit=true;break;}
 }
 if(hit)break;
 await sleep(2000);
}
await sleep(6000);
// 找考试帧
let ex=null,n=0;
for(let k=0;k<20;k++){
 for(const f of await frames()){
  if(!/testing\/diagnosis/.test(f.url)||!f.ctx)continue;
  n=await ev(`document.querySelectorAll('[class*=answer-question-box_questionItem]').length`,f.ctx).catch(()=>0);
  if(n>=20){ex=f;break;}
 }
 if(ex)break;
 await sleep(2000);
}
console.log('exam',ex?'ok':'none','questions',n);
if(!ex){cdp.close();process.exit(3);}
// 逐题诊断+作答
const detail=await ev(`(()=>{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];return items.map((q,i)=>{
 const rows=q.querySelectorAll('[class*=chioceView_strongListView]').length;
 const tf=q.querySelectorAll('[class*=answer_optionTF]').length;
 const inp=q.querySelectorAll('input,textarea').length;
 const blank=q.querySelectorAll('[class*=blankView],[class*=digEmpty]').length;
 const drag=q.querySelectorAll('[class*=drag],[class*=match]').length;
 const t=(q.innerText||'').replace(/[ ]+/g,' ').slice(0,50);
 return {i,rows,tf,inp,blank,drag,head:t};});})()`,ex.ctx).catch(e=>String(e));
console.log('DETAIL',JSON.stringify(detail).slice(0,4000));
cdp.close();
