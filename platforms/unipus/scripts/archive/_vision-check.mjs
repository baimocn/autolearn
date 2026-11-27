import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
if(!rd){console.log("NO READER — 请确认书籍页面还开着");process.exit(0);}
const L=await connect(rd.id);
const ev=async(e,ctx)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:ctx},L.sessionId);return r.result?.value;};
const tb=(await L.frames()).find(f=>f.url.includes("textbook/book")&&f.ctx);
console.log("chapter:",tb?tb.url.slice(73,115):"none");
const n=await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`,tb.ctx).catch(()=>0);
const lens=await ev(`[...document.querySelectorAll('div.editor-question-block.questionBlockNode')].map(b=>(b.innerText||'').length)`,tb.ctx).catch(()=>[]);
console.log("blocks:",n,"rendered:",(lens||[]).filter(x=>x>80).length);
console.log("LENS:",JSON.stringify(lens));
const cards=await ev(`document.querySelectorAll('[data-lexical-node-type="quiz-paper-link"]').length`,tb.ctx).catch(()=>0);
console.log("cards:",cards);
const {data}=await L.cdp.send("Page.captureScreenshot",{format:"png"},L.sessionId);
const fs=await import("node:fs");
fs.writeFileSync("vision-u1.png",Buffer.from(data,"base64"));
console.log("vision saved");
L.cdp.close();
