import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp,sessionId}=L;
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
// 滚到块21
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][21];if(b)b.scrollIntoView({block:'center'});return 1;})()`,tb.ctx).catch(()=>{});
await sleep(1500);
const r=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][21];const t=(b.innerText||'').replace(/[ ]+/g,' ');
 const btns=[...b.querySelectorAll('[class*=i-button_default-container]')].map(e=>{const q=e.getBoundingClientRect();return{t:(e.innerText||'').replace(/[ ]+/g,'').slice(0,20),x:Math.round(q.left+q.width/2),y:Math.round(q.top+q.height/2),w:Math.round(q.width)};}).filter(x=>x.w>10);
 return{head:t.slice(0,400),tail:t.slice(-400),btns};})()`,tb.ctx).catch(e=>String(e));
console.log(JSON.stringify(r,null,1).slice(0,3000));
const {data}=await cdp.send("Page.captureScreenshot",{format:"png"},sessionId);
fs.writeFileSync("b21.png",Buffer.from(data,"base64"));
cdp.close();
