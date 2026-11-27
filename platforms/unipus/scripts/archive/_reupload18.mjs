import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs"; import path from "node:path";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp,sessionId}=L;
const mouse=async(x,y)=>{await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},sessionId).catch(()=>{});await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},sessionId);await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},sessionId);};
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
// 滚到块18
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][18];if(b)b.scrollIntoView({block:'center'});return 1;})()`,tb.ctx).catch(()=>{});
await sleep(1500);
// 点重新作答
const pt=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][18];const e=[...b.querySelectorAll('[class*=i-button_default-container]')].find(x=>(x.innerText||'').replace(/[ ]+/g,'')==='重新作答');if(!e)return null;e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};})()`,tb.ctx).catch(()=>null);
console.log('redo btn',JSON.stringify(pt));
if(pt){await mouse(pt.x,pt.y);await sleep(3500);}
// 等 file input
let oid=null;
for(let k=0;k<20;k++){
 const o=await cdp.send("Runtime.evaluate",{expression:`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][18];const e=b&&b.querySelector('input[type=file]');return e||null;})()`,contextId:tb.ctx},sessionId).catch(()=>null);
 oid=o&&o.result&&o.result.objectId;
 if(oid)break;
 await sleep(1000);
}
console.log('file input',oid?'found':'none');
if(oid){
 const abs=path.resolve("u7-answer-full.pdf");
 await cdp.send("DOM.setFileInputFiles",{files:[abs],objectId:oid},sessionId).catch(e=>console.log('set err',String(e).slice(0,100)));
 await sleep(2500);
 const t=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][18];return (b.innerText||'').replace(/[ ]+/g,' ').slice(0,180);})()`,tb.ctx).catch(()=>"");
 console.log('after upload:',t);
}
cdp.close();
