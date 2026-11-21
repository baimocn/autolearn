import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp,sessionId}=L;
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
// 用真实滚动容器滚到底部区域
for(let k=0;k<20;k++){
  await ev(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollBy(0,Math.round(innerHeight*0.8));return 1;})()`,tb.ctx).catch(()=>{});
  await sleep(700);
  const st=await ev(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];const b=bs[24];return {y:Math.round(b.getBoundingClientRect().top),len:(b.innerText||'').length,file:b.querySelectorAll('input[type=file]').length};})()`,tb.ctx).catch(()=>({}));
  if(k%4===3)console.log('step',k+1,JSON.stringify(st));
  if(st&&st.len>0&&st.file>0){console.log('MOUNTED',JSON.stringify(st));break;}
}
const r=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][24];return {y:Math.round(b.getBoundingClientRect().top),len:(b.innerText||'').length,file:b.querySelectorAll('input[type=file]').length,text:(b.innerText||'').replace(/[ ]+/g,' ').slice(0,150)};})()`,tb.ctx).catch(e=>String(e));
console.log('FINAL',JSON.stringify(r));
const {data}=await cdp.send("Page.captureScreenshot",{format:"png"},sessionId);
fs.writeFileSync("mount24.png",Buffer.from(data,"base64"));
cdp.close();
