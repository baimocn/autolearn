import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs"; import path from "node:path";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp,sessionId}=L;
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
// 塞文件
const obj=await cdp.send("Runtime.evaluate",{expression:`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][24];return b&&b.querySelector('input[type=file]');})()`,contextId:tb.ctx},sessionId);
const oid=obj.result&&obj.result.objectId;
console.log('oid',oid?'ok':'none');
if(oid){
 try{await cdp.send("DOM.setFileInputFiles",{files:[path.resolve("u7-upload.pdf")],objectId:oid},sessionId);console.log('file set');}catch(e){console.log('file err',String(e).slice(0,120));}
}
await sleep(2000);
// 找块24里所有按钮（包括隐藏）
const r=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][24];
 const btns=[...b.querySelectorAll('button,[class*=i-button]')].map(e=>{const q=e.getBoundingClientRect();return{t:(e.innerText||'').replace(/[ ]+/g,'').slice(0,20),cls:(e.className||'').toString().slice(0,45),x:Math.round(q.left+q.width/2),y:Math.round(q.top+q.height/2),w:Math.round(q.width)};});
 return{text:(b.innerText||'').replace(/[ ]+/g,' ').slice(0,200),btns:btns.slice(0,12)};})()`,tb.ctx).catch(e=>String(e));
console.log(JSON.stringify(r,null,1).slice(0,2500));
cdp.close();
