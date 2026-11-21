import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp,sessionId}=L;
const mouse=async(x,y)=>{await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},sessionId).catch(()=>{});await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},sessionId);await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},sessionId);};
for(const f of await frames()){if(!/pc\.html/.test(f.url))continue;const p=await ev(`(()=>{const n=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>e.children.length<=1&&e.getBoundingClientRect().width>15&&/^(我知道了|再想想|去学习)$/.test(n(e.innerText)));if(!v.length)return null;const e=v[v.length-1];const b=e.getBoundingClientRect();return{t:n(e.innerText),x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`,f.ctx).catch(()=>null);if(p){console.log("modal",JSON.stringify(p));await mouse(p.x,p.y);await sleep(1500);}}
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
const i=19;
const info=()=>ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(!b)return null;const t=(b.innerText||'').replace(/\s+/g,' ');const btns=[...b.querySelectorAll('[class*=i-button]')].map(e=>{const r=e.getBoundingClientRect();return{t:(e.innerText||'').replace(/\s+/g,'').slice(0,20),x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),w:Math.round(r.width)};});return{len:t.length,head:t.slice(0,90),tail:t.slice(-80),rec:b.querySelectorAll('[class*=record_]').length,btns};})()`,tb.ctx).catch(e=>String(e));
console.log("BEFORE",JSON.stringify(await info()));
const pt=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];const el=[...b.querySelectorAll('[class*=i-button_default-container]')].filter(e=>(e.innerText||'').replace(/\s+/g,'')==='重新作答');if(!el.length)return null;const e=el[el.length-1];e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),n:el.length};})()`,tb.ctx).catch(()=>null);
console.log("redo btn",JSON.stringify(pt));
if(pt){await mouse(pt.x,pt.y);await sleep(4000);}
console.log("AFTER",JSON.stringify(await info()));
cdp.close();
