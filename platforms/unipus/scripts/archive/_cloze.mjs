import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp,sessionId}=L;
const ex=(await frames()).find(f=>/testing\/diagnosis/.test(f.url)&&f.ctx);
if(!ex){console.log('no exam');process.exit(1);}
const mouse=async(x,y)=>{await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},sessionId).catch(()=>{});await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},sessionId);await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},sessionId);};
// 找 i7 的空白元素
const r=await ev(`(()=>{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];const q=items[7];
 const cands=[...q.querySelectorAll('[class*=blank],[class*=Blank],input,[contenteditable]')].map(e=>({tag:e.tagName,cls:(e.className||'').toString().slice(0,55),t:(e.innerText||'').slice(0,20),w:Math.round(e.getBoundingClientRect().width),h:Math.round(e.getBoundingClientRect().height)}));
 const opts=[...q.querySelectorAll('[class*=questionViewOptionsItem]')].map(e=>{const b=e.getBoundingClientRect();return{t:e.innerText,x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};});
 return {cands:cands.slice(0,10),opts:opts.slice(0,6)};})()`,ex.ctx).catch(e=>String(e));
console.log(JSON.stringify(r,null,1).slice(0,2500));
cdp.close();
