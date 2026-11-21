import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp,sessionId}=L;
const mouse=async(x,y)=>{await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},sessionId).catch(()=>{});await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},sessionId);await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},sessionId);};
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
const card=await ev(`(()=>{const cs=[...document.querySelectorAll('[data-lexical-node-type="quiz-paper-link"]')];
 for(const c of cs){const img=c.querySelector('img');const s=img?decodeURIComponent(img.src||''):'';if(/UT/i.test(s)&&!/挑战/.test(s)){c.scrollIntoView({block:'center'});const b=c.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),status:c.getAttribute('data-lexical-node-status')};}}
 return null;})()`,tb.ctx).catch(()=>null);
console.log('card',JSON.stringify(card));
if(!card){cdp.close();process.exit(2);}
const top=(await frames()).find(f=>/pc\.html/.test(f.url)&&f.ctx);
const off=await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));if(!f)return{ox:0,oy:0};const r=f.getBoundingClientRect();return{ox:Math.round(r.left),oy:Math.round(r.top)};})()`,top.ctx).catch(()=>({ox:0,oy:0}));
await mouse(card.x+off.ox,card.y+off.oy);
console.log('clicked card');
await sleep(5000);
// 考试帧出现即成功
let ex=null;
for(let k=0;k<12;k++){
 ex=(await frames()).find(f=>/testing\/diagnosis/.test(f.url)&&f.ctx);
 if(ex)break;
 await sleep(2000);
}
if(ex){
 const r=await ev(`(()=>{const t=document.body.innerText.replace(/[ ]+/g,' ');const m=t.match(/最终得分是\s*([\d.]+)/);
  const n=s=>(s||'').replace(/[ ]+/g,'');
  const btns=[...document.querySelectorAll('button,div,span,a')].filter(e=>e.children.length<=1&&e.getBoundingClientRect().width>15&&/^(答题解析|再次作答|开始答题)$/.test(n(e.innerText))).map(e=>n(e.innerText));
  return {score:m?m[1]:'',btns:[...new Set(btns)],len:t.length};})()`,ex.ctx).catch(e=>String(e));
 console.log('exam',JSON.stringify(r));
}
cdp.close();
