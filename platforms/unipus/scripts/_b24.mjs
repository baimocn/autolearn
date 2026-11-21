import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp,sessionId}=L;
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
// 滚到块24
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][24];if(b)b.scrollIntoView({block:'center'});return 1;})()`,tb.ctx).catch(()=>{});
await sleep(1500);
const r=await ev(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];const b=bs[24];
 const q=b.getBoundingClientRect();return {n:bs.length,blockRect:{x:Math.round(q.left),y:Math.round(q.top),w:Math.round(q.width),h:Math.round(q.height)},text:(b.innerText||'').replace(/[ ]+/g,' ').slice(0,200),file:b.querySelectorAll('input[type=file]').length,html:b.innerHTML.slice(0,300)};})()`,tb.ctx).catch(e=>String(e));
console.log(JSON.stringify(r).slice(0,1500));
const {data}=await cdp.send("Page.captureScreenshot",{format:"png"},sessionId);
fs.writeFileSync("b24view.png",Buffer.from(data,"base64"));
cdp.close();
