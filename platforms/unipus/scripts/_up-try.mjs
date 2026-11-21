import { connect, sleep } from "./utlib.mjs";
import path from "node:path";
import fs from "node:fs";
import { execSync } from "node:child_process";
const TMP=process.env.TEMP||"C:\Windows\Temp";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const {ev,cdp,sessionId}=L;
let tb=(await L.frames()).find(f=>f.url.includes("textbook/book")&&f.ctx);
// 生成 pdf
const src=path.join(TMP,"upsrc-24.txt");
fs.writeFileSync(src,"Unit 5 Task 24\n\nMy Answer:\n\nAgriculture has always been the foundation of human civilization. This unit deepened my understanding of rural revitalization and sustainable farming.\n");
const pdf=path.join(TMP,"U5_Task24.pdf");
execSync(`node mkpdf.mjs "${pdf}" "U5 Task24" "${src}"`,{cwd:process.cwd(),stdio:"pipe"});
// 滚到块 + 拿拖拽区 rect（帧坐标）
for(let k=0;k<5;k++){
  await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][24];if(b)b.scrollIntoView({block:'center'});return 1;})()`,tb.ctx);
  await sleep(1200);
}
const rect=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][24];
 const d=b.querySelector('.ant-upload-drag');
 if(!d)return null;const r=d.getBoundingClientRect();
 return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),w:Math.round(r.width),h:Math.round(r.height)};})()`,tb.ctx);
console.log("drag rect:",JSON.stringify(rect));
// iframe offset
const off=await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));const r=f.getBoundingClientRect();return {ox:Math.round(r.left),oy:Math.round(r.top)};})()`);
console.log("offset:",JSON.stringify(off));
await cdp.send("Page.enable",{},sessionId).catch(()=>{});
await cdp.send("Page.setInterceptFileChooserDialog",{enabled:true},sessionId).catch(()=>{});
let got=null; cdp.on("Page.fileChooserOpened",(q)=>{got=q;});
// 真实鼠标点击拖拽区
const X=rect.x+(off.ox||0), Y=rect.y+(off.oy||0);
await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x:X,y:Y},sessionId).catch(()=>{});
await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x:X,y:Y,button:"left",buttons:1,clickCount:1},sessionId);
await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x:X,y:Y,button:"left",buttons:0,clickCount:1},sessionId);
for(let k=0;k<15&&!got;k++)await sleep(400);
console.log("chooser:",got?"OPEN":"NONE");
if(got){
  await cdp.send("DOM.setFileInputFiles",{files:[pdf],backendNodeId:got.backendNodeId},sessionId);
  console.log("files set");
  await sleep(4000);
  const st=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][24];
    return {items:b.querySelectorAll('.ant-upload-list-item').length, n:(()=>{const fi=b.querySelector('input[type=file]');return fi?fi.files.length:0;})(), txt:(b.innerText||'').replace(/\s+/g,' ').slice(0,120)};})()`,tb.ctx);
  console.log("attach state:",JSON.stringify(st));
}
await cdp.send("Page.setInterceptFileChooserDialog",{enabled:false},sessionId).catch(()=>{});
L.cdp.close();
