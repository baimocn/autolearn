import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
const IDX=Number(process.argv[2]||18);
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp,sessionId}=L;
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${IDX}];if(b)b.scrollIntoView({block:'center'});return 1;})()`,tb.ctx).catch(()=>{});
await sleep(1800);
const {data}=await cdp.send("Page.captureScreenshot",{format:"png"},sessionId);
fs.writeFileSync(process.argv[3]||"scrollto.png",Buffer.from(data,"base64"));
console.log("saved",process.argv[3]||"scrollto.png");
// 同时输出按钮真实坐标
const r=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${IDX}];if(!b)return null;return [...b.querySelectorAll('[class*=i-button]')].map(e=>{const q=e.getBoundingClientRect();return{t:(e.innerText||'').replace(/[ ]+/g,'').slice(0,20),x:Math.round(q.left+q.width/2),y:Math.round(q.top+q.height/2),w:Math.round(q.width)};}).filter(x=>x.w>10);})()`,tb.ctx).catch(e=>String(e));
console.log("buttons",JSON.stringify(r));
cdp.close();
