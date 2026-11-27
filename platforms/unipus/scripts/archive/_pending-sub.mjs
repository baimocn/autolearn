import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp,sessionId}=L;
const mouse=async(x,y)=>{await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},sessionId).catch(()=>{});await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},sessionId);await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},sessionId);};
for(const f of await frames()){if(!/pc\.html/.test(f.url))continue;const p=await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>e.children.length<=1&&e.getBoundingClientRect().width>15&&/^(我知道了|再想想|去学习)$/.test(n(e.innerText)));if(!v.length)return null;const e=v[v.length-1];const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`,f.ctx).catch(()=>null);if(p){await mouse(p.x,p.y);await sleep(1200);}}
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
const r=await ev(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];const out=[];
 bs.forEach((b,i)=>{const t=(b.innerText||'').replace(/[ ]+/g,' ');
  if(/回放|重录|点击开始|准备录音|等待结果/.test(t)&&t.length<600)out.push({i,len:t.length,states:['回放','重录','提交','点击开始','准备录音','等待结果'].filter(x=>t.indexOf(x)>=0),score:(t.match(/得分[^0-9]*([0-9.]+)/)||[])[1]||null,head:t.slice(0,70)});});
 return out;})()`,tb.ctx).catch(e=>String(e));
console.log(JSON.stringify(r,null,1).slice(0,3500));
cdp.close();
