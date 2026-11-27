import { ensureReader, READER, COURSE } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const route = process.argv[2] || "u1g22/u1g147/u1g158/u1g31";
const tid = await ensureReader(1);
const L = await connect(tid);
await L.cdp.send("Page.enable", {}, L.sessionId);
const target = `${READER}#/${COURSE}/courseware/${route}`;
await L.ev(`location.href=${JSON.stringify(target)}`).catch(()=>{});
await sleep(2500);
await L.cdp.send("Page.reload", {}, L.sessionId).catch(() => {});
let tb=null;
for(let k=0;k<25&&!tb;k++){await sleep(1000);tb=(await L.frames()).find(f=>f.url.includes("textbook/book")&&f.ctx);}
const raw=async e=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:tb.ctx},L.sessionId);return r.result?.value;};
for(let step=0;step<25;step++){await raw(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollTop+=420;return 1;})()`);await sleep(500);}
const lens=await raw(`[...document.querySelectorAll('div.editor-question-block.questionBlockNode')].map(b=>(b.innerText||'').length)`);
console.log("route",route,"LENS:",JSON.stringify(lens));
L.cdp.close();
