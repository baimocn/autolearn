import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
let tb=(await L.frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx&&f.url.includes(CH[1].slice(0,12)));
const { ev, frames }=L;
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][23];if(b)b.scrollIntoView({block:'center'});return 1;})()`,tb.ctx);
await sleep(600);
// dump any confirm dialog text in every frame and top
for(const f of await frames()){
 const d=await ev(`[...document.querySelectorAll('[class*=modal],[class*=dialog],[class*=confirm],[role=dialog]')].map(m=>(m.innerText||'').replace(/\s+/g,' ').slice(0,160)).filter(Boolean)`,f.ctx).catch(()=>[]);
 if(d.length) console.log("DIALOG in frame:",JSON.stringify(d));
}
const topd=await ev(`[...document.querySelectorAll('[class*=modal],[role=dialog]')].map(m=>(m.innerText||'').replace(/\s+/g,' ').slice(0,160)).filter(Boolean)`);
console.log("TOP DIALOG:",JSON.stringify(topd));
const head=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][23];return b.innerText.slice(0,300);})()`,tb.ctx);
console.log("BLOCK HEAD:",JSON.stringify(head));
L.cdp.close();
