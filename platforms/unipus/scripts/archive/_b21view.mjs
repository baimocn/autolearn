import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp,sessionId}=L;
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
// 用第一个空白的 scrollIntoView 定位
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][21];const e=b&&b.querySelector('[class*=digEmptyView_blankView]');if(e)e.scrollIntoView({block:'center'});return 1;})()`,tb.ctx).catch(()=>{});
await sleep(1500);
const r=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][21];const es=[...b.querySelectorAll('[class*=digEmptyView_blankView]')];return es.slice(0,3).map(e=>{const q=e.getBoundingClientRect();return{x:Math.round(q.left+q.width/2),y:Math.round(q.top+q.height/2),w:Math.round(q.width),h:Math.round(q.height)};});})()`,tb.ctx).catch(e=>String(e));
console.log("blanks",JSON.stringify(r));
const {data}=await cdp.send("Page.captureScreenshot",{format:"png"},sessionId);
fs.writeFileSync("b21view.png",Buffer.from(data,"base64"));
cdp.close();
