import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
let tb=(await L.frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
console.log("current chapter url:", await L.ev("location.href",tb.ctx).catch(()=>''));
const { ev }=L;
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][23];if(b)b.scrollIntoView({block:'center'});return 1;})()`,tb.ctx);
await sleep(400);
const labels=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][23];
 return [...b.querySelectorAll('span')].map(e=>[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim()).filter(t=>/sericulture|reeling|rice|agrarian|sustenance|drought/i.test(t));
})()`,tb.ctx);
console.log("BANK LABELS:",JSON.stringify(labels,null,1));
// current filled values
const vals=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][23];return [...b.querySelectorAll('input[type=text]')].map(e=>e.value);})()`,tb.ctx);
console.log("CURRENT VALS:",JSON.stringify(vals));
L.cdp.close();
