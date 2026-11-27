import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
let tb=(await L.frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx&&f.url.includes(CH[1].slice(0,12)));
const { ev }=L;
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][23];if(b)b.scrollIntoView({block:'center'});return 1;})()`,tb.ctx);
await sleep(600);
// locate word spans by own text; inspect react props and className fully
const meta=await ev(`(()=>{
 const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][23];
 const out=[];
 [...b.querySelectorAll('span,div,li')].forEach(e=>{
   const own=[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim();
   if(own==='sericulture'||own==='silk reeling'){
     const rk=Object.keys(e).find(k=>k.startsWith('__reactProps'));
     out.push({own,tag:e.tagName,cls:(e.className||'').toString(),hasClick:rk?!!e[rk].onClick:false,rk});
   }
 });
 return out;})()`,tb.ctx);
console.log("WORD META:",JSON.stringify(meta,null,1));
L.cdp.close();
