// _clickin.mjs <blockIdx> <buttonText> — 滚到块 → 实时取按钮 rect → 点 → 截图
import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
const IDX=Number(process.argv[2]), LABEL=process.argv[3]||"重新作答";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp,sessionId}=L;
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${IDX}];if(b)b.scrollIntoView({block:'center'});return 1;})()`,tb.ctx).catch(()=>{});
await sleep(1200);
const pos=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${IDX}];if(!b)return null;
 const e=[...b.querySelectorAll('[class*=i-button_default-container],button,div,span')].find(x=>(x.innerText||'').replace(/[ ]+/g,'')==='${LABEL}'&&x.getBoundingClientRect().width>10);
 if(!e)return null;const q=e.getBoundingClientRect();return{x:Math.round(q.left+q.width/2),y:Math.round(q.top+q.height/2),w:Math.round(q.width)};})()`,tb.ctx).catch(()=>null);
console.log("pos",JSON.stringify(pos));
if(!pos||pos.y<0||pos.y>3000){console.log("BAD POS — skip");cdp.close();process.exit(2);}
const mouse=async(x,y)=>{
 await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},sessionId).catch(()=>{});
 await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},sessionId);
 await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},sessionId);
};
await mouse(pos.x,pos.y);
console.log("clicked",pos.x,pos.y);
await sleep(2200);
const {data}=await cdp.send("Page.captureScreenshot",{format:"png"},sessionId);
fs.writeFileSync(process.argv[4]||"clickin.png",Buffer.from(data,"base64"));
const r=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${IDX}];return (b.innerText||'').replace(/[ ]+/g,' ').slice(0,200);})()`,tb.ctx).catch(e=>String(e));
console.log("after",r);
cdp.close();
