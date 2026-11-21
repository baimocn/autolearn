import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
let tb=(await L.frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx&&f.url.includes(CH[1].slice(0,12)));
const { ev }=L;
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][25];if(b)b.scrollIntoView({block:'center'});return 1;})()`,tb.ctx);
await sleep(1000);
const txt=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][25];return b?b.innerText:'NO';})()`,tb.ctx);
console.log("=== BLOCK 25 TEXT ===");
console.log(txt);
// any modal on the main page
const modal=await ev(`[...document.querySelectorAll('[class*=modal],[class*=Modal],[role=dialog]')].map(m=>m.innerText.slice(0,120)).slice(0,5)`);
console.log("=== MODALS (top page) ===", JSON.stringify(modal));
L.cdp.close();
